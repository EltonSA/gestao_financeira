import { getSession } from "@/lib/auth/session";
import { resolveFinancialCycleContext } from "@/lib/data/stats";
import { listOpenInvoicesForCouple } from "@/lib/services/cardInvoice";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { formatBRL } from "@/lib/money";
import { formatDateBRFromISO, getEffectiveStatus } from "@/lib/dates";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CalendarDays, CreditCard as CreditCardIcon, PiggyBank } from "lucide-react";
import { Badge, STATUS_BADGE } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { FinancialCycleNav } from "@/components/financial-cycle-nav";

export default async function CalendarioPage({
  searchParams,
}: { searchParams: Promise<{ ciclo?: string }> }) {
  const s = await getSession();
  if (!s) redirect("/login");
  const { ciclo } = await searchParams;
  const cycleCtx = await resolveFinancialCycleContext(s.user.coupleId, ciclo);
  const cycle = cycleCtx.cycle;
  const [ex, cards, goals, openInvoices] = await Promise.all([
    db.select().from(schema.expenses).where(eq(schema.expenses.coupleId, s.user.coupleId)),
    db.select().from(schema.cards).where(eq(schema.cards.coupleId, s.user.coupleId)),
    db.select().from(schema.goals).where(eq(schema.goals.coupleId, s.user.coupleId)),
    listOpenInvoicesForCouple(s.user.coupleId),
  ]);
  const cardById = Object.fromEntries(cards.map((c) => [c.id, c]));
  const upcoming = ex
    .filter(
      (e) =>
        (e.status === "pending" || e.status === "overdue") &&
        e.dueDate >= cycle.startDate &&
        e.dueDate <= cycle.endDate
    )
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 30);
  const goalsWithDue = goals.filter((g) => g.dueDate);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Agenda"
        title="Calendário financeiro"
        description={`Ciclo ${cycle.label} (${formatDateBRFromISO(cycle.startDate)} a ${formatDateBRFromISO(cycle.endDate)}).`}
      />

      <FinancialCycleNav
        cycle={cycle}
        basePath="/calendario"
        prevParam={cycleCtx.prevParam}
        nextParam={cycleCtx.nextParam}
        isCurrent={cycleCtx.isCurrentCycle}
      />

      {openInvoices.length > 0 && (
        <Card className="border-[var(--warning-soft)]">
          <CardHeader>
            <CardTitle className="text-base">Faturas em aberto</CardTitle>
            <CardDescription>Pagamento reduz o saldo real — não o limite total do cartão.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {openInvoices.map((inv) => {
                const card = cardById[inv.cardId];
                const open = Math.max(0, inv.totalAmountCents - inv.paidAmountCents);
                return (
                  <li key={inv.id} className="flex flex-wrap items-center gap-2 justify-between rounded-xl border border-[var(--border-subtle)] p-3">
                    <div>
                      <p className="text-sm font-medium">{card?.name ?? "Cartão"}</p>
                      <p className="text-[11px] text-[var(--foreground-muted)]">
                        Vence {formatDateBRFromISO(inv.dueDate)} · {inv.status}
                      </p>
                    </div>
                    <p className="font-semibold tabular">{formatBRL(open)}</p>
                    <Link href="/cartoes" className="text-xs text-[var(--primary)] font-medium hover:underline">
                      Pagar em Cartões
                    </Link>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <div>
              <CardTitle className="inline-flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-[var(--primary)]" /> Próximos vencimentos
              </CardTitle>
              <CardDescription>Despesas pendentes no ciclo financeiro atual</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <EmptyState
                icon={<CalendarDays className="h-5 w-5" />}
                title="Tudo em dia"
                description="Nenhuma despesa pendente nas próximas datas."
              />
            ) : (
              <ul className="divide-y divide-[var(--border-subtle)]">
                {upcoming.map((e) => {
                  const eff = getEffectiveStatus(e.dueDate, e.status);
                  const meta = STATUS_BADGE[eff] ?? STATUS_BADGE.pending;
                  return (
                    <li key={e.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="grid shrink-0 h-10 w-10 place-items-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
                        <CalendarDays className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[var(--foreground)]">{e.title}</p>
                        <p className="text-[11px] text-[var(--foreground-muted)] tabular">{formatDateBRFromISO(e.dueDate)}</p>
                      </div>
                      <p className="tabular text-sm font-semibold">{formatBRL(e.amountCents)}</p>
                      <Badge variant={meta.variant} dot>{meta.label}</Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div>
                <CardTitle className="inline-flex items-center gap-2">
                  <CreditCardIcon className="h-4 w-4 text-[var(--primary)]" /> Cartões
                </CardTitle>
                <CardDescription>Fechamento e vencimento (todo mês)</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {cards.length === 0 ? (
                <p className="text-xs text-[var(--foreground-muted)] py-4 text-center">Nenhum cartão.</p>
              ) : (
                <ul className="space-y-2">
                  {cards.map((c) => (
                    <li
                      key={c.id}
                      className="flex items-center gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)]/40 p-3"
                    >
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />
                      <p className="flex-1 text-sm font-medium truncate">{c.name}</p>
                      <p className="text-[11px] text-[var(--foreground-muted)] tabular">
                        Fecha dia {c.closingDay} · Vence dia {c.dueDay}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle className="inline-flex items-center gap-2">
                  <PiggyBank className="h-4 w-4 text-[var(--primary)]" /> Metas com prazo
                </CardTitle>
                <CardDescription>{goalsWithDue.length} meta(s)</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {goalsWithDue.length === 0 ? (
                <p className="text-xs text-[var(--foreground-muted)] py-4 text-center">Nenhuma meta com prazo definido.</p>
              ) : (
                <ul className="space-y-2">
                  {goalsWithDue.map((g) => (
                    <li
                      key={g.id}
                      className="flex items-center gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)]/40 p-3"
                    >
                      <p className="flex-1 text-sm font-medium truncate">{g.name}</p>
                      <p className="text-[11px] text-[var(--foreground-muted)] tabular">
                        até {g.dueDate?.split("-").reverse().join("/")}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
