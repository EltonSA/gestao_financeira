import "server-only";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getEffectiveStatus } from "@/lib/dates";
import { subDays, addDays } from "date-fns";
import { getAllCardsUsage } from "@/lib/services/cardLimit";
import { getCardWalletSummaries } from "@/lib/services/cardWallet";
import { getRealBalanceBreakdown } from "@/lib/services/realBalance";
import { cardSupportsCredit } from "@/lib/cardKind";
import { runInsights } from "@/lib/insights/engine";
import {
  coupleToFinancialSettings,
  getFinancialCycleForDate,
  getPreviousFinancialCycle,
  daysInCycle,
  dayOfCycle,
  daysLeftInCycle,
  ymdFromDate,
  type FinancialCycleRange,
} from "@/lib/financial-cycle";

function inCycle(iso: string, cycle: FinancialCycleRange) {
  return iso >= cycle.startDate && iso <= cycle.endDate;
}

export async function getCoupleFinancialSettings(coupleId: string) {
  const [c] = await db
    .select()
    .from(schema.couples)
    .where(eq(schema.couples.id, coupleId));
  if (!c) {
    return coupleToFinancialSettings({
      financialCycleStartType: "fixed_day",
      financialCycleStartDay: 1,
      financialCycleBusinessDayNumber: 5,
    });
  }
  return coupleToFinancialSettings(c);
}

export async function getDashboardData(coupleId: string) {
  const now = new Date();
  const settings = await getCoupleFinancialSettings(coupleId);
  const cycle = getFinancialCycleForDate(now, settings);
  const prevCycle = getPreviousFinancialCycle(cycle, settings);
  const tStr = ymdFromDate(now);
  const d7 = subDays(now, 6);
  const d7s = ymdFromDate(d7);

  const allEx = await db
    .select()
    .from(schema.expenses)
    .where(eq(schema.expenses.coupleId, coupleId));

  const allIn = await db
    .select()
    .from(schema.incomes)
    .where(eq(schema.incomes.coupleId, coupleId));

  const exCycle = allEx.filter(
    (e) => inCycle(e.dueDate, cycle) && e.status !== "cancelled"
  );
  const exPrev = allEx.filter(
    (e) => inCycle(e.dueDate, prevCycle) && e.status === "paid"
  );

  const inCycleIncomes = allIn.filter((i) => inCycle(i.receivedDate, cycle));

  let todayPaid = 0;
  let todayExpenseAll = 0;
  let day7 = 0;
  for (const e of allEx) {
    if (e.status === "paid" && e.paidAt === tStr) {
      todayPaid += e.amountCents;
    }
    if (e.status !== "cancelled" && e.dueDate === tStr) {
      todayExpenseAll += e.amountCents;
    }
    if (e.status === "paid" && e.paidAt && e.paidAt >= d7s && e.paidAt <= tStr) {
      day7 += e.amountCents;
    }
  }

  const cyclePaid = exCycle.filter((e) => e.status === "paid");
  const cyclePend = exCycle.filter((e) => e.status === "pending");
  const cycleOver = exCycle.filter(
    (e) => e.status === "overdue" || getEffectiveStatus(e.dueDate, e.status) === "overdue"
  );
  const sumP = (a: typeof exCycle) => a.reduce((x, e) => x + e.amountCents, 0);

  const byCat: Record<string, number> = {};
  for (const e of exCycle) {
    if (e.status === "cancelled") continue;
    byCat[e.categoryId] = (byCat[e.categoryId] ?? 0) + e.amountCents;
  }
  const cats = await db.select().from(schema.categories);
  const catName = (id: string) => cats.find((c) => c.id === id)?.name ?? "—";
  const topCat = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0];

  const byPerson: Record<string, number> = { person1: 0, person2: 0, both: 0 };
  for (const e of exCycle) {
    if (e.status === "cancelled") continue;
    const k = e.responsible;
    byPerson[k] = (byPerson[k] ?? 0) + e.amountCents;
  }

  const byCard: Record<string, number> = {};
  for (const e of exCycle) {
    if (e.status === "cancelled" || !e.cardId) continue;
    byCard[e.cardId] = (byCard[e.cardId] ?? 0) + e.amountCents;
  }
  const cRows = await db
    .select()
    .from(schema.cards)
    .where(eq(schema.cards.coupleId, coupleId));
  const cardName = (id: string) => cRows.find((c) => c.id === id)?.name ?? "—";
  const topCard = Object.entries(byCard).sort((a, b) => b[1] - a[1])[0];

  const cardUsage = await getAllCardsUsage(coupleId);
  const cardWallets = await getCardWalletSummaries(coupleId);
  const realBalance = await getRealBalanceBreakdown(coupleId);

  const walletAgg = cardWallets.reduce(
    (a, w) => ({
      creditUsed: a.creditUsed + w.creditUsedCents,
      creditAvail: a.creditAvail + w.creditAvailableCents,
      currentInvoice: a.currentInvoice + w.currentInvoiceCents,
      invoiceOutstanding: a.invoiceOutstanding + w.currentInvoiceOutstandingCents,
      debitUsedOnCards: a.debitUsedOnCards + w.debitUsedOnCardCents,
      creditLimitTracked:
        a.creditLimitTracked +
        (cardSupportsCredit(w.card.cardKind) ? w.creditLimitCents : 0),
    }),
    {
      creditUsed: 0,
      creditAvail: 0,
      currentInvoice: 0,
      invoiceOutstanding: 0,
      debitUsedOnCards: 0,
      creditLimitTracked: 0,
    }
  );

  const recs = await db
    .select()
    .from(schema.recurringExpenses)
    .where(
      and(
        eq(schema.recurringExpenses.coupleId, coupleId),
        eq(schema.recurringExpenses.isActive, true)
      )
    );
  const fixedMonthlyCents = recs.reduce((s, r) => s + r.amountCents, 0);

  const horizon = ymdFromDate(addDays(now, 14));
  let upcoming14Cents = 0;
  let upcoming14Count = 0;
  for (const e of allEx) {
    if (e.status === "cancelled") continue;
    if (e.dueDate > tStr && e.dueDate <= horizon) {
      if (e.status === "pending" || getEffectiveStatus(e.dueDate, e.status) === "overdue") {
        upcoming14Cents += e.amountCents;
        upcoming14Count += 1;
      }
    }
  }

  const prevTotal = sumP(exPrev);
  const csum = sumP(cyclePaid);
  const cycleIncomeTotal = inCycleIncomes.reduce((a, i) => a + i.amountCents, 0);

  const goals = await db
    .select()
    .from(schema.goals)
    .where(eq(schema.goals.coupleId, coupleId));

  const dom = dayOfCycle(now, cycle);
  const cycleDays = daysInCycle(cycle);
  const daysLeft = daysLeftInCycle(now, cycle);
  const avg = dom > 0 ? csum / dom : 0;
  const proj = dom > 0 ? (csum / dom) * cycleDays : 0;
  const pendingSum = cyclePend.reduce((a, b) => a + b.amountCents, 0);
  const overSum = cycleOver.reduce((a, b) => a + b.amountCents, 0);

  const cycleTotalAll = sumP(exCycle);
  const cycleVariableApprox = Math.max(0, cycleTotalAll - fixedMonthlyCents);
  const burnRate = dom > 0 ? csum / dom : 0;
  const projPaidCycleEnd = Math.round(burnRate * cycleDays);
  const projCommitCycleEnd = Math.round((cycleTotalAll / Math.max(1, dom)) * cycleDays);

  const daySeries: { d: string; c: number }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = ymdFromDate(subDays(now, 6 - i));
    const v = allEx
      .filter((e) => e.paidAt === d && e.status === "paid")
      .reduce((a, b) => a + b.amountCents, 0);
    daySeries.push({ d, c: v });
  }

  const insights = await runInsights(coupleId, settings, cycle);

  return {
    financialCycle: cycle,
    realBalance,
    kpi: {
      today: todayPaid,
      todayScheduled: todayExpenseAll,
      last7: day7,
      month: csum,
      monthPending: pendingSum,
      monthOver: overSum,
      monthTotal: cycleTotalAll,
      monthFixed: fixedMonthlyCents,
      monthVariableApprox: cycleVariableApprox,
      cycleIncomes: cycleIncomeTotal,
    },
    monthComparison: { current: csum, previous: prevTotal },
    cards: {
      totLimit: walletAgg.creditLimitTracked,
      totAvail: walletAgg.creditAvail,
      totUsed: walletAgg.creditUsed,
      items: cardUsage,
      top: topCard,
      cardName,
    },
    cardWallets,
    walletAgg,
    forecast: {
      daysLeftInMonth: daysLeft,
      projPaidMonthEnd: projPaidCycleEnd,
      projCommitMonthEnd: projCommitCycleEnd,
      upcoming14Cents,
      upcoming14Count,
      avgDailyPaid: avg,
      projClassic: proj,
    },
    categories: { byCat, top: topCat ? { name: catName(topCat[0]), c: topCat[1] } : null, catName },
    persons: { by: byPerson, labels: null as { p1: string; p2: string } | null },
    goals,
    recurring: {
      count: recs.length,
      totalCents: fixedMonthlyCents,
      items: recs.map((r) => ({
        id: r.id,
        name: r.name,
        amountCents: r.amountCents,
        dayOfMonth: r.dayOfMonth,
      })),
    },
    daySeries,
    monthBar: {
      thisMonth: csum,
      lastMonth: prevTotal,
    },
    projection: {
      avg,
      proj,
      estimatedBalance: realBalance.realBalanceCents - pendingSum,
    },
    insights,
  };
}

export async function loadCoupleLabels(coupleId: string) {
  const [c] = await db
    .select()
    .from(schema.couples)
    .where(eq(schema.couples.id, coupleId));
  if (!c) return { p1: "Pessoa 1", p2: "Pessoa 2" };
  return { p1: c.person1Label, p2: c.person2Label, name: c.name };
}
