import "server-only";

import { and, eq, inArray, sum } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { cardAlertLevel, usagePercent } from "@/lib/metrics";
import { cardSupportsCredit, cardSupportsDebit } from "@/lib/cardKind";
import { getCardUsedCents } from "@/lib/services/cardLimit";

const ACTIVE = ["pending", "paid", "overdue"] as const;

export async function getIncomeTotalOnCardCents(
  coupleId: string,
  cardId: string
): Promise<number> {
  const [row] = await db
    .select({ s: sum(schema.incomes.amountCents) })
    .from(schema.incomes)
    .where(
      and(
        eq(schema.incomes.coupleId, coupleId),
        eq(schema.incomes.cardId, cardId)
      )
    );
  const v = row?.s;
  return v == null ? 0 : Number(v);
}

export async function getDebitUsedOnCardCents(
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
        eq(schema.expenses.paymentMethod, "debit"),
        inArray(schema.expenses.status, [...ACTIVE] as unknown as string[])
      )
    );
  const v = row?.s;
  return v == null ? 0 : Number(v);
}

export type CardWalletSummary = {
  card: (typeof schema.cards.$inferSelect);
  incomeOnCardCents: number;
  debitUsedOnCardCents: number;
  creditUsedCents: number;
  creditLimitCents: number;
  creditAvailableCents: number;
  /** Fatura de crédito após abater entradas vinculadas ao cartão. */
  netCreditUsedCents: number;
  /** Limite − netCredit (entradas “pagam” o rotativo até zerar). */
  effectiveCreditAvailableCents: number;
  /** Caixa livre: entradas que sobraram após o usado no crédito. */
  liquidAfterCreditCents: number;
  /** Caixa livre após compras no débito (só se o cartão tem débito). */
  liquidAfterDebitCents: number;
  /** Linha de crédito disponível + caixa livre na conta do cartão. */
  totalDisponivelCartaoCents: number;
  percent: number;
  level: ReturnType<typeof cardAlertLevel>;
};

export async function getCardWalletSummaries(
  coupleId: string
): Promise<CardWalletSummary[]> {
  const cards = await db
    .select()
    .from(schema.cards)
    .where(
      and(eq(schema.cards.coupleId, coupleId), eq(schema.cards.isActive, true))
    );
  const out: CardWalletSummary[] = [];
  for (const card of cards) {
    const incomeOn = await getIncomeTotalOnCardCents(coupleId, card.id);
    const debitUsed = await getDebitUsedOnCardCents(coupleId, card.id);
    const creditUsed = await getCardUsedCents(coupleId, card.id);
    const limit = card.limitTotalCents;
    const creditAvail = Math.max(0, limit - creditUsed);
    const netCredit = Math.max(0, creditUsed - incomeOn);
    const effCreditAvail = Math.max(0, limit - netCredit);
    const liquidAfterCredit = Math.max(0, incomeOn - creditUsed);
    const liquidAfterDebit = cardSupportsDebit(card.cardKind)
      ? Math.max(0, liquidAfterCredit - debitUsed)
      : liquidAfterCredit;
    const totalDisp = effCreditAvail + liquidAfterDebit;

    const pct =
      cardSupportsCredit(card.cardKind) && limit > 0
        ? usagePercent(netCredit, limit)
        : 0;
    out.push({
      card,
      incomeOnCardCents: incomeOn,
      debitUsedOnCardCents: debitUsed,
      creditUsedCents: creditUsed,
      creditLimitCents: limit,
      creditAvailableCents: creditAvail,
      netCreditUsedCents: netCredit,
      effectiveCreditAvailableCents: effCreditAvail,
      liquidAfterCreditCents: liquidAfterCredit,
      liquidAfterDebitCents: liquidAfterDebit,
      totalDisponivelCartaoCents: totalDisp,
      percent: pct,
      level: cardAlertLevel(pct),
    });
  }
  return out;
}
