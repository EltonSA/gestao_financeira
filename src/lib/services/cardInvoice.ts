import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import type { Card } from "@/lib/db/schema";
import { ymdFromDate, parseYmd } from "@/lib/financial-cycle";

export type CardBillingCycle = {
  cycleStartDate: string;
  cycleEndDate: string;
  closingDate: string;
  dueDate: string;
};

function lastDayOfMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function clampDay(year: number, month: number, day: number) {
  return Math.min(day, lastDayOfMonth(year, month));
}

function addMonths(year: number, month: number, delta: number) {
  let m = month + delta;
  let y = year;
  while (m > 12) {
    m -= 12;
    y += 1;
  }
  while (m < 1) {
    m += 12;
    y -= 1;
  }
  return { year: y, month: m };
}

/** Ciclo de fatura do cartão que contém a data informada. */
export function getCardBillingCycleForDate(
  card: Pick<Card, "closingDay" | "dueDay">,
  date: Date = new Date()
): CardBillingCycle {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const closing = clampDay(y, m, card.closingDay);

  let closeY = y;
  let closeM = m;
  if (d > closing) {
    const next = addMonths(y, m, 1);
    closeY = next.year;
    closeM = next.month;
  }

  const closingDate = ymdFromDate(
    new Date(closeY, closeM - 1, clampDay(closeY, closeM, card.closingDay))
  );

  const prev = addMonths(closeY, closeM, -1);
  const prevCloseDay = clampDay(prev.year, prev.month, card.closingDay);
  const prevClose = new Date(prev.year, prev.month - 1, prevCloseDay);
  const cycleStart = new Date(prevClose);
  cycleStart.setDate(cycleStart.getDate() + 1);

  const cycleEnd = parseYmd(closingDate);

  let dueY = closeY;
  let dueM = closeM;
  if (card.dueDay <= card.closingDay) {
    const next = addMonths(closeY, closeM, 1);
    dueY = next.year;
    dueM = next.month;
  }
  const dueDate = ymdFromDate(
    new Date(dueY, dueM - 1, clampDay(dueY, dueM, card.dueDay))
  );

  return {
    cycleStartDate: ymdFromDate(cycleStart),
    cycleEndDate: ymdFromDate(cycleEnd),
    closingDate,
    dueDate,
  };
}

function invoiceStatusForCycle(
  cycle: CardBillingCycle,
  today: string,
  totalCents: number,
  paidCents: number
): string {
  if (paidCents >= totalCents && totalCents > 0) return "paid";
  if (paidCents > 0 && paidCents < totalCents) return "partial_paid";
  if (today > cycle.dueDate && totalCents > paidCents) return "overdue";
  if (today > cycle.closingDate) return "closed";
  return "open";
}

/** Garante fatura do ciclo atual e vincula compras no crédito. */
export async function syncCardInvoicesForCouple(coupleId: string) {
  const today = ymdFromDate(new Date());
  const cards = await db
    .select()
    .from(schema.cards)
    .where(
      and(eq(schema.cards.coupleId, coupleId), eq(schema.cards.isActive, true))
    );

  for (const card of cards) {
    if (card.cardKind === "debit") continue;
    const cycle = getCardBillingCycleForDate(card);

    let [invoice] = await db
      .select()
      .from(schema.cardInvoices)
      .where(
        and(
          eq(schema.cardInvoices.cardId, card.id),
          eq(schema.cardInvoices.cycleStartDate, cycle.cycleStartDate)
        )
      )
      .limit(1);

    if (!invoice) {
      const id = crypto.randomUUID();
      await db.insert(schema.cardInvoices).values({
        id,
        cardId: card.id,
        coupleId,
        cycleStartDate: cycle.cycleStartDate,
        cycleEndDate: cycle.cycleEndDate,
        closingDate: cycle.closingDate,
        dueDate: cycle.dueDate,
        totalAmountCents: 0,
        paidAmountCents: 0,
        status: "open",
      });
      [invoice] = await db
        .select()
        .from(schema.cardInvoices)
        .where(eq(schema.cardInvoices.id, id))
        .limit(1);
    }

    if (!invoice) continue;

    const creditExpenses = await db
      .select()
      .from(schema.expenses)
      .where(
        and(
          eq(schema.expenses.coupleId, coupleId),
          eq(schema.expenses.cardId, card.id),
          eq(schema.expenses.paymentMethod, "credit"),
          inArray(schema.expenses.status, ["pending", "paid", "overdue"])
        )
      );

    let total = 0;
    for (const exp of creditExpenses) {
      if (
        exp.dueDate >= cycle.cycleStartDate &&
        exp.dueDate <= cycle.cycleEndDate
      ) {
        if (!exp.cardInvoiceId) {
          await db
            .update(schema.expenses)
            .set({ cardInvoiceId: invoice.id })
            .where(eq(schema.expenses.id, exp.id));
        }
        total += exp.amountCents;
      }
    }

    const status = invoiceStatusForCycle(
      cycle,
      today,
      total,
      invoice.paidAmountCents
    );

    await db
      .update(schema.cardInvoices)
      .set({
        cycleEndDate: cycle.cycleEndDate,
        closingDate: cycle.closingDate,
        dueDate: cycle.dueDate,
        totalAmountCents: total,
        status,
        updatedAt: new Date(),
      })
      .where(eq(schema.cardInvoices.id, invoice.id));
  }
}

export async function getCurrentInvoiceForCard(cardId: string) {
  const [card] = await db
    .select()
    .from(schema.cards)
    .where(eq(schema.cards.id, cardId))
    .limit(1);
  if (!card) return null;
  const cycle = getCardBillingCycleForDate(card);
  const [invoice] = await db
    .select()
    .from(schema.cardInvoices)
    .where(
      and(
        eq(schema.cardInvoices.cardId, cardId),
        eq(schema.cardInvoices.cycleStartDate, cycle.cycleStartDate)
      )
    )
    .limit(1);
  return invoice ?? null;
}

export async function listOpenInvoicesForCouple(coupleId: string) {
  const rows = await db
    .select()
    .from(schema.cardInvoices)
    .where(eq(schema.cardInvoices.coupleId, coupleId));
  return rows.filter(
    (r) =>
      r.status === "open" ||
      r.status === "closed" ||
      r.status === "partial_paid" ||
      r.status === "overdue"
  );
}

export async function getInvoiceOutstandingCents(
  invoice: typeof schema.cardInvoices.$inferSelect
) {
  return Math.max(0, invoice.totalAmountCents - invoice.paidAmountCents);
}
