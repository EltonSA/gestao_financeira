import { getSession } from "@/lib/auth/session";
import { db, schema } from "@/lib/db";
import { and, eq } from "drizzle-orm";
import { formatBRL } from "@/lib/money";
import { generateRecurringForMonthFormAction } from "@/actions/recurring";
import { currentYearMonth } from "@/lib/services/recurringSync";
import { redirect } from "next/navigation";
import { PAYMENT_METHODS } from "@/lib/constants";
import Link from "next/link";
import { HandCoins, Pencil, Plus, RefreshCw, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

export default async function GastosFixosPage() {
  const s = await getSession();
  if (!s) redirect("/login");
  const ym = currentYearMonth();
  const recs = await db
    .select()
    .from(schema.recurringExpenses)
    .where(and(eq(schema.recurringExpenses.coupleId, s.user.coupleId)));

  const active = recs.filter((r) => r.isActive);
  const total = active.reduce((acc, r) => acc + r.amountCents, 0);
  const generatedThisMonth = active.filter((r) => r.lastGeneratedYearMonth === ym).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Compromissos mensais"
        title="Gastos recorrentes"
        description="Aluguel, internet, assinaturas… Os modelos geram despesas automaticamente no início de cada mês (ao abrir o app)."
        action={
          <div className="flex flex-col sm:flex-row gap-2">
            <Button asChild variant="secondary" leftIcon={<Plus className="h-4 w-4" />}>
              <Link href="/gastos-fixos/novo">Novo recorrente</Link>
            </Button>
            <form action={generateRecurringForMonthFormAction}>
              <Button type="submit" variant="ghost" leftIcon={<Wand2 className="h-4 w-4" />}>
                Gerar agora
              </Button>
            </form>
          </div>
        }
      />

      {recs.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Modelos ativos" value={String(active.length).padStart(2, "0")} />
          <Stat label="Total mensal" value={formatBRL(total)} />
          <Stat label="Gerados este mês" value={`${generatedThisMonth}/${active.length}`} />
          <Stat label="Automático" value="Sim" hint="Ao entrar no app" />
        </div>
      )}

      {recs.length === 0 ? (
        <EmptyState
          icon={<HandCoins className="h-5 w-5" />}
          title="Nenhum gasto recorrente"
          description="Cadastre aluguel, internet, academia ou outras contas fixas. Elas viram despesas pendentes todo mês, sem precisar lançar de novo."
          action={
            <Button asChild leftIcon={<Plus className="h-4 w-4" />}>
              <Link href="/gastos-fixos/novo">Cadastrar primeiro</Link>
            </Button>
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--surface-muted)]/50 border-b border-[var(--border)]">
                <tr className="text-left">
                  <th className="px-4 py-3 text-[11px] uppercase tracking-[0.08em] font-semibold text-[var(--foreground-muted)]">Nome</th>
                  <th className="px-4 py-3 text-[11px] uppercase tracking-[0.08em] font-semibold text-[var(--foreground-muted)] text-right">Valor</th>
                  <th className="px-4 py-3 text-[11px] uppercase tracking-[0.08em] font-semibold text-[var(--foreground-muted)]">Vence dia</th>
                  <th className="px-4 py-3 text-[11px] uppercase tracking-[0.08em] font-semibold text-[var(--foreground-muted)]">Forma</th>
                  <th className="px-4 py-3 text-[11px] uppercase tracking-[0.08em] font-semibold text-[var(--foreground-muted)]">Este mês</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {recs.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--surface-muted)]/40 transition"
                  >
                    <td className="px-4 py-3.5 font-medium text-[var(--foreground)]">
                      <span className="inline-flex items-center gap-2">
                        {r.name}
                        {!r.isActive && (
                          <Badge variant="info">Inativo</Badge>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 tabular text-right font-semibold">{formatBRL(r.amountCents)}</td>
                    <td className="px-4 py-3.5 text-[var(--foreground-muted)]">Dia {r.dayOfMonth}</td>
                    <td className="px-4 py-3.5 text-[var(--foreground-muted)]">
                      {PAYMENT_METHODS.find((p) => p.value === r.paymentMethod)?.label}
                    </td>
                    <td className="px-4 py-3.5">
                      {r.isActive && r.lastGeneratedYearMonth === ym ? (
                        <Badge variant="success" dot>Gerada</Badge>
                      ) : r.isActive ? (
                        <Badge variant="warning">Pendente</Badge>
                      ) : (
                        <span className="text-[var(--foreground-subtle)]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Button asChild size="icon-sm" variant="ghost" title="Editar">
                        <Link href={`/gastos-fixos/${r.id}/editar`}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="md:hidden divide-y divide-[var(--border-subtle)]">
            {recs.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/gastos-fixos/${r.id}/editar`}
                  className="flex items-start gap-3 p-4 hover:bg-[var(--surface-muted)]/40 transition"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-[var(--foreground)] truncate">{r.name}</p>
                    <p className="text-[11px] text-[var(--foreground-muted)] mt-0.5">
                      Dia {r.dayOfMonth} · {PAYMENT_METHODS.find((p) => p.value === r.paymentMethod)?.label}
                    </p>
                    {r.isActive && r.lastGeneratedYearMonth === ym && (
                      <p className="text-[11px] text-[var(--success-strong)] mt-1 inline-flex items-center gap-1">
                        <RefreshCw className="h-3 w-3" /> Despesa gerada este mês
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold tabular text-sm">{formatBRL(r.amountCents)}</p>
                  </div>
                  <Pencil className="h-4 w-4 text-[var(--foreground-subtle)] shrink-0 mt-1" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="text-[11px] uppercase tracking-[0.1em] font-medium text-[var(--foreground-muted)]">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular tracking-tight text-[var(--foreground)]">{value}</p>
      {hint && <p className="text-[10px] text-[var(--foreground-subtle)] mt-0.5">{hint}</p>}
    </div>
  );
}
