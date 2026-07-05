"use server";

import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireAuth } from "@/lib/auth/getCouple";
import { isChildAccount, responsibleTagForChildUser } from "@/lib/auth/member";
import { assertResponsibleBelongsToCouple } from "@/lib/data/children";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { parseMoneyToCents } from "@/lib/money";
import { validateExpenseCardSelection } from "@/lib/expenseCardGuard";
import {
  currentYearMonth,
  syncRecurringForCouple,
} from "@/lib/services/recurringSync";

const rSchema = z.object({
  name: z.string().min(1),
  amount: z.string().min(1),
  categoryId: z.string().min(1),
  dayOfMonth: z.coerce.number().int().min(1).max(31),
  paymentMethod: z.string().min(1),
  cardId: z.string().optional(),
  responsible: z.string().min(1),
});

export async function createRecurringAction(formData: FormData) {
  const s = await requireAuth();
  const r = rSchema.safeParse({
    name: formData.get("name"),
    amount: String(formData.get("amount")),
    categoryId: formData.get("categoryId"),
    dayOfMonth: formData.get("dayOfMonth"),
    paymentMethod: formData.get("paymentMethod"),
    cardId: (formData.get("cardId") as string) || undefined,
    responsible: formData.get("responsible"),
  });
  if (!r.success) redirect("/gastos-fixos/novo?err=1");
  const d = r.data;
  const childTag = responsibleTagForChildUser(s.user);
  let responsible = d.responsible;
  if (childTag) {
    responsible = childTag;
  } else if (!(await assertResponsibleBelongsToCouple(s.user.coupleId, d.responsible))) {
    redirect("/gastos-fixos/novo?err=1");
  }
  const amountCents = parseMoneyToCents(d.amount);
  if (amountCents <= 0) redirect("/gastos-fixos/novo?err=2");
  const cardErr = await validateExpenseCardSelection(
    s.user.coupleId,
    d.paymentMethod,
    d.cardId
  );
  if (cardErr) redirect("/gastos-fixos/novo?err=3");
  await db.insert(schema.recurringExpenses).values({
    coupleId: s.user.coupleId,
    name: d.name,
    amountCents,
    categoryId: d.categoryId,
    dayOfMonth: d.dayOfMonth,
    paymentMethod: d.paymentMethod,
    cardId: d.cardId ?? null,
    responsible,
    isActive: true,
    createdByUserId: s.user.id,
  });
  revalidatePath("/gastos-fixos");
  redirect("/gastos-fixos");
}

export async function deleteRecurringAction(id: string) {
  const s = await requireAuth();
  const [rec] = await db
    .select()
    .from(schema.recurringExpenses)
    .where(
      and(
        eq(schema.recurringExpenses.id, id),
        eq(schema.recurringExpenses.coupleId, s.user.coupleId)
      )
    );
  if (!rec) return { ok: false as const };
  const childTag = responsibleTagForChildUser(s.user);
  if (isChildAccount(s.user)) {
    if (!childTag || rec.responsible !== childTag) return { ok: false as const };
  }
  await db
    .delete(schema.recurringExpenses)
    .where(
      and(
        eq(schema.recurringExpenses.id, id),
        eq(schema.recurringExpenses.coupleId, s.user.coupleId)
      )
    );
  revalidatePath("/gastos-fixos");
  return { ok: true };
}

/** Action wrapper para uso direto via <form action={…}> com input hidden `id`. */
export async function deleteRecurringFormAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await deleteRecurringAction(id);
  redirect("/gastos-fixos");
}

export async function updateRecurringAction(id: string, formData: FormData) {
  const s = await requireAuth();
  const r = rSchema.safeParse({
    name: formData.get("name"),
    amount: String(formData.get("amount")),
    categoryId: formData.get("categoryId"),
    dayOfMonth: formData.get("dayOfMonth"),
    paymentMethod: formData.get("paymentMethod"),
    cardId: (formData.get("cardId") as string) || undefined,
    responsible: formData.get("responsible"),
  });
  if (!r.success) return { error: "Dados inválidos" };
  const d = r.data;
  const childTag = responsibleTagForChildUser(s.user);
  const responsible = childTag ?? d.responsible;
  if (!childTag && !(await assertResponsibleBelongsToCouple(s.user.coupleId, d.responsible))) {
    return { error: "Responsável inválido" };
  }
  const amountCents = parseMoneyToCents(d.amount);
  if (amountCents <= 0) return { error: "Valor inválido" };
  const cardErrU = await validateExpenseCardSelection(
    s.user.coupleId,
    d.paymentMethod,
    d.cardId
  );
  if (cardErrU) return { error: cardErrU };
  const [rec] = await db
    .select()
    .from(schema.recurringExpenses)
    .where(
      and(
        eq(schema.recurringExpenses.id, id),
        eq(schema.recurringExpenses.coupleId, s.user.coupleId)
      )
    );
  if (!rec) return { error: "Gasto fixo não encontrado" };
  if (isChildAccount(s.user)) {
    if (!childTag || rec.responsible !== childTag) {
      return { error: "Sem permissão" };
    }
  }
  await db
    .update(schema.recurringExpenses)
    .set({
      name: d.name,
      amountCents,
      categoryId: d.categoryId,
      dayOfMonth: d.dayOfMonth,
      paymentMethod: d.paymentMethod,
      cardId: d.cardId ?? null,
      responsible,
    })
    .where(eq(schema.recurringExpenses.id, id));
  revalidatePath("/gastos-fixos");
  return { ok: true };
}

export async function generateRecurringForMonthFormAction(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _formData: FormData
) {
  await generateRecurringForMonthAction();
}

export async function generateRecurringForMonthAction(yearMonth?: string) {
  const s = await requireAuth();
  if (isChildAccount(s.user)) return;
  await syncRecurringForCouple(s.user.coupleId, yearMonth ?? currentYearMonth());
  revalidatePath("/gastos-fixos");
  revalidatePath("/despesas");
  revalidatePath("/");
}
