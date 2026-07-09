import "server-only";

import { and, eq, inArray, sum } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { cardAlertLevel, usagePercent } from "@/lib/metrics";
import { cardSupportsCredit } from "@/lib/cardKind";
import { getCardUsedCents } from "@/lib/services/cardLimit";
import { getCurrentInvoiceForCard } from "@/lib/services/cardInvoice";

const DEBIT_ACTIVE = ["pending", "paid", "overdue"] as const;

export async function getCardIncomeCents(
  coupleId: string,
  cardId: string
): Promise<number> {
  const [row] = await db
    .select({ s: sum(schema.incomes.amountCents) })
    .from(schema.incomes)
    .where(and(eq(schema.incomes.coupleId, coupleId), eq(schema.incomes.cardId, cardId)));
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
        inArray(schema.expenses.status, [...DEBIT_ACTIVE] as unknown as string[])
      )
    );
  const v = row?.s;
  return v == null ? 0 : Number(v);
}

export type CardWalletSummary = {
  card: typeof schema.cards.$inferSelect;
  debitUsedOnCardCents: number;
  /** Entradas (dinheiro) creditadas nesse cartão. */
  cardIncomeCents: number;
  /** Entradas − gasto em débito: saldo em dinheiro que sobrou no cartão. */
  cardCashBalanceCents: number;
  /** Compras no crédito ainda em aberto (fatura não quitada). */
  creditUsedCents: number;
  creditLimitCents: number;
  /** Limite total − usado no crédito. */
  creditAvailableCents: number;
  /** Fatura do ciclo atual (total do período). */
  currentInvoiceCents: number;
  /** Valor em aberto na fatura atual. */
  currentInvoiceOutstandingCents: number;
  currentInvoiceId: string | null;
  currentInvoiceDueDate: string | null;
  currentInvoiceStatus: string | null;
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
    const debitUsed = await getDebitUsedOnCardCents(coupleId, card.id);
    const cardIncome = await getCardIncomeCents(coupleId, card.id);
    const creditUsed = await getCardUsedCents(coupleId, card.id);
    const limit = cardSupportsCredit(card.cardKind) ? card.limitTotalCents : 0;
    const creditAvail = Math.max(0, limit - creditUsed);

    const invoice = cardSupportsCredit(card.cardKind)
      ? await getCurrentInvoiceForCard(card.id)
      : null;
    const invoiceTotal = invoice?.totalAmountCents ?? 0;
    const invoiceOutstanding = invoice
      ? Math.max(0, invoice.totalAmountCents - invoice.paidAmountCents)
      : 0;

    const pct = limit > 0 ? usagePercent(creditUsed, limit) : 0;
    out.push({
      card,
      debitUsedOnCardCents: debitUsed,
      cardIncomeCents: cardIncome,
      cardCashBalanceCents: cardIncome - debitUsed,
      creditUsedCents: creditUsed,
      creditLimitCents: limit,
      creditAvailableCents: creditAvail,
      currentInvoiceCents: invoiceTotal,
      currentInvoiceOutstandingCents: invoiceOutstanding,
      currentInvoiceId: invoice?.id ?? null,
      currentInvoiceDueDate: invoice?.dueDate ?? null,
      currentInvoiceStatus: invoice?.status ?? null,
      percent: pct,
      level: cardAlertLevel(pct),
    });
  }
  return out;
}
