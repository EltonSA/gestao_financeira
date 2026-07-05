"use server";

import { and, count, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireAuth } from "@/lib/auth/getCouple";
import { isChildAccount } from "@/lib/auth/member";
import { getCardUsedCents } from "@/lib/services/cardLimit";
import { parseMoneyToCents } from "@/lib/money";
import { cardSupportsCredit, parseCardKind } from "@/lib/cardKind";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const cardSchema = z.object({
  name: z.string().min(1),
  institution: z.string().min(1),
  owner: z.enum(["person1", "person2", "shared"]),
  cardKind: z.enum(["credit", "debit", "both"]),
  limitBRL: z.string().min(1),
  closingDay: z.coerce.number().int().min(1).max(31),
  dueDay: z.coerce.number().int().min(1).max(31),
  color: z.string().default("#6366f1"),
  isActive: z.coerce.boolean().default(true),
});

export async function createCardAction(formData: FormData) {
  const s = await requireAuth();
  if (isChildAccount(s.user)) redirect("/cartoes");
  const kindRaw = parseCardKind(formData.get("cardKind")) ?? "credit";
  const r = cardSchema.safeParse({
    name: formData.get("name"),
    institution: formData.get("institution"),
    owner: formData.get("owner"),
    cardKind: kindRaw,
    limitBRL: String(formData.get("limitBRL") ?? ""),
    closingDay: formData.get("closingDay"),
    dueDay: formData.get("dueDay"),
    color: formData.get("color") ?? "#6366f1",
    isActive: formData.get("isActive") === "on" || formData.get("isActive") === "true",
  });
  if (!r.success) redirect("/cartoes/novo?err=invalid");
  const d = r.data;
  const limitTotalCents = parseMoneyToCents(d.limitBRL);
  const needsCreditLimit = cardSupportsCredit(d.cardKind);
  if (needsCreditLimit && limitTotalCents <= 0) redirect("/cartoes/novo?err=limite");
  if (!needsCreditLimit && limitTotalCents < 0) redirect("/cartoes/novo?err=limite");
  const id = crypto.randomUUID();
  await db.insert(schema.cards).values({
    id,
    coupleId: s.user.coupleId,
    name: d.name,
    institution: d.institution,
    owner: d.owner,
    cardKind: d.cardKind,
    limitTotalCents: needsCreditLimit ? limitTotalCents : 0,
    closingDay: d.closingDay,
    dueDay: d.dueDay,
    color: d.color,
    isActive: d.isActive,
    createdByUserId: s.user.id,
    updatedByUserId: s.user.id,
  });
  revalidatePath("/cartoes");
  redirect("/cartoes");
}

export async function updateCardAction(id: string, formData: FormData) {
  const s = await requireAuth();
  if (isChildAccount(s.user)) return { error: "Sem permissão" };
  const [c] = await db
    .select()
    .from(schema.cards)
    .where(and(eq(schema.cards.id, id), eq(schema.cards.coupleId, s.user.coupleId)))
    .limit(1);
  if (!c) return { error: "Cartão não encontrado" };
  const kindRaw = parseCardKind(formData.get("cardKind")) ?? c.cardKind;
  const r = cardSchema.safeParse({
    name: formData.get("name"),
    institution: formData.get("institution"),
    owner: formData.get("owner"),
    cardKind: kindRaw,
    limitBRL: String(formData.get("limitBRL") ?? ""),
    closingDay: formData.get("closingDay"),
    dueDay: formData.get("dueDay"),
    color: formData.get("color"),
    isActive: formData.get("isActive") === "on" || formData.get("isActive") === "true",
  });
  if (!r.success) return { error: "Dados inválidos" };
  const d = r.data;
  const needsCreditLimit = cardSupportsCredit(d.cardKind);
  const limitTotalCents = needsCreditLimit ? parseMoneyToCents(d.limitBRL) : 0;
  if (needsCreditLimit && limitTotalCents <= 0) {
    return { error: "Informe o limite de crédito" };
  }
  if (!cardSupportsCredit(d.cardKind)) {
    const [row] = await db
      .select({ c: count() })
      .from(schema.expenses)
      .where(
        and(
          eq(schema.expenses.cardId, id),
          eq(schema.expenses.coupleId, s.user.coupleId),
          eq(schema.expenses.paymentMethod, "credit"),
          inArray(schema.expenses.status, ["pending", "paid", "overdue"])
        )
      );
    if (row && Number(row.c) > 0) {
      return {
        error:
          "Não dá para marcar só débito: ainda há despesas em crédito neste cartão.",
      };
    }
  }
  const used = await getCardUsedCents(s.user.coupleId, id);
  if (limitTotalCents < used) {
    return { error: "Limite total não pode ser menor que o valor já usado no crédito" };
  }
  await db
    .update(schema.cards)
    .set({
      name: d.name,
      institution: d.institution,
      owner: d.owner,
      cardKind: d.cardKind,
      limitTotalCents,
      closingDay: d.closingDay,
      dueDay: d.dueDay,
      color: d.color,
      isActive: d.isActive,
      updatedByUserId: s.user.id,
    })
    .where(eq(schema.cards.id, id));
  revalidatePath("/cartoes");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteCardAction(id: string) {
  const s = await requireAuth();
  if (isChildAccount(s.user)) return { error: "Sem permissão" };
  const used = await getCardUsedCents(s.user.coupleId, id);
  if (used > 0) return { error: "Não é possível excluir: há despesas em crédito vinculadas" };
  const [inc] = await db
    .select({ c: count() })
    .from(schema.incomes)
    .where(
      and(eq(schema.incomes.cardId, id), eq(schema.incomes.coupleId, s.user.coupleId))
    );
  if (inc && Number(inc.c) > 0) {
    return { error: "Não é possível excluir: há entradas vinculadas a este cartão" };
  }
  await db
    .delete(schema.cards)
    .where(
      and(eq(schema.cards.id, id), eq(schema.cards.coupleId, s.user.coupleId))
    );
  revalidatePath("/cartoes");
  return { ok: true };
}

/** Action wrapper para uso direto via <form action={…}> com input hidden `id`. */
export async function deleteCardFormAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const result = await deleteCardAction(id);
  if (result && "error" in result && result.error) {
    redirect(`/cartoes?err=${encodeURIComponent(String(result.error))}`);
  }
  redirect("/cartoes");
}
