"use client";

import { formatBRL } from "@/lib/money";
import { cardAlertLevel, usagePercent } from "@/lib/metrics";
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
  Calendar,
  CreditCard as CreditCardIcon,
  Lightbulb,
  PiggyBank,
  Sparkles,
  TrendingUp,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/progress";
import { useMemo, useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export type InsightP = { id: string; message: string; severity: string };
export type DProps = {
  userName: string;
  kpi: {
    today: number;
    last7: number;
    month: number;
    monthPending: number;
    monthOver: number;
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
  cardItems: {
    name: string;
    color: string;
    used: number;
    limit: number;
    available: number;
    percent: number;
  }[];
  totLimit: number;
  totAvail: number;
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
    userName, kpi, monthBar, daySeries, byPerson, goals, totLimit, totAvail,
    topCat, topCard, insights, projection, catLabels, byCat, cardItems,
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
  const usagePct = totLimit ? Math.round(((totLimit - totAvail) / totLimit) * 100) : 0;

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
        <p className="text-[15px] text-[var(--foreground-muted)] leading-relaxed max-w-xl">
          Aqui está como vocês estão indo no mês — pago, pendente e o que está por vir.
        </p>
      </section>

      {/* KPIs hero */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiHero
          label="Pago no mês"
          value={kpi.month}
          tone="primary"
          icon={<Wallet className="h-4 w-4" />}
          delta={monthDelta}
          deltaPositive={monthDeltaPositive}
          deltaCaption={`vs ${formatBRL(monthBar.lastMonth)} mês anterior`}
        />
        <KpiHero
          label="Hoje"
          value={kpi.today}
          icon={<Calendar className="h-4 w-4" />}
          subtitle="Últimas 24h"
        />
        <KpiHero
          label="Pendente"
          value={kpi.monthPending}
          tone={kpi.monthPending > 0 ? "warning" : undefined}
          icon={<AlertCircle className="h-4 w-4" />}
          subtitle="A vencer no mês"
        />
        <KpiHero
          label="Disponível em cartões"
          value={totAvail}
          tone="success"
          icon={<CreditCardIcon className="h-4 w-4" />}
          subtitle={totLimit ? `${100 - usagePct}% do limite total` : "Sem cartões"}
        />
      </section>

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
              <h2 className="h2">Uso de cartões</h2>
              <p className="text-xs text-[var(--foreground-muted)] mt-0.5">
                Limite total {formatBRL(totLimit)} · disponível {formatBRL(totAvail)}
              </p>
            </div>
            <Link href="/cartoes" className="text-xs font-semibold text-[var(--primary)] hover:underline inline-flex items-center gap-1">
              Ver tudo <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {cardItems.slice(0, 4).map((row) => {
              const lvl = cardAlertLevel(usagePercent(row.used, row.limit));
              const tone = lvl === "critical" ? "danger" : lvl === "high" ? "warning" : "primary";
              return (
                <Card key={row.name} hover className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ background: row.color }} />
                        <p className="font-semibold text-sm tracking-tight truncate">{row.name}</p>
                      </div>
                      <p className="mt-1 text-xs text-[var(--foreground-muted)] tabular">
                        {formatBRL(row.used)} de {formatBRL(row.limit)}
                      </p>
                    </div>
                    <Badge variant={tone} dot>
                      {row.percent}%
                    </Badge>
                  </div>
                  <div className="mt-3">
                    <Progress value={row.percent} tone={tone} />
                  </div>
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

      {/* Projeção */}
      <Card className="bg-[var(--surface-muted)]/40">
        <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs text-[var(--foreground-muted)]">Média de gasto/dia (pagos)</p>
              <p className="text-base font-semibold tabular">{formatBRL(Math.round(projection.avg))}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-[var(--foreground-muted)]">Projeção do mês</p>
            <p className="text-base font-semibold tabular text-[var(--foreground)]">~ {formatBRL(Math.round(projection.proj))}</p>
          </div>
          {topCard && (
            <div className="text-right hidden sm:block">
              <p className="text-xs text-[var(--foreground-muted)]">Cartão mais usado</p>
              <p className="text-base font-semibold tabular">{topCard.name}</p>
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
