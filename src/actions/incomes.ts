"use server";

import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireAuth } from "@/lib/auth/getCouple";
import { isChildAccount, responsibleTagForChildUser } from "@/lib/auth/member";
import { assertResponsibleBelongsToCouple } from "@/lib/data/children";
import { parseDateBR } from "@/lib/dates";
import { parseMoneyToCents } from "@/lib/money";
import { createRecurringIncomeTemplate } from "@/lib/services/recurringIncomeSync";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const incomeForm = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  amount: z.string().min(1),
  receivedDate: z.string().min(1),
  cardId: z.string().optional(),
  responsible: z.string().min(1),
  incomeType: z.enum(["single", "recurring", "installment"]),
  installments: z.coerce.number().int().min(1).max(60).optional(),
});

async function validateCard(coupleId: string, cardId?: string) {
  if (!cardId) return null;
  const [c] = await db
    .select()
    .from(schema.cards)
    .where(
      and(
        eq(schema.cards.id, cardId),
        eq(schema.cards.coupleId, coupleId),
        eq(schema.cards.isActive, true)
      )
    );
  return c ? null : "Cartão inválido ou inativo";
}

export async function createIncomeAction(formData: FormData) {
  const s = await requireAuth();
  const r = incomeForm.safeParse({
    title: formData.get("title"),
    description: formData.get("description") ?? undefined,
    amount: String(formData.get("amount") ?? ""),
    receivedDate: String(formData.get("receivedDate") ?? ""),
    cardId: (formData.get("cardId") as string) || undefined,
    responsible: formData.get("responsible"),
    incomeType: formData.get("incomeType") ?? "single",
    installments: formData.get("installments") || 1,
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
  const received = parseDateBR(d.receivedDate);
  if (!received) return { error: "Data inválida (use DD/MM/AAAA)" };
  const amountCents = parseMoneyToCents(d.amount);
  if (amountCents <= 0) return { error: "Informe o valor" };

  const cardErr = await validateCard(s.user.coupleId, d.cardId);
  if (cardErr) return { error: cardErr };

  const inst =
    d.incomeType === "installment" && d.installments && d.installments > 1
      ? d.installments
      : 1;
  const group = inst > 1 ? crypto.randomUUID() : null;

  let recurringTemplateId: string | null = null;
  if (!childTag && d.incomeType === "recurring" && inst === 1) {
    recurringTemplateId = await createRecurringIncomeTemplate({
      coupleId: s.user.coupleId,
      userId: s.user.id,
      title: d.title,
      description: d.description ?? null,
      amountCents,
      receivedDate: received,
      cardId: d.cardId ?? null,
      responsible,
    });
  }

  const [y0, m0, day0] = received.split("-").map(Number);
  for (let i = 0; i < inst; i++) {
    const next = new Date(y0, m0 - 1 + i, day0);
    const y = next.getFullYear();
    const m = String(next.getMonth() + 1).padStart(2, "0");
    const day = String(next.getDate()).padStart(2, "0");
    const nextDate = `${y}-${m}-${day}`;
    const per = Math.ceil(amountCents / inst);
    const rowAmt = i === inst - 1 ? amountCents - per * (inst - 1) : per;
    const isRecurring = d.incomeType === "recurring" && inst === 1;

    await db.insert(schema.incomes).values({
      coupleId: s.user.coupleId,
      title: inst > 1 ? `${d.title} (${i + 1}/${inst})` : d.title,
      description: d.description ?? null,
      amountCents: rowAmt,
      receivedDate: nextDate,
      cardId: d.cardId ?? null,
      responsible,
      incomeType: inst > 1 ? "installment" : d.incomeType,
      recurrence: isRecurring ? "monthly" : "none",
      recurringTemplateId: i === 0 ? recurringTemplateId : null,
      installmentIndex: inst > 1 ? i + 1 : null,
      installmentTotal: inst > 1 ? inst : null,
      installmentGroupId: group,
      createdByUserId: s.user.id,
      updatedByUserId: s.user.id,
    });
  }

  if (recurringTemplateId) revalidatePath("/entradas");

  revalidatePath("/entradas");
  revalidatePath("/");
  return { ok: true as const };
}

export async function updateIncomeAction(id: string, formData: FormData) {
  const s = await requireAuth();
  const [prev] = await db
    .select()
    .from(schema.incomes)
    .where(
      and(eq(schema.incomes.id, id), eq(schema.incomes.coupleId, s.user.coupleId))
    );
  if (!prev) return { error: "Entrada não encontrada" };
  if (prev.installmentGroupId || prev.recurringTemplateId) {
    return { error: "Entradas parceladas ou geradas por modelo recorrente devem ser editadas individualmente com cuidado. Exclua e recadastre se necessário." };
  }
  const childTag = responsibleTagForChildUser(s.user);
  if (isChildAccount(s.user)) {
    if (!childTag || prev.responsible !== childTag) {
      return { error: "Sem permissão" };
    }
  }
  const r = incomeForm.safeParse({
    title: formData.get("title"),
    description: formData.get("description") ?? undefined,
    amount: String(formData.get("amount") ?? ""),
    receivedDate: String(formData.get("receivedDate") ?? ""),
    cardId: (formData.get("cardId") as string) || undefined,
    responsible: formData.get("responsible"),
    incomeType: "single",
    installments: 1,
  });
  if (!r.success) return { error: "Dados inválidos" };
  const d = r.data;
  const responsible = childTag ?? d.responsible;
  if (!childTag && !(await assertResponsibleBelongsToCouple(s.user.coupleId, d.responsible))) {
    return { error: "Responsável inválido" };
  }
  const received = parseDateBR(d.receivedDate);
  if (!received) return { error: "Data inválida" };
  const amountCents = parseMoneyToCents(d.amount);
  if (amountCents <= 0) return { error: "Informe o valor" };

  const cardErr = await validateCard(s.user.coupleId, d.cardId);
  if (cardErr) return { error: cardErr };

  await db
    .update(schema.incomes)
    .set({
      title: d.title,
      description: d.description ?? null,
      amountCents,
      receivedDate: received,
      cardId: d.cardId ?? null,
      responsible,
      updatedByUserId: s.user.id,
    })
    .where(eq(schema.incomes.id, id));
  revalidatePath("/entradas");
  revalidatePath("/");
  return { ok: true as const };
}

export async function deleteIncomeAction(id: string) {
  const s = await requireAuth();
  const [prev] = await db
    .select()
    .from(schema.incomes)
    .where(
      and(eq(schema.incomes.id, id), eq(schema.incomes.coupleId, s.user.coupleId))
    );
  if (!prev) return { ok: false as const };
  const childTag = responsibleTagForChildUser(s.user);
  if (isChildAccount(s.user)) {
    if (!childTag || prev.responsible !== childTag) return { ok: false as const };
  }
  await db
    .delete(schema.incomes)
    .where(
      and(eq(schema.incomes.id, id), eq(schema.incomes.coupleId, s.user.coupleId))
    );
  revalidatePath("/entradas");
  revalidatePath("/");
  return { ok: true as const };
}
