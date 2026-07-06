import "server-only";
import { and, eq, inArray, sum } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { cardAlertLevel, usagePercent } from "@/lib/metrics";

/** Compras no crédito em aberto — só pendente/vencido (fatura não paga). */
const OPEN_CREDIT = ["pending", "overdue"] as const;

export { usagePercent, cardAlertLevel };

export async function getCardUsedCents(
  coupleId: string,
  cardId: string
): Promise<number> {
  const [row] = await db
    .select({ s: sum(schema.expenses.amountCents) })
    .from(schema.expenses)
    .where(
      and(
        eq(schema.expenses.coupleId, coupleId),
        eq(schema.expenses.cardId, cardId),
        eq(schema.expenses.paymentMethod, "credit"),
        inArray(schema.expenses.status, [...OPEN_CREDIT] as unknown as string[])
      )
    );
  const v = row?.s;
  return v == null ? 0 : Number(v);
}

export async function getAllCardsUsage(coupleId: string) {
  const c = await db
    .select()
    .from(schema.cards)
    .where(
      and(eq(schema.cards.coupleId, coupleId), eq(schema.cards.isActive, true))
    );
  const out: {
    card: (typeof c)[0];
    used: number;
    available: number;
    percent: number;
    level: ReturnType<typeof cardAlertLevel>;
  }[] = [];
  for (const card of c) {
    const used = await getCardUsedCents(coupleId, card.id);
    const available = Math.max(0, card.limitTotalCents - used);
    const p = usagePercent(used, card.limitTotalCents);
    out.push({
      card,
      used,
      available,
      percent: p,
      level: cardAlertLevel(p),
    });
  }
  return out;
}
