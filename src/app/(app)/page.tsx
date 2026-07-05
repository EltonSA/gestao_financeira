import { getSession } from "@/lib/auth/session";
import { getDashboardData, loadCoupleLabels } from "@/lib/data/stats";
import { listChildrenByCouple } from "@/lib/data/children";
import { childResponsibleValue } from "@/lib/responsible";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { db, schema } from "@/lib/db";
import { eq, isNull, or } from "drizzle-orm";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const s = await getSession();
  if (!s) redirect("/login");
  const data = await getDashboardData(s.user.coupleId);
  const labels = await loadCoupleLabels(s.user.coupleId);
  const cats = await db
    .select()
    .from(schema.categories)
    .where(
      or(
        isNull(schema.categories.coupleId),
        eq(schema.categories.coupleId, s.user.coupleId)
      )
    );
  const catLabels = Object.fromEntries(cats.map((c) => [c.id, c.name]));
  const childrenRows = await listChildrenByCouple(s.user.coupleId);
  const childSlices = childrenRows.map((ch) => ({
    name: ch.name,
    value: data.persons.by[childResponsibleValue(ch.id)] ?? 0,
  }));
  const cardItems = data.cardWallets.map((w) => ({
    name: w.card.name,
    color: w.card.color,
    cardKind: w.card.cardKind,
    used: w.creditUsedCents,
    limit: w.creditLimitCents,
    available: w.effectiveCreditAvailableCents,
    percent: w.percent,
    incomeOnCard: w.incomeOnCardCents,
    debitUsedOnCard: w.debitUsedOnCardCents,
    totalDisponivel: w.totalDisponivelCartaoCents,
    liquidAfterDebit: w.liquidAfterDebitCents,
  }));
  return (
    <DashboardView
      userName={s.user.name}
      kpi={data.kpi}
      walletAgg={data.walletAgg}
      forecast={data.forecast}
      monthBar={data.monthBar}
      daySeries={data.daySeries}
      byCat={data.categories.byCat}
      byPerson={{
        person1: data.persons.by.person1 ?? 0,
        person2: data.persons.by.person2 ?? 0,
        both: data.persons.by.both ?? 0,
        p1: labels.p1,
        p2: labels.p2,
        children: childSlices,
      }}
      goals={data.goals}
      cardItems={cardItems}
      totLimit={data.walletAgg.creditLimitTracked || data.cards.totLimit}
      totAvail={data.walletAgg.effectiveCreditAvail}
      totDisponivelCartoes={data.walletAgg.totalDisponivelCartoes}
      topCat={data.categories.top}
      topCard={
        data.cards.top
          ? { name: data.cards.cardName(data.cards.top[0]), c: data.cards.top[1] }
          : null
      }
      insights={data.insights}
      projection={{ avg: data.projection.avg, proj: data.projection.proj }}
      catLabels={catLabels}
    />
  );
}
