"use client";

import { formatBRL } from "@/lib/money";
import { cardAlertLevel } from "@/lib/metrics";
import { greetingByHour } from "@/lib/utils";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Banknote,
  Calendar,
  CalendarClock,
  CreditCard as CreditCardIcon,
  HandCoins,
  Lightbulb,
  PiggyBank,
  Receipt,
  Sparkles,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { cardKindLabel } from "@/lib/cardKind";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/progress";
import { FinancialCycleNav } from "@/components/financial-cycle-nav";
import { useMemo, useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export type InsightP = { id: string; message: string; severity: string };
export type DProps = {
  userName: string;
  financialCycle: { startDate: string; endDate: string; label: string; year: number; month: number };
  isCurrentCycle: boolean;
  cycleNav: { prevParam: string; nextParam: string };
  realBalance: {
    totalIncomesCents: number;
    paidNonCreditExpensesCents: number;
    realBalanceCents: number;
  };
  kpi: {
    today: number;
    todayScheduled: number;
    last7: number;
    month: number;
    monthPending: number;
    monthOver: number;
    monthTotal: number;
    monthFixed: number;
    monthVariableApprox: number;
    cycleIncomes: number;
  };
  walletAgg: {
    creditUsed: number;
    creditAvail: number;
    currentInvoice: number;
    invoiceOutstanding: number;
    debitUsedOnCards: number;
    creditLimitTracked: number;
  };
  forecast: {
    daysLeftInMonth: number;
    projPaidMonthEnd: number;
    projCommitMonthEnd: number;
    upcoming14Cents: number;
    upcoming14Count: number;
    avgDailyPaid: number;
    projClassic: number;
  };
  monthBar: { thisMonth: number; lastMonth: number };
  daySeries: { d: string; c: number }[];
  byCat: Record<string, number>;
  byPerson: {
    person1: number;
    person2: number;
    both: number;
    p1: string;
    p2: string;
    children: { name: string; value: number }[];
  };
  goals: { id: string; name: string; targetCents: number; currentCents: number }[];
  recurring: {
    count: number;
    totalCents: number;
    items: { id: string; name: string; amountCents: number; dayOfMonth: number }[];
  };
  cardItems: {
    name: string;
    color: string;
    cardKind: string;
    used: number;
    limit: number;
    available: number;
    percent: number;
    debitUsedOnCard: number;
    currentInvoice: number;
    invoiceOutstanding: number;
  }[];
  totLimit: number;
  totAvail: number;
  totInvoice: number;
  topCat: { name: string; c: number } | null;
  topCard: { name: string; c: number } | null;
  insights: InsightP[];
  projection: { avg: number; proj: number };
  catLabels: Record<string, string>;
};

const CHART_PALETTE = ["#6366f1", "#a855f7", "#06b6d4", "#22c55e", "#f59e0b", "#ec4899", "#14b8a6", "#fb7185"];

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; payload?: { name?: string } }[]; label?: string | number }) {
  if (!active || !payload?.length) return null;
  const v = payload[0]?.value;
  const name = payload[0]?.payload?.name ?? label;
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 shadow-[var(--shadow-md)]">
      <p className="text-[10px] uppercase tracking-[0.1em] text-[var(--foreground-muted)]">{name}</p>
      <p className="text-sm font-semibold tabular text-[var(--foreground)] mt-0.5">{formatBRL(Number(v ?? 0))}</p>
    </div>
  );
}

export function DashboardView(p: DProps) {
  const {
    userName,
    financialCycle,
    isCurrentCycle,
    cycleNav,
    realBalance,
    kpi,
    walletAgg,
    forecast,
    monthBar,
    daySeries,
    byPerson,
    goals,
    recurring,
    totLimit,
    totAvail,
    totInvoice,
    topCat,
    topCard,
    insights,
    projection,
    catLabels,
    byCat,
    cardItems,
  } = p;

  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);

  const greeting = useMemo(
    () => (now ? greetingByHour(now.getHours()) : "Olá"),
    [now]
  );

  const monthDelta = monthBar.lastMonth
    ? ((monthBar.thisMonth - monthBar.lastMonth) / monthBar.lastMonth) * 100
    : 0;
  const monthDeltaPositive = monthDelta <= 0; // gastar menos é positivo
  const catData = Object.entries(byCat)
    .map(([id, value]) => ({ name: catLabels[id] ?? "—", value }))
    .filter((c) => c.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const personData = [
    { name: byPerson.p1, value: byPerson.person1, fill: CHART_PALETTE[0] },
    { name: byPerson.p2, value: byPerson.person2, fill: CHART_PALETTE[1] },
    { name: "Compartilhado", value: byPerson.both, fill: CHART_PALETTE[2] },
    ...byPerson.children.map((c, i) => ({
      name: c.name,
      value: c.value,
      fill: CHART_PALETTE[3 + (i % (CHART_PALETTE.length - 3))],
    })),
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-8">
      {/* Hero / Saudação */}
      <section className="space-y-1.5">
        <p className="caption uppercase tracking-[0.14em] text-[var(--foreground-subtle)]">
          {now
            ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "full" }).format(now)
            : "Hoje"}
        </p>
        <h1 className="h-display text-[var(--foreground)]">
          {greeting}, <span className="text-[var(--primary)]">{userName.split(" ")[0]}</span>.
        </h1>
        <p className="text-[15px] text-[var(--foreground-muted)] leading-relaxed">
          Ciclo {financialCycle.label} ({financialCycle.startDate.slice(8, 10)}/{financialCycle.startDate.slice(5, 7)} a{" "}
          {financialCycle.endDate.slice(8, 10)}/{financialCycle.endDate.slice(5, 7)}). Saldo real separado do limite de cartão.
        </p>
      </section>

      <FinancialCycleNav
        cycle={financialCycle}
        basePath="/"
        prevParam={cycleNav.prevParam}
        nextParam={cycleNav.nextParam}
        isCurrent={isCurrentCycle}
      />

      {!isCurrentCycle && (
        <Card className="border-[var(--primary-soft)] bg-[var(--primary-soft)]/20">
          <CardContent className="p-4 text-sm text-[var(--foreground-muted)]">
            Você está vendo o ciclo <strong className="text-[var(--foreground)]">{financialCycle.label}</strong>.
            Indicadores de &quot;hoje&quot; e previsões dos próximos 14 dias aparecem apenas no ciclo atual.
          </CardContent>
        </Card>
      )}

      {/* Saldo real + cartões */}
      <section className="grid lg:grid-cols-2 gap-4">
        <Card className="border-[var(--success)]/20 bg-[var(--success-bg)]/30">
          <CardContent className="p-5">
            <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--foreground-muted)]">Saldo disponível</p>
            <p className="mt-2 text-3xl font-semibold tabular text-[var(--foreground)]">
              {formatBRL(realBalance.realBalanceCents)}
            </p>
            <p className="mt-2 text-xs text-[var(--foreground-muted)]">
              Entradas {formatBRL(realBalance.totalIncomesCents)} − despesas e faturas pagas{" "}
              {formatBRL(realBalance.paidNonCreditExpensesCents)}
            </p>
            <p className="mt-1 text-xs text-[var(--foreground-muted)]">
              Entradas no ciclo: {formatBRL(kpi.cycleIncomes)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 space-y-3">
            <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--foreground-muted)]">Cartões de crédito</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-[var(--foreground-muted)] text-xs">Limite total</p>
                <p className="font-semibold tabular">{formatBRL(totLimit)}</p>
              </div>
              <div>
                <p className="text-[var(--foreground-muted)] text-xs">Usado (em aberto)</p>
                <p className="font-semibold tabular text-[var(--warning-strong)]">{formatBRL(walletAgg.creditUsed)}</p>
              </div>
              <div>
                <p className="text-[var(--foreground-muted)] text-xs">Disponível no cartão</p>
                <p className="font-semibold tabular text-[var(--success-strong)]">{formatBRL(totAvail)}</p>
              </div>
              <div>
                <p className="text-[var(--foreground-muted)] text-xs">Fatura atual</p>
                <p className="font-semibold tabular">{formatBRL(totInvoice)}</p>
              </div>
            </div>
            <p className="text-[11px] text-[var(--foreground-subtle)]">
              Limite e fatura não somam ao saldo da família.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* KPIs principais */}
      <section
        className={cn(
          "grid gap-3",
          isCurrentCycle ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-2 lg:grid-cols-3"
        )}
      >
        <KpiHero
          label="Pago no ciclo"
          value={kpi.month}
          tone="primary"
          icon={<Wallet className="h-4 w-4" />}
          delta={monthDelta}
          deltaPositive={monthDeltaPositive}
          deltaCaption={`vs ${formatBRL(monthBar.lastMonth)} ciclo anterior`}
        />
        {isCurrentCycle && (
          <KpiHero
            label="Pago hoje"
            value={kpi.today}
            icon={<Calendar className="h-4 w-4" />}
            subtitle="Despesas quitadas hoje"
          />
        )}
        <KpiHero
          label="Pendente no ciclo"
          value={kpi.monthPending}
          tone={kpi.monthPending > 0 ? "warning" : undefined}
          icon={<AlertCircle className="h-4 w-4" />}
          subtitle="Ainda a pagar neste ciclo"
        />
        <KpiHero
          label="Saldo real"
          value={realBalance.realBalanceCents}
          tone={realBalance.realBalanceCents >= 0 ? "success" : "danger"}
          icon={<Banknote className="h-4 w-4" />}
          subtitle="Dinheiro disponível (sem limite de cartão)"
        />
      </section>

      {/* KPIs detalhados */}
      <section className={cn(
        "grid gap-3",
        isCurrentCycle ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-5" : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
      )}>
        {isCurrentCycle && (
          <KpiHero
            label="Vence hoje"
            value={kpi.todayScheduled}
            icon={<CalendarClock className="h-4 w-4" />}
            subtitle="Comprometido (todas as despesas)"
          />
        )}
        <KpiHero
          label="Total no mês"
          value={kpi.monthTotal}
          icon={<Receipt className="h-4 w-4" />}
          subtitle="Pagas + pendentes + vencidas"
        />
        <KpiHero
          label="Gastos fixos (modelo)"
          value={kpi.monthFixed}
          icon={<HandCoins className="h-4 w-4" />}
          subtitle="Soma dos gastos fixos ativos"
        />
        <KpiHero
          label="Usado no crédito"
          value={walletAgg.creditUsed}
          icon={<CreditCardIcon className="h-4 w-4" />}
          subtitle="Fatura em aberto (não é saldo)"
        />
        <KpiHero
          label="Limite disponível"
          value={walletAgg.creditAvail}
          tone="success"
          icon={<TrendingUp className="h-4 w-4" />}
          subtitle={`Limite total ${formatBRL(walletAgg.creditLimitTracked)}`}
        />
      </section>

      {/* Previsões */}
      <Card className="border-[var(--border)] bg-[var(--surface)]">
        <CardHeader>
          <CardTitle>Previsões e compromissos</CardTitle>
          <CardDescription>
            Projeções pelo ritmo dos últimos dias e o que vence nos próximos 14 dias.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)]/50 p-4">
              <p className="text-[11px] uppercase tracking-[0.1em] text-[var(--foreground-muted)]">Dias restantes</p>
              <p className="mt-1 text-lg font-semibold tabular">{forecast.daysLeftInMonth}</p>
              <p className="text-[11px] text-[var(--foreground-subtle)] mt-1">até o último dia do mês (aprox.)</p>
            </div>
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)]/50 p-4">
              <p className="text-[11px] uppercase tracking-[0.1em] text-[var(--foreground-muted)]">Projeção (pagos)</p>
              <p className="mt-1 text-lg font-semibold tabular">{formatBRL(forecast.projPaidMonthEnd)}</p>
              <p className="text-[11px] text-[var(--foreground-subtle)] mt-1">se o ritmo de pagos continuar</p>
            </div>
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)]/50 p-4">
              <p className="text-[11px] uppercase tracking-[0.1em] text-[var(--foreground-muted)]">Projeção (todas despesas)</p>
              <p className="mt-1 text-lg font-semibold tabular">{formatBRL(forecast.projCommitMonthEnd)}</p>
              <p className="text-[11px] text-[var(--foreground-subtle)] mt-1">volume do mês extrapolado</p>
            </div>
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)]/50 p-4">
              <p className="text-[11px] uppercase tracking-[0.1em] text-[var(--foreground-muted)]">Próximos 14 dias</p>
              <p className="mt-1 text-lg font-semibold tabular">{formatBRL(forecast.upcoming14Cents)}</p>
              <p className="text-[11px] text-[var(--foreground-subtle)] mt-1">
                {forecast.upcoming14Count} despesa(s) a vencer
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs text-[var(--foreground-muted)]">
            <span>
              Média/dia (pagos): <strong className="text-[var(--foreground)] tabular">{formatBRL(Math.round(forecast.avgDailyPaid))}</strong>
            </span>
            <span>
              Projeção clássica (mês): <strong className="text-[var(--foreground)] tabular">{formatBRL(Math.round(forecast.projClassic))}</strong>
            </span>
            <span>
              Débito nos cartões: <strong className="text-[var(--foreground)] tabular">{formatBRL(walletAgg.debitUsedOnCards)}</strong>
            </span>
            <span>
              Volume variável no mês (aprox.):{" "}
              <strong className="text-[var(--foreground)] tabular">{formatBRL(kpi.monthVariableApprox)}</strong>
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Alertas vencidos */}
      {kpi.monthOver > 0 && (
        <Card className="border-[var(--danger-soft)] bg-[var(--danger-bg)]">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--danger-soft)] text-[var(--danger)]">
              <AlertCircle className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-[var(--danger-strong)]">
                Vocês têm {formatBRL(kpi.monthOver)} em despesas vencidas
              </p>
              <p className="text-xs text-[var(--danger-strong)]/80">Resolva o quanto antes para evitar juros.</p>
            </div>
            <Link href="/despesas" className="text-xs font-semibold text-[var(--danger-strong)] hover:underline">
              Ver despesas →
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      <section className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Gastos por categoria</CardTitle>
              <CardDescription>Mês corrente · top {catData.length}</CardDescription>
            </div>
            {topCat && (
              <Badge variant="primary" dot>
                #1 {topCat.name}
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            {catData.length ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={catData} margin={{ top: 8, right: 8, left: 0, bottom: 36 }}>
                    <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="3 6" vertical={false} />
                    <XAxis
                      dataKey="name"
                      fontSize={10}
                      angle={-22}
                      textAnchor="end"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "var(--foreground-muted)" }}
                    />
                    <YAxis
                      width={56}
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "var(--foreground-muted)" }}
                      tickFormatter={(n) => `R$${Math.round((n as number) / 100)}`}
                    />
                    <Tooltip cursor={{ fill: "var(--surface-muted)" }} content={<ChartTooltip />} />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                      {catData.map((_, i) => (
                        <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState
                icon={<Sparkles className="h-5 w-5" />}
                title="Sem despesas no mês"
                description="Cadastre uma despesa para ver a distribuição por categoria."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Por pessoa</CardTitle>
              <CardDescription>Mês corrente</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {personData.length ? (
              <>
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={personData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={48}
                        outerRadius={72}
                        paddingAngle={3}
                        stroke="var(--surface)"
                        strokeWidth={3}
                      >
                        {personData.map((e, i) => (
                          <Cell key={i} fill={e.fill} />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3 space-y-2">
                  {personData.map((d) => {
                    const total = personData.reduce((acc, x) => acc + x.value, 0);
                    const pct = total ? Math.round((d.value / total) * 100) : 0;
                    return (
                      <div key={d.name} className="flex items-center gap-2 text-xs">
                        <span className="h-2 w-2 rounded-full" style={{ background: d.fill }} />
                        <span className="text-[var(--foreground-muted)] flex-1 truncate">{d.name}</span>
                        <span className="tabular text-[var(--foreground)] font-medium">{formatBRL(d.value)}</span>
                        <span className="tabular text-[var(--foreground-subtle)] w-9 text-right">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <p className="text-xs text-[var(--foreground-muted)] py-8 text-center">Sem dados.</p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Evolução semanal</CardTitle>
              <CardDescription>Pagos nos últimos 7 dias</CardDescription>
            </div>
            <Badge variant={monthDeltaPositive ? "success" : "warning"} dot>
              {monthDeltaPositive ? "Tendência boa" : "Atenção"}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={daySeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="lineFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="3 6" vertical={false} />
                  <XAxis dataKey="d" fontSize={10} tickLine={false} axisLine={false} tick={{ fill: "var(--foreground-muted)" }} />
                  <YAxis
                    width={56}
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "var(--foreground-muted)" }}
                    tickFormatter={(n) => `R$${Math.round((n as number) / 100)}`}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="c"
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    dot={{ r: 0 }}
                    activeDot={{ r: 5, strokeWidth: 0, fill: "#4f46e5" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Mês a mês</CardTitle>
              <CardDescription>Comparativo de pagos</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { n: "Anterior", v: monthBar.lastMonth },
                    { n: "Atual", v: monthBar.thisMonth },
                  ]}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="3 6" vertical={false} />
                  <XAxis dataKey="n" fontSize={11} tickLine={false} axisLine={false} tick={{ fill: "var(--foreground-muted)" }} />
                  <YAxis
                    width={56}
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "var(--foreground-muted)" }}
                    tickFormatter={(n) => `R$${Math.round((n as number) / 100)}`}
                  />
                  <Tooltip cursor={{ fill: "var(--surface-muted)" }} content={<ChartTooltip />} />
                  <Bar dataKey="v" radius={[10, 10, 0, 0]}>
                    <Cell fill="#cbd5e1" />
                    <Cell fill="#6366f1" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Cartões */}
      {cardItems.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="h2">Cartões de crédito</h2>
              <p className="text-xs text-[var(--foreground-muted)] mt-0.5">
                Limite {formatBRL(totLimit)} · em aberto {formatBRL(walletAgg.creditUsed)} · disponível no cartão{" "}
                {formatBRL(totAvail)} · fatura do ciclo {formatBRL(totInvoice)}
              </p>
            </div>
            <Link href="/cartoes" className="text-xs font-semibold text-[var(--primary)] hover:underline inline-flex items-center gap-1">
              Ver tudo <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {cardItems.slice(0, 4).map((row) => {
              const lvl = cardAlertLevel(row.limit > 0 ? row.percent : 0);
              const tone = lvl === "critical" ? "danger" : lvl === "high" ? "warning" : "primary";
              const barPct = row.limit > 0 ? row.percent : 0;
              return (
                <Card key={row.name} hover className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ background: row.color }} />
                        <p className="font-semibold text-sm tracking-tight truncate">{row.name}</p>
                        <Badge variant="info" className="text-[10px] font-medium">
                          {cardKindLabel(row.cardKind)}
                        </Badge>
                      </div>
                      <p className="mt-1.5 text-[11px] text-[var(--foreground-muted)] leading-relaxed">
                        <span className="tabular">Crédito faturado {formatBRL(row.used)}</span>
                        {row.limit > 0 && (
                          <>
                            {" · "}
                            <span className="tabular">limite {formatBRL(row.limit)}</span>
                          </>
                        )}
                      </p>
                    </div>
                    {row.limit > 0 && (
                      <Badge variant={tone} dot>
                        {barPct}%
                      </Badge>
                    )}
                  </div>
                  {row.limit > 0 && (
                    <div>
                      <Progress value={barPct} tone={tone} />
                    </div>
                  )}
                  <dl className="space-y-1.5 text-[11px]">
                    <div className="flex justify-between gap-2">
                      <dt className="text-[var(--foreground-muted)]">Limite disponível</dt>
                      <dd className="tabular font-medium text-[var(--foreground)]">{formatBRL(row.available)}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-[var(--foreground-muted)]">Fatura atual</dt>
                      <dd className="tabular font-medium text-[var(--foreground)]">{formatBRL(row.currentInvoice)}</dd>
                    </div>
                    {row.debitUsedOnCard > 0 && (
                      <div className="flex justify-between gap-2">
                        <dt className="text-[var(--foreground-muted)]">Gasto no débito</dt>
                        <dd className="tabular font-medium text-[var(--foreground)]">{formatBRL(row.debitUsedOnCard)}</dd>
                      </div>
                    )}
                    <div className="flex justify-between gap-2 pt-1.5 border-t border-[var(--border-subtle)] items-baseline">
                      <dt className="text-[var(--foreground-muted)] font-medium">Em aberto</dt>
                      <dd className="tabular font-semibold text-[var(--warning-strong)] text-sm">{formatBRL(row.used)}</dd>
                    </div>
                  </dl>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* Insights */}
      <section className="space-y-3">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="h2 inline-flex items-center gap-2">
              <Lightbulb className="h-[18px] w-[18px] text-[var(--primary)]" />
              Resumo inteligente
            </h2>
            <p className="text-xs text-[var(--foreground-muted)] mt-0.5">
              Padrões que detectamos pra ajudar vocês a decidir
            </p>
          </div>
        </div>
        {insights.length === 0 ? (
          <EmptyState
            icon={<Lightbulb className="h-5 w-5" />}
            title="Ainda gerando insights"
            description="Cadastre algumas despesas e cartões — em pouco tempo aparecem dicas personalizadas aqui."
          />
        ) : (
          <ul className="grid md:grid-cols-2 gap-3">
            {insights.map((i) => (
              <InsightCard key={i.id} message={i.message} severity={i.severity} />
            ))}
          </ul>
        )}
      </section>

      {/* Gastos recorrentes */}
      <section className="space-y-3">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="h2 inline-flex items-center gap-2">
              <HandCoins className="h-[18px] w-[18px] text-[var(--primary)]" />
              Gastos recorrentes
            </h2>
            <p className="text-xs text-[var(--foreground-muted)] mt-0.5">
              {recurring.count > 0
                ? `${formatBRL(recurring.totalCents)}/mês em ${recurring.count} compromisso(s) · gerados automaticamente`
                : "Cadastre contas fixas para gerar despesas todo mês"}
            </p>
          </div>
          <Link href="/gastos-fixos" className="text-xs font-semibold text-[var(--primary)] hover:underline inline-flex items-center gap-1">
            Gerenciar <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {recurring.count === 0 ? (
          <EmptyState
            icon={<HandCoins className="h-5 w-5" />}
            title="Sem recorrentes"
            description="Aluguel, internet, plano de saúde… cadastre uma vez e o app lança a despesa todo mês."
            action={
              <Link href="/gastos-fixos/novo" className="text-sm font-semibold text-[var(--primary)] hover:underline">
                Cadastrar recorrente
              </Link>
            }
          />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {recurring.items.slice(0, 8).map((r) => (
              <Card key={r.id} hover className="p-4">
                <p className="font-semibold text-sm tracking-tight truncate">{r.name}</p>
                <p className="mt-1 text-[11px] text-[var(--foreground-muted)]">Vence dia {r.dayOfMonth}</p>
                <p className="mt-2 text-base font-semibold tabular">{formatBRL(r.amountCents)}</p>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Cofrinhos */}
      <section className="space-y-3">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="h2 inline-flex items-center gap-2">
              <PiggyBank className="h-[18px] w-[18px] text-[var(--primary)]" />
              Cofrinhos
            </h2>
            <p className="text-xs text-[var(--foreground-muted)] mt-0.5">Metas em andamento</p>
          </div>
          <Link href="/cofrinhos" className="text-xs font-semibold text-[var(--primary)] hover:underline inline-flex items-center gap-1">
            Ver todos <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {goals.length === 0 ? (
          <EmptyState
            icon={<PiggyBank className="h-5 w-5" />}
            title="Sem metas ainda"
            description="Definam um objetivo juntos: viagem, reserva, casa nova… e acompanhem o progresso."
            action={
              <Link href="/cofrinhos/nova" className="text-sm font-semibold text-[var(--primary)] hover:underline">
                Criar primeira meta
              </Link>
            }
          />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {goals.slice(0, 6).map((g) => {
              const pct = g.targetCents ? Math.min(100, (g.currentCents / g.targetCents) * 100) : 0;
              return (
                <Card key={g.id} hover className="p-5">
                  <p className="font-semibold tracking-tight text-[var(--foreground)] truncate">{g.name}</p>
                  <p className="mt-1 text-xs text-[var(--foreground-muted)] tabular">
                    {formatBRL(g.currentCents)} de {formatBRL(g.targetCents)}
                  </p>
                  <div className="mt-3">
                    <Progress value={pct} tone={pct >= 75 ? "success" : "primary"} />
                    <p className="mt-1.5 text-[11px] tabular text-[var(--foreground-muted)]">{Math.round(pct)}% concluído</p>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Resumo rápido */}
      <Card className="bg-[var(--surface-muted)]/40">
        <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs text-[var(--foreground-muted)]">Média/dia (pagos) · atalho</p>
              <p className="text-base font-semibold tabular">{formatBRL(Math.round(projection.avg))}</p>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-xs text-[var(--foreground-muted)]">Projeção clássica (só pagos)</p>
            <p className="text-base font-semibold tabular text-[var(--foreground)]">
              ~ {formatBRL(Math.round(projection.proj))}
            </p>
          </div>
          {topCard && (
            <div className="text-left sm:text-right">
              <p className="text-xs text-[var(--foreground-muted)]">Cartão mais movimentado (mês)</p>
              <p className="text-base font-semibold tabular truncate max-w-[200px]">{topCard.name}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KpiHero({
  label,
  value,
  subtitle,
  icon,
  delta,
  deltaPositive,
  deltaCaption,
  tone,
}: {
  label: string;
  value: number;
  subtitle?: string;
  icon?: React.ReactNode;
  delta?: number;
  deltaPositive?: boolean;
  deltaCaption?: string;
  tone?: "primary" | "success" | "warning" | "danger";
}) {
  const toneRing: Record<string, string> = {
    primary: "bg-[var(--primary-soft)] text-[var(--primary)]",
    success: "bg-[var(--success-soft)] text-[var(--success-strong)]",
    warning: "bg-[var(--warning-soft)] text-[var(--warning-strong)]",
    danger: "bg-[var(--danger-soft)] text-[var(--danger-strong)]",
  };
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        {icon && (
          <div className={cn("grid h-9 w-9 place-items-center rounded-xl", toneRing[tone ?? "primary"])}>
            {icon}
          </div>
        )}
        {typeof delta === "number" && Math.abs(delta) > 0.5 && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-[11px] font-semibold tabular tracking-tight",
              deltaPositive ? "text-[var(--success)]" : "text-[var(--danger)]"
            )}
          >
            {deltaPositive ? <ArrowDownRight className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
            {Math.abs(delta).toFixed(0)}%
          </span>
        )}
      </div>
      <p className="mt-3 text-[11px] uppercase tracking-[0.1em] font-medium text-[var(--foreground-muted)]">{label}</p>
      <p className="mt-1 text-[22px] sm:text-[24px] font-semibold tracking-[-0.02em] tabular text-[var(--foreground)]">
        {formatBRL(value)}
      </p>
      {(subtitle || deltaCaption) && (
        <p className="mt-1 text-[11px] text-[var(--foreground-subtle)] truncate">{subtitle ?? deltaCaption}</p>
      )}
    </Card>
  );
}

function InsightCard({ message, severity }: { message: string; severity: string }) {
  const map: Record<string, { tone: "success" | "warning" | "danger" | "info"; bg: string; ring: string }> = {
    danger:  { tone: "danger",  bg: "bg-[var(--danger-bg)]",  ring: "border-[var(--danger-soft)]" },
    warning: { tone: "warning", bg: "bg-[var(--warning-bg)]", ring: "border-[var(--warning-soft)]" },
    success: { tone: "success", bg: "bg-[var(--success-bg)]", ring: "border-[var(--success-soft)]" },
    info:    { tone: "info",    bg: "bg-[var(--info-bg)]",    ring: "border-[var(--info-soft)]" },
  };
  const m = map[severity] ?? map.info;
  return (
    <li className={cn("rounded-2xl border p-4 flex items-start gap-3", m.bg, m.ring)}>
      <div
        className={cn(
          "grid h-8 w-8 place-items-center rounded-xl shrink-0",
          m.tone === "success" && "bg-[var(--success-soft)] text-[var(--success-strong)]",
          m.tone === "warning" && "bg-[var(--warning-soft)] text-[var(--warning-strong)]",
          m.tone === "danger"  && "bg-[var(--danger-soft)] text-[var(--danger-strong)]",
          m.tone === "info"    && "bg-[var(--info-soft)] text-[var(--info-strong)]"
        )}
      >
        <Lightbulb className="h-4 w-4" />
      </div>
      <p className="text-sm leading-relaxed text-[var(--foreground)]">{message}</p>
    </li>
  );
}
