import "server-only";
import { and, between, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getEffectiveStatus } from "@/lib/dates";
import { formatBRL } from "@/lib/money";
import { getAllCardsUsage } from "@/lib/services/cardLimit";
import { getRealBalanceCents } from "@/lib/services/realBalance";
import { cardSupportsCredit } from "@/lib/cardKind";
import { startOfDay, subDays } from "date-fns";
import {
  getFinancialCycleForDate,
  getPreviousFinancialCycle,
  dayOfCycle,
  daysInCycle,
  ymdFromDate,
  type FinancialCycleSettings,
  type FinancialCycleRange,
} from "@/lib/financial-cycle";

export type Insight = {
  id: string;
  type: string;
  message: string;
  severity: "info" | "success" | "warning" | "danger";
};

function ymdToIsoDate(d: Date) {
  return ymdFromDate(d);
}

export async function runInsights(
  coupleId: string,
  settings: FinancialCycleSettings,
  cycle?: FinancialCycleRange
): Promise<Insight[]> {
  const now = new Date();
  const finCycle = cycle ?? getFinancialCycleForDate(now, settings);
  const startIso = finCycle.startDate;
  const endIso = finCycle.endDate;
  const out: Insight[] = [];
  let n = 0;
  const id = (t: string) => `ins-${++n}-${t}`;

  const prevCycle = getPreviousFinancialCycle(finCycle, settings);
  const pStart = prevCycle.startDate;
  const pEnd = prevCycle.endDate;
  const today = new Date();
  const todayStr = ymdToIsoDate(today);
  const d7 = subDays(startOfDay(today), 6);
  const d7iso = ymdToIsoDate(d7);

  const exps2 = await db
    .select()
    .from(schema.expenses)
    .where(
      and(
        eq(schema.expenses.coupleId, coupleId),
        between(schema.expenses.dueDate, startIso, endIso),
        inArray(schema.expenses.status, ["pending", "paid", "overdue", "cancelled"] as const)
      )
    );

  let spentToday = 0;
  for (const e of exps2) {
    if (e.paidAt === todayStr && e.status === "paid") {
      spentToday += e.amountCents;
    }
  }
  out.push({
    id: id("today"),
    type: "gasto_hoje",
    message: `Hoje ${spentToday > 0 ? "vocês pagaram" : "ainda não há pagamentos registrados"}${spentToday > 0 ? ` ${formatBRL(spentToday)}` : " hoje"}.`,
    severity: "info",
  });

  const last7 = await db
    .select()
    .from(schema.expenses)
    .where(
      and(
        eq(schema.expenses.coupleId, coupleId),
        between(
          schema.expenses.dueDate,
          d7iso,
          todayStr
        )
      )
    );
  const paid7 = last7.filter(
    (e) => e.status === "paid" && e.paidAt && e.paidAt >= d7iso
  );
  const sum7 = paid7.reduce((a, b) => a + b.amountCents, 0);
  if (sum7 > 0) {
    out.push({
      id: id("7d"),
      type: "7d",
      message: `Nos últimos 7 dias, o total pago foi ${formatBRL(sum7)}.`,
      severity: "info",
    });
  }

  const monthEx = exps2.filter((e) => e.status !== "cancelled");
  const monthPaid = monthEx.filter((e) => e.status === "paid");
  const monthPending = monthEx.filter((e) => e.status === "pending");
  const monthOver = monthEx.filter(
    (e) => e.status === "overdue" || getEffectiveStatus(e.dueDate, e.status) === "overdue"
  );
  out.push({
    id: id("m"),
    type: "mes",
    message: `Ciclo ${finCycle.label}: ${formatBRL(monthPaid.reduce((a, b) => a + b.amountCents, 0))} pago, ${formatBRL(monthPending.reduce((a, b) => a + b.amountCents, 0))} pendente${monthOver.length ? `, ${formatBRL(monthOver.reduce((a, b) => a + b.amountCents, 0))} vencido` : ""}.`,
    severity: "info",
  });

  const pEx = await db
    .select()
    .from(schema.expenses)
    .where(
      and(
        eq(schema.expenses.coupleId, coupleId),
        between(schema.expenses.dueDate, pStart, pEnd),
        inArray(schema.expenses.status, ["pending", "paid", "overdue"] as const)
      )
    );
  const pSum = pEx
    .filter((e) => e.status === "paid")
    .reduce((a, b) => a + b.amountCents, 0);
  const cSum = monthPaid.reduce((a, b) => a + b.amountCents, 0);
  if (pSum > 0) {
    const diff = ((cSum - pSum) / pSum) * 100;
    if (Math.abs(diff) > 1) {
      out.push({
        id: id("comp"),
        type: "comparativo",
        message: `Pagamentos confirmados: ${Math.abs(Math.round(diff))}% ${diff > 0 ? "a mais" : "a menos"} em relação ao ciclo anterior.`,
        severity: diff > 0 ? "warning" : "success",
      });
    }
  }

  const byCat: Record<string, number> = {};
  for (const e of monthEx) {
    if (e.status !== "paid" && e.status !== "overdue" && e.status !== "pending")
      continue;
    const c = e.categoryId;
    byCat[c] = (byCat[c] ?? 0) + e.amountCents;
  }
  const catRows = await db
    .select()
    .from(schema.categories);
  const idToName = Object.fromEntries(catRows.map((c) => [c.id, c.name]));
  const top = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0];
  if (top) {
    out.push({
      id: id("topcat"),
      type: "categoria",
      message: `A categoria com maior movimento no ciclo é ${idToName[top[0]] ?? "—"} (${formatBRL(top[1])}).`,
      severity: "info",
    });
  }

  const cardsU = await getAllCardsUsage(coupleId);
  for (const row of cardsU) {
    if (
      !cardSupportsCredit(row.card.cardKind) ||
      row.card.limitTotalCents <= 0
    ) {
      continue;
    }
    if (row.level !== "ok") {
      out.push({
        id: id(`card-${row.card.id}`),
        type: "limite",
        message: `O cartão ${row.card.name} está em ${row.percent}% do limite (${formatBRL(row.used)} de ${formatBRL(row.card.limitTotalCents)}).`,
        severity: row.level === "critical" || row.level === "high" ? "danger" : "warning",
      });
    }
  }

  const goals = await db
    .select()
    .from(schema.goals)
    .where(eq(schema.goals.coupleId, coupleId));
  for (const g of goals) {
    const rem = g.targetCents - g.currentCents;
    if (rem > 0) {
      out.push({
        id: id(`goal-${g.id}`),
        type: "meta",
        message: `Faltam ${formatBRL(rem)} para a meta ${g.name} (${g.targetCents > 0 ? Math.round((g.currentCents / g.targetCents) * 100) : 0}% concluído).`,
        severity: "info",
      });
    }
  }

  const in5 = new Date();
  in5.setDate(in5.getDate() + 5);
  const in5iso = ymdToIsoDate(in5);
  const soon = exps2.filter(
    (e) => e.dueDate >= todayStr && e.dueDate <= in5iso && (e.status === "pending" || e.status === "overdue")
  );
  if (soon.length) {
    out.push({
      id: id("vencer"),
      type: "vencer",
      message: `Há ${soon.length} contas a vencer nos próximos 5 dias (ou ainda pendentes).`,
      severity: "warning",
    });
  }

  const realBal = await getRealBalanceCents(coupleId);
  if (realBal !== 0) {
    out.push({
      id: id("saldo"),
      type: "saldo_real",
      message: `Saldo real disponível: ${formatBRL(realBal)} (entradas menos despesas e faturas pagas).`,
      severity: realBal < 0 ? "danger" : "success",
    });
  }

  const dom = dayOfCycle(today, finCycle);
  const lastDay = daysInCycle(finCycle);
  if (dom > 0) {
    const avg = cSum / dom;
    const proj = (cSum / dom) * lastDay;
    if (cSum > 0) {
      out.push({
        id: id("md"),
        type: "media",
        message: `Média de pagos por dia no ciclo: ~${formatBRL(Math.round(avg))}; projeção até o fim do ciclo: ~${formatBRL(Math.round(proj))}.`,
        severity: "info",
      });
    }
  }

  return out.slice(0, 20);
}
