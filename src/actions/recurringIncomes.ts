"use server";

import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireAuth } from "@/lib/auth/getCouple";
import { isChildAccount, responsibleTagForChildUser } from "@/lib/auth/member";
import { assertResponsibleBelongsToCouple } from "@/lib/data/children";
import { parseMoneyToCents } from "@/lib/money";
import { currentYearMonth } from "@/lib/services/recurringSync";
import { syncRecurringIncomesForCouple } from "@/lib/services/recurringIncomeSync";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const rSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  amount: z.string().min(1),
  dayOfMonth: z.coerce.number().int().min(1).max(31),
  cardId: z.string().optional(),
  responsible: z.string().min(1),
});

export async function createRecurringIncomeAction(formData: FormData) {
  const s = await requireAuth();
  const r = rSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") ?? undefined,
    amount: String(formData.get("amount")),
    dayOfMonth: formData.get("dayOfMonth"),
    cardId: (formData.get("cardId") as string) || undefined,
    responsible: formData.get("responsible"),
  });
  if (!r.success) redirect("/entradas/recorrentes/novo?err=1");
  const d = r.data;
  const childTag = responsibleTagForChildUser(s.user);
  let responsible = d.responsible;
  if (childTag) {
    responsible = childTag;
  } else if (!(await assertResponsibleBelongsToCouple(s.user.coupleId, d.responsible))) {
    redirect("/entradas/recorrentes/novo?err=1");
  }
  const amountCents = parseMoneyToCents(d.amount);
  if (amountCents <= 0) redirect("/entradas/recorrentes/novo?err=2");

  if (d.cardId) {
    const [c] = await db
      .select()
      .from(schema.cards)
      .where(
        and(
          eq(schema.cards.id, d.cardId),
          eq(schema.cards.coupleId, s.user.coupleId),
          eq(schema.cards.isActive, true)
        )
      );
    if (!c) redirect("/entradas/recorrentes/novo?err=3");
  }

  await db.insert(schema.recurringIncomes).values({
    coupleId: s.user.coupleId,
    title: d.title,
    description: d.description ?? null,
    amountCents,
    dayOfMonth: d.dayOfMonth,
    cardId: d.cardId ?? null,
    responsible,
    isActive: true,
    createdByUserId: s.user.id,
  });
  revalidatePath("/entradas");
  redirect("/entradas");
}

export async function updateRecurringIncomeAction(id: string, formData: FormData) {
  const s = await requireAuth();
  const r = rSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") ?? undefined,
    amount: String(formData.get("amount")),
    dayOfMonth: formData.get("dayOfMonth"),
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

  const [rec] = await db
    .select()
    .from(schema.recurringIncomes)
    .where(
      and(
        eq(schema.recurringIncomes.id, id),
        eq(schema.recurringIncomes.coupleId, s.user.coupleId)
      )
    );
  if (!rec) return { error: "Modelo não encontrado" };
  if (isChildAccount(s.user)) {
    if (!childTag || rec.responsible !== childTag) return { error: "Sem permissão" };
  }

  await db
    .update(schema.recurringIncomes)
    .set({
      title: d.title,
      description: d.description ?? null,
      amountCents,
      dayOfMonth: d.dayOfMonth,
      cardId: d.cardId ?? null,
      responsible,
    })
    .where(eq(schema.recurringIncomes.id, id));
  revalidatePath("/entradas");
  return { ok: true };
}

export async function deleteRecurringIncomeAction(id: string) {
  const s = await requireAuth();
  const [rec] = await db
    .select()
    .from(schema.recurringIncomes)
    .where(
      and(
        eq(schema.recurringIncomes.id, id),
        eq(schema.recurringIncomes.coupleId, s.user.coupleId)
      )
    );
  if (!rec) return { ok: false as const };
  const childTag = responsibleTagForChildUser(s.user);
  if (isChildAccount(s.user)) {
    if (!childTag || rec.responsible !== childTag) return { ok: false as const };
  }
  await db
    .delete(schema.recurringIncomes)
    .where(
      and(
        eq(schema.recurringIncomes.id, id),
        eq(schema.recurringIncomes.coupleId, s.user.coupleId)
      )
    );
  revalidatePath("/entradas");
  return { ok: true };
}

export async function generateRecurringIncomesFormAction() {
  await generateRecurringIncomesAction();
}

export async function generateRecurringIncomesAction(yearMonth?: string) {
  const s = await requireAuth();
  if (isChildAccount(s.user)) return;
  await syncRecurringIncomesForCouple(s.user.coupleId, yearMonth ?? currentYearMonth());
  revalidatePath("/entradas");
  revalidatePath("/");
}
