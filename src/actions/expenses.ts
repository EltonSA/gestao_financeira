"use server";

import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireAuth } from "@/lib/auth/getCouple";
import { isChildAccount, responsibleTagForChildUser } from "@/lib/auth/member";
import { assertResponsibleBelongsToCouple } from "@/lib/data/children";
import { getCardUsedCents } from "@/lib/services/cardLimit";
import { validateExpenseCardSelection } from "@/lib/expenseCardGuard";
import { createRecurringTemplateFromExpense } from "@/lib/services/recurringSync";
import { parseDateBR, firstInstallmentDueDate, parseDayOfMonthInput } from "@/lib/dates";
import { parseMoneyToCents } from "@/lib/money";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const expenseForm = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  categoryId: z.string().min(1),
  amount: z.string().min(1),
  dueDate: z.string().optional(),
  paidAt: z.string().optional(),
  paymentMethod: z.string().min(1),
  cardId: z.string().optional(),
  responsible: z.string().min(1),
  expenseType: z.enum(["fixed", "variable", "installment", "goal"]),
  status: z.enum(["pending", "paid", "overdue", "cancelled"]),
  recurrence: z.enum(["none", "weekly", "monthly", "yearly"]),
  installments: z.coerce.number().int().min(1).max(60).optional(),
  dueDayOfMonth: z.coerce.number().int().min(1).max(31).optional(),
});

function normalizePaidAt(
  status: string,
  paid: string | undefined
): string | null {
  if (status === "paid" && paid) {
    return parseDateBR(paid) ?? null;
  }
  if (status === "paid" && !paid) {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
  }
  return null;
}

export async function createExpenseAction(formData: FormData) {
  const s = await requireAuth();
  const r = expenseForm.safeParse({
    title: formData.get("title"),
    description: formData.get("description") ?? undefined,
    categoryId: formData.get("categoryId"),
    amount: String(formData.get("amount") ?? ""),
    dueDate: String(formData.get("dueDate") ?? ""),
    paidAt: formData.get("paidAt") || undefined,
    paymentMethod: formData.get("paymentMethod"),
    cardId: (formData.get("cardId") as string) || undefined,
    responsible: formData.get("responsible"),
    expenseType: formData.get("expenseType"),
    status: formData.get("status"),
    recurrence: formData.get("recurrence") ?? "none",
    installments: formData.get("installments") || 1,
    dueDayOfMonth: formData.get("dueDayOfMonth") || undefined,
  });
  if (!r.success) return { error: "Dados inválidos" };
  const d = r.data;
  const childTag = responsibleTagForChildUser(s.user);
  let responsible = d.responsible;
  if (childTag) {
    responsible = childTag;
  } else if (!(await assertResponsibleBelongsToCouple(s.user.coupleId, d.responsible))) {
    return { error: "Responsável inválido" };
  }

  const inst =
    d.expenseType === "installment"
      ? Math.max(2, d.installments && d.installments > 1 ? d.installments : 2)
      : 1;

  let due: string | null;
  if (d.expenseType === "installment" || d.recurrence === "monthly") {
    const day =
      d.dueDayOfMonth ??
      parseDayOfMonthInput(String(formData.get("dueDayOfMonth") ?? "")) ??
      parseDayOfMonthInput(d.dueDate);
    if (!day) {
      return {
        error: d.expenseType === "installment"
          ? "Selecione o vencimento das parcelas (Todo dia 01, 02, 03…)"
          : "Selecione o vencimento mensal (Todo dia 01, 02, 03…)",
      };
    }
    due = firstInstallmentDueDate(day);
  } else {
    due = parseDateBR(d.dueDate ?? "");
    if (!due) return { error: "Data de vencimento inválida (use DD/MM/AAAA)" };
  }

  const amountCents = parseMoneyToCents(d.amount);
  if (amountCents <= 0) return { error: "Informe o valor" };

  const cardErr = await validateExpenseCardSelection(
    s.user.coupleId,
    d.paymentMethod,
    d.cardId
  );
  if (cardErr) return { error: cardErr };

  if (d.paymentMethod === "credit" && d.cardId) {
    const [c] = await db
      .select()
      .from(schema.cards)
      .where(
        and(
          eq(schema.cards.id, d.cardId),
          eq(schema.cards.coupleId, s.user.coupleId)
        )
      );
    if (!c) return { error: "Cartão inválido" };
    const per = Math.ceil(amountCents / inst);
    const used = await getCardUsedCents(s.user.coupleId, d.cardId);
    if (c.limitTotalCents < used + per) {
      return { error: "Lançamento ultrapassa o limite disponível do cartão" };
    }
  }

  const paidAt = normalizePaidAt(d.status, d.paidAt);
  const group = inst > 1 ? crypto.randomUUID() : null;

  let recurringTemplateId: string | null = null;
  if (
    !childTag &&
    d.recurrence === "monthly" &&
    d.expenseType === "fixed" &&
    inst === 1
  ) {
    recurringTemplateId = await createRecurringTemplateFromExpense({
      coupleId: s.user.coupleId,
      userId: s.user.id,
      title: d.title,
      amountCents,
      categoryId: d.categoryId,
      dueDate: due,
      paymentMethod: d.paymentMethod,
      cardId: d.cardId ?? null,
      responsible,
    });
  }

  const [y0, m0, day0] = due.split("-").map(Number);
  for (let i = 0; i < inst; i++) {
    const eid = crypto.randomUUID();
    const next = new Date(y0, m0 - 1 + i, day0);
    const y = next.getFullYear();
    const m = String(next.getMonth() + 1).padStart(2, "0");
    const day = String(next.getDate()).padStart(2, "0");
    const nextDue = `${y}-${m}-${day}`;
    const per = Math.ceil(amountCents / inst);
    const rowAmt = i === inst - 1 ? amountCents - per * (inst - 1) : per;
    const st = i === 0 ? d.status : "pending";
    const pAt = i === 0 ? paidAt : null;
    await db.insert(schema.expenses).values({
      id: eid,
      coupleId: s.user.coupleId,
      title: inst > 1 ? `${d.title} (${i + 1}/${inst})` : d.title,
      description: d.description ?? null,
      categoryId: d.categoryId,
      amountCents: rowAmt,
      dueDate: nextDue,
      paidAt: pAt,
      paymentMethod: d.paymentMethod,
      cardId: d.cardId ?? null,
      responsible,
      expenseType: d.expenseType,
      status: st,
      recurrence: d.recurrence,
      recurringTemplateId: i === 0 ? recurringTemplateId : null,
      createdByUserId: s.user.id,
      updatedByUserId: s.user.id,
      installmentIndex: inst > 1 ? i + 1 : null,
      installmentTotal: inst > 1 ? inst : null,
      installmentGroupId: group,
    });
  }

  if (recurringTemplateId) revalidatePath("/gastos-fixos");

  revalidatePath("/despesas");
  revalidatePath("/");
  revalidatePath("/cartoes");
  return { ok: true as const };
}

export async function updateExpenseAction(id: string, formData: FormData) {
  const s = await requireAuth();
  const [prev] = await db
    .select()
    .from(schema.expenses)
    .where(
      and(
        eq(schema.expenses.id, id),
        eq(schema.expenses.coupleId, s.user.coupleId)
      )
    );
  if (!prev) return { error: "Despesa não encontrada" };
  const childTag = responsibleTagForChildUser(s.user);
  if (isChildAccount(s.user)) {
    if (!childTag || prev.responsible !== childTag) {
      return { error: "Sem permissão" };
    }
  }
  const r = expenseForm.safeParse({
    title: formData.get("title"),
    description: formData.get("description") ?? undefined,
    categoryId: formData.get("categoryId"),
    amount: String(formData.get("amount") ?? ""),
    dueDate: String(formData.get("dueDate") ?? ""),
    paidAt: formData.get("paidAt") || undefined,
    paymentMethod: formData.get("paymentMethod"),
    cardId: (formData.get("cardId") as string) || undefined,
    responsible: formData.get("responsible"),
    expenseType: formData.get("expenseType"),
    status: formData.get("status"),
    recurrence: formData.get("recurrence") ?? "none",
    installments: 1,
  });
  if (!r.success) return { error: "Dados inválidos" };
  const d = r.data;
  const responsible = childTag ?? d.responsible;
  if (!childTag && !(await assertResponsibleBelongsToCouple(s.user.coupleId, d.responsible))) {
    return { error: "Responsável inválido" };
  }
  const due = parseDateBR(d.dueDate ?? "");
  if (!due) return { error: "Data de vencimento inválida" };
  const amountCents = parseMoneyToCents(d.amount);
  const cardErrU = await validateExpenseCardSelection(
    s.user.coupleId,
    d.paymentMethod,
    d.cardId
  );
  if (cardErrU) return { error: cardErrU };

  if (d.paymentMethod === "credit" && d.cardId) {
    const [c] = await db
      .select()
      .from(schema.cards)
      .where(
        and(
          eq(schema.cards.id, d.cardId),
          eq(schema.cards.coupleId, s.user.coupleId)
        )
      );
    if (!c) return { error: "Cartão inválido" };
    const used = await getCardUsedCents(s.user.coupleId, d.cardId);
    const prevOnThis =
      prev.cardId === d.cardId &&
      prev.status !== "cancelled" &&
      prev.paymentMethod === "credit"
        ? prev.amountCents
        : 0;
    const newCount =
      d.status !== "cancelled" && d.paymentMethod === "credit" ? amountCents : 0;
    const newTotal = used - prevOnThis + newCount;
    if (c.limitTotalCents < newTotal) {
      return { error: "Lançamento ultrapassa o limite do cartão" };
    }
  }
  const paidAt = normalizePaidAt(d.status, d.paidAt);
  await db
    .update(schema.expenses)
    .set({
      title: d.title,
      description: d.description ?? null,
      categoryId: d.categoryId,
      amountCents,
      dueDate: due,
      paidAt,
      paymentMethod: d.paymentMethod,
      cardId: d.cardId ?? null,
      responsible,
      expenseType: d.expenseType,
      status: d.status,
      recurrence: d.recurrence,
      updatedByUserId: s.user.id,
    })
    .where(eq(schema.expenses.id, id));
  revalidatePath("/despesas");
  revalidatePath("/");
  revalidatePath("/cartoes");
  redirect("/despesas");
}

export async function deleteExpenseAction(id: string) {
  const s = await requireAuth();
  const [prev] = await db
    .select()
    .from(schema.expenses)
    .where(
      and(
        eq(schema.expenses.id, id),
        eq(schema.expenses.coupleId, s.user.coupleId)
      )
    );
  if (!prev) return { ok: false as const };
  const childTag = responsibleTagForChildUser(s.user);
  if (isChildAccount(s.user)) {
    if (!childTag || prev.responsible !== childTag) {
      return { ok: false as const };
    }
  }
  await db
    .delete(schema.expenses)
    .where(
      and(
        eq(schema.expenses.id, id),
        eq(schema.expenses.coupleId, s.user.coupleId)
      )
    );
  revalidatePath("/despesas");
  revalidatePath("/");
  revalidatePath("/cartoes");
  return { ok: true };
}

export async function markPaidExpenseAction(
  _prev: { error?: string; ok?: boolean },
  formData: FormData
): Promise<{ error?: string; ok?: boolean }> {
  const s = await requireAuth();
  const id = String(formData.get("id") ?? "");
  const paymentMethod = String(formData.get("paymentMethod") ?? "");
  const cardId = (formData.get("cardId") as string) || undefined;
  const paidAtRaw = String(formData.get("paidAt") ?? "").trim();

  if (!id) return { error: "Despesa inválida" };
  if (!paymentMethod) return { error: "Selecione a forma de pagamento" };

  const [e] = await db
    .select()
    .from(schema.expenses)
    .where(
      and(
        eq(schema.expenses.id, id),
        eq(schema.expenses.coupleId, s.user.coupleId)
      )
    );
  if (!e) return { error: "Despesa não encontrada" };
  if (e.status === "paid" || e.status === "cancelled") {
    return { error: "Esta despesa já está quitada ou cancelada" };
  }

  const childTag = responsibleTagForChildUser(s.user);
  if (isChildAccount(s.user)) {
    if (!childTag || e.responsible !== childTag) {
      return { error: "Sem permissão" };
    }
  }

  const cardErr = await validateExpenseCardSelection(
    s.user.coupleId,
    paymentMethod,
    cardId
  );
  if (cardErr) return { error: cardErr };

  let paidAt: string;
  if (paidAtRaw) {
    const parsed = parseDateBR(paidAtRaw);
    if (!parsed) return { error: "Data de pagamento inválida (use DD/MM/AAAA)" };
    paidAt = parsed;
  } else {
    const t = new Date();
    paidAt = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
  }

  if (paymentMethod === "credit" && cardId) {
    const [c] = await db
      .select()
      .from(schema.cards)
      .where(
        and(
          eq(schema.cards.id, cardId),
          eq(schema.cards.coupleId, s.user.coupleId)
        )
      );
    if (!c) return { error: "Cartão inválido" };
  }

  await db
    .update(schema.expenses)
    .set({
      status: "paid",
      paidAt,
      paymentMethod,
      cardId: cardId ?? null,
      updatedByUserId: s.user.id,
    })
    .where(eq(schema.expenses.id, id));

  revalidatePath("/despesas");
  revalidatePath("/");
  revalidatePath("/cartoes");
  return { ok: true };
}

/** @deprecated Use markPaidExpenseAction via MarkPaidDialog */
export async function markPaidFormAction(formData: FormData) {
  await markPaidExpenseAction({}, formData);
}

/** @deprecated Use markPaidExpenseAction via MarkPaidDialog */
export async function markPaidAction(id: string) {
  const fd = new FormData();
  fd.set("id", id);
  fd.set("paymentMethod", "pix");
  await markPaidExpenseAction({}, fd);
}
