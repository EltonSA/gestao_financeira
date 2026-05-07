import "server-only";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getEffectiveStatus } from "@/lib/dates";
import { endOfMonth, startOfMonth, subDays, subMonths } from "date-fns";
import { getAllCardsUsage } from "@/lib/services/cardLimit";
import { runInsights } from "@/lib/insights/engine";

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function monthRange(y: number, m: number) {
  const s = startOfMonth(new Date(y, m - 1, 1));
  const e = endOfMonth(new Date(y, m - 1, 1));
  return { s: ymd(s), e: ymd(e) };
}

export async function getDashboardData(coupleId: string) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const { s: mStart, e: mEnd } = monthRange(y, m);
  const prevD = subMonths(new Date(y, m - 1, 1), 1);
  const py = prevD.getFullYear();
  const pm = prevD.getMonth() + 1;
  const { s: pStart, e: pEnd } = monthRange(py, pm);
  const tStr = ymd(now);
  const d7 = subDays(now, 6);
  const d7s = ymd(d7);

  const allEx = await db
    .select()
    .from(schema.expenses)
    .where(eq(schema.expenses.coupleId, coupleId));

  const exMonth = allEx.filter(
    (e) => e.dueDate >= mStart && e.dueDate <= mEnd && e.status !== "cancelled"
  );
  const exPrev = allEx.filter(
    (e) => e.dueDate >= pStart && e.dueDate <= pEnd && e.status === "paid"
  );

  let todayPaid = 0;
  let day7 = 0;
  for (const e of allEx) {
    if (e.status === "paid" && e.paidAt === tStr) {
      todayPaid += e.amountCents;
    }
    if (e.status === "paid" && e.paidAt && e.paidAt >= d7s && e.paidAt <= tStr) {
      day7 += e.amountCents;
    }
  }

  const monthPaid = exMonth.filter((e) => e.status === "paid");
  const monthPend = exMonth.filter((e) => e.status === "pending");
  const monthOver = exMonth.filter(
    (e) => e.status === "overdue" || getEffectiveStatus(e.dueDate, e.status) === "overdue"
  );
  const sumP = (a: typeof exMonth) => a.reduce((x, e) => x + e.amountCents, 0);

  const byCat: Record<string, number> = {};
  for (const e of exMonth) {
    if (e.status === "cancelled") continue;
    byCat[e.categoryId] = (byCat[e.categoryId] ?? 0) + e.amountCents;
  }
  const cats = await db
    .select()
    .from(schema.categories);
  const catName = (id: string) => cats.find((c) => c.id === id)?.name ?? "—";
  const topCat = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0];

  const byPerson: Record<string, number> = { person1: 0, person2: 0, both: 0 };
  for (const e of exMonth) {
    if (e.status === "cancelled") continue;
    const k = e.responsible;
    byPerson[k] = (byPerson[k] ?? 0) + e.amountCents;
  }

  const byCard: Record<string, number> = {};
  for (const e of exMonth) {
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
  const totLimit = cRows
    .filter((c) => c.isActive)
    .reduce((a, c) => a + c.limitTotalCents, 0);
  const totAvail = cardUsage.reduce((a, r) => a + r.available, 0);
  const totUsed = cardUsage.reduce((a, r) => a + r.used, 0);

  const prevTotal = sumP(exPrev);

  const goals = await db
    .select()
    .from(schema.goals)
    .where(eq(schema.goals.coupleId, coupleId));
  const dom = now.getDate();
  const csum = sumP(monthPaid);
  const lastDay = endOfMonth(now).getDate();
  const avg = dom > 0 ? csum / dom : 0;
  const proj = dom > 0 ? (csum / dom) * lastDay : 0;
  const pendingSum = monthPend.reduce((a, b) => a + b.amountCents, 0);
  const overSum = monthOver.reduce((a, b) => a + b.amountCents, 0);

  const daySeries: { d: string; c: number }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = ymd(subDays(now, 6 - i));
    const v = allEx
      .filter(
        (e) => e.paidAt === d && e.status === "paid"
      )
      .reduce((a, b) => a + b.amountCents, 0);
    daySeries.push({ d, c: v });
  }

  const insights = await runInsights(coupleId);

  return {
    kpi: {
      today: todayPaid,
      last7: day7,
      month: sumP(monthPaid),
      monthPending: pendingSum,
      monthOver: overSum,
      monthTotal: sumP(exMonth),
    },
    monthComparison: { current: csum, previous: prevTotal },
    cards: { totLimit, totAvail, totUsed, items: cardUsage, top: topCard, cardName },
    categories: { byCat, top: topCat ? { name: catName(topCat[0]), c: topCat[1] } : null, catName },
    persons: { by: byPerson, labels: null as { p1: string; p2: string } | null },
    goals,
    daySeries,
    monthBar: {
      thisMonth: csum,
      lastMonth: prevTotal,
    },
    projection: { avg, proj, estimatedBalance: csum - pendingSum },
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
