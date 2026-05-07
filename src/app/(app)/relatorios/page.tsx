import { getSession } from "@/lib/auth/session";
import { getDashboardData, loadCoupleLabels } from "@/lib/data/stats";
import { listChildrenByCouple } from "@/lib/data/children";
import { childResponsibleValue } from "@/lib/responsible";
import { formatBRL } from "@/lib/money";
import { redirect } from "next/navigation";
import { ArrowDownRight, ArrowUpRight, Users, Wallet, AlertCircle, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Avatar } from "@/components/ui/avatar";

export default async function RelatoriosPage() {
  const s = await getSession();
  if (!s) redirect("/login");
  const d = await getDashboardData(s.user.coupleId);
  const labels = await loadCoupleLabels(s.user.coupleId);
  const children = await listChildrenByCouple(s.user.coupleId);

  const delta = d.monthBar.lastMonth
    ? ((d.monthBar.thisMonth - d.monthBar.lastMonth) / d.monthBar.lastMonth) * 100
    : 0;
  const positive = delta <= 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Análise"
        title="Relatórios"
        description="Resumo do mês corrente. Mais filtros e exportações em breve."
      />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <BigStat
          label="Pago no mês"
          value={formatBRL(d.kpi.month)}
          icon={<Wallet className="h-4 w-4" />}
          tone="primary"
        />
        <BigStat
          label="Pendente"
          value={formatBRL(d.kpi.monthPending)}
          icon={<AlertCircle className="h-4 w-4" />}
          tone={d.kpi.monthPending > 0 ? "warning" : "neutral"}
        />
        <BigStat
          label="Vencido"
          value={formatBRL(d.kpi.monthOver)}
          icon={<AlertCircle className="h-4 w-4" />}
          tone={d.kpi.monthOver > 0 ? "danger" : "neutral"}
        />
        <BigStat
          label="vs mês anterior"
          value={`${positive ? "−" : "+"}${Math.abs(delta).toFixed(1)}%`}
          icon={positive ? <ArrowDownRight className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
          tone={positive ? "success" : "warning"}
          subtitle={`${formatBRL(d.monthBar.thisMonth)} vs ${formatBRL(d.monthBar.lastMonth)}`}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <Avatar name={labels.p1} size="md" />
            <div className="min-w-0 flex-1">
              <p className="caption uppercase tracking-[0.1em]">{labels.p1}</p>
              <p className="text-xl font-semibold tabular tracking-tight mt-0.5">
                {formatBRL(d.persons.by.person1)}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <Avatar name={labels.p2} size="md" />
            <div className="min-w-0 flex-1">
              <p className="caption uppercase tracking-[0.1em]">{labels.p2}</p>
              <p className="text-xl font-semibold tabular tracking-tight mt-0.5">
                {formatBRL(d.persons.by.person2)}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-grad-cyan text-white shadow-[var(--shadow-xs)]">
              <Users className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="caption uppercase tracking-[0.1em]">Compartilhado</p>
              <p className="text-xl font-semibold tabular tracking-tight mt-0.5">
                {formatBRL(d.persons.by.both)}
              </p>
            </div>
          </div>
        </Card>
        {children.map((ch) => (
          <Card key={ch.id} className="p-5">
            <div className="flex items-center gap-3">
              <Avatar name={ch.name} size="md" />
              <div className="min-w-0 flex-1">
                <p className="caption uppercase tracking-[0.1em]">{ch.name}</p>
                <p className="text-xl font-semibold tabular tracking-tight mt-0.5">
                  {formatBRL(d.persons.by[childResponsibleValue(ch.id)] ?? 0)}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-5 bg-[var(--surface-muted)]/40">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div>
              <p className="caption uppercase tracking-[0.1em]">Projeção do mês</p>
              <p className="text-base font-semibold tabular">~ {formatBRL(Math.round(d.projection.proj))}</p>
            </div>
          </div>
          <p className="text-xs text-[var(--foreground-muted)]">
            Com base na média diária de {formatBRL(Math.round(d.projection.avg))}.
          </p>
        </div>
      </Card>
    </div>
  );
}

function BigStat({
  label,
  value,
  icon,
  tone,
  subtitle,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone: "primary" | "success" | "warning" | "danger" | "neutral";
  subtitle?: string;
}) {
  const map = {
    primary: "bg-[var(--primary-soft)] text-[var(--primary)]",
    success: "bg-[var(--success-soft)] text-[var(--success-strong)]",
    warning: "bg-[var(--warning-soft)] text-[var(--warning-strong)]",
    danger:  "bg-[var(--danger-soft)] text-[var(--danger-strong)]",
    neutral: "bg-[var(--surface-muted)] text-[var(--foreground-muted)]",
  } as const;
  return (
    <Card className="p-5">
      <div className={`grid h-9 w-9 place-items-center rounded-xl ${map[tone]}`}>{icon}</div>
      <p className="mt-3 caption uppercase tracking-[0.1em]">{label}</p>
      <p className="mt-0.5 text-xl font-semibold tabular tracking-tight">{value}</p>
      {subtitle && <p className="mt-1 text-[11px] text-[var(--foreground-subtle)] truncate">{subtitle}</p>}
    </Card>
  );
}
