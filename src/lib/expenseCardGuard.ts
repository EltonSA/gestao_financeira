import "server-only";

import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { cardSupportsCredit, cardSupportsDebit } from "@/lib/cardKind";

/** Retorna mensagem de erro ou null se ok. */
export async function validateExpenseCardSelection(
  coupleId: string,
  paymentMethod: string,
  cardId: string | undefined | null
): Promise<string | null> {
  const cid = cardId || undefined;
  if (paymentMethod === "credit") {
    if (!cid) return "Selecione o cartão para compra no crédito";
    const [c] = await db
      .select()
      .from(schema.cards)
      .where(and(eq(schema.cards.id, cid), eq(schema.cards.coupleId, coupleId)));
    if (!c) return "Cartão inválido";
    if (!cardSupportsCredit(c.cardKind)) return "Este cartão não aceita lançamentos no crédito";
    return null;
  }
  if (paymentMethod === "debit" && cid) {
    const [c] = await db
      .select()
      .from(schema.cards)
      .where(and(eq(schema.cards.id, cid), eq(schema.cards.coupleId, coupleId)));
    if (!c) return "Cartão inválido";
    if (!cardSupportsDebit(c.cardKind)) return "Este cartão não aceita lançamentos no débito";
    return null;
  }
  return null;
}
