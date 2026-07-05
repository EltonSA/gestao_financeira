"use server";

import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireAuth } from "@/lib/auth/getCouple";
import { isChildAccount, responsibleTagForChildUser } from "@/lib/auth/member";
import { assertResponsibleBelongsToCouple } from "@/lib/data/children";
import { parseDateBR } from "@/lib/dates";
import { parseMoneyToCents } from "@/lib/money";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const incomeForm = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  amount: z.string().min(1),
  receivedDate: z.string().min(1),
  cardId: z.string().optional(),
  responsible: z.string().min(1),
});

export async function createIncomeAction(formData: FormData) {
  const s = await requireAuth();
  const r = incomeForm.safeParse({
    title: formData.get("title"),
    description: formData.get("description") ?? undefined,
    amount: String(formData.get("amount") ?? ""),
    receivedDate: String(formData.get("receivedDate") ?? ""),
    cardId: (formData.get("cardId") as string) || undefined,
    responsible: formData.get("responsible"),
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
    if (!c) return { error: "Cartão inválido ou inativo" };
  }

  await db.insert(schema.incomes).values({
    coupleId: s.user.coupleId,
    title: d.title,
    description: d.description ?? null,
    amountCents,
    receivedDate: received,
    cardId: d.cardId ?? null,
    responsible,
    createdByUserId: s.user.id,
    updatedByUserId: s.user.id,
  });
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
    if (!c) return { error: "Cartão inválido ou inativo" };
  }

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
