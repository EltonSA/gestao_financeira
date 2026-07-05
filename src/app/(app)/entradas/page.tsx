import { getSession } from "@/lib/auth/session";
import { db, schema } from "@/lib/db";
import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Banknote, Pencil, Plus, RefreshCw, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { EntradasList } from "./entradas-list";
import { listChildrenByCouple } from "@/lib/data/children";
import { formatBRL } from "@/lib/money";
import { generateRecurringIncomesFormAction } from "@/actions/recurringIncomes";
import { currentYearMonth } from "@/lib/services/recurringSync";
import { isChildAccount } from "@/lib/auth/member";

export default async function EntradasPage() {
  const s = await getSession();
  if (!s) redirect("/login");
  const ym = currentYearMonth();
  const rows = await db
    .select()
    .from(schema.incomes)
    .where(eq(schema.incomes.coupleId, s.user.coupleId))
    .orderBy(desc(schema.incomes.receivedDate));
  const cards = await db
    .select()
    .from(schema.cards)
    .where(eq(schema.cards.coupleId, s.user.coupleId));
  const children = await listChildrenByCouple(s.user.coupleId);

  const recs = isChildAccount(s.user)
    ? []
    : await db
        .select()
        .from(schema.recurringIncomes)
        .where(eq(schema.recurringIncomes.coupleId, s.user.coupleId));

  const activeRecs = recs.filter((r) => r.isActive);
  const totalRec = activeRecs.reduce((acc, r) => acc + r.amountCents, 0);
  const generatedThisMonth = activeRecs.filter((r) => r.lastGeneratedYearMonth === ym).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Receitas"
        title="Entradas"
        description="Valores que entram para o casal: salário, PIX, reembolsos. Únicas, recorrentes mensais ou parceladas."
        action={
          <Button asChild leftIcon={<Plus className="h-4 w-4" />}>
            <Link href="/entradas/nova">Nova entrada</Link>
          </Button>
        }
      />

      {!isChildAccount(s.user) && recs.length > 0 && (
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-[var(--foreground)]">
                Recebimentos recorrentes
              </h2>
              <p className="text-sm text-[var(--foreground-muted)] mt-0.5">
                Salário, aluguel recebido… gerados automaticamente todo mês ao abrir o app.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 shrink-0">
              <Button asChild variant="secondary" size="sm" leftIcon={<Plus className="h-4 w-4" />}>
                <Link href="/entradas/recorrentes/novo">Novo modelo</Link>
              </Button>
              <form action={generateRecurringIncomesFormAction}>
                <Button type="submit" variant="ghost" size="sm" leftIcon={<Wand2 className="h-4 w-4" />}>
                  Gerar agora
                </Button>
              </form>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat label="Modelos ativos" value={String(activeRecs.length).padStart(2, "0")} />
            <Stat label="Total mensal" value={formatBRL(totalRec)} />
            <Stat label="Gerados este mês" value={`${generatedThisMonth}/${activeRecs.length}`} />
          </div>

          <Card className="overflow-hidden">
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[var(--surface-muted)]/50 border-b border-[var(--border)]">
                  <tr className="text-left">
                    <th className="px-4 py-3 text-[11px] uppercase tracking-[0.08em] font-semibold text-[var(--foreground-muted)]">Título</th>
                    <th className="px-4 py-3 text-[11px] uppercase tracking-[0.08em] font-semibold text-[var(--foreground-muted)] text-right">Valor</th>
                    <th className="px-4 py-3 text-[11px] uppercase tracking-[0.08em] font-semibold text-[var(--foreground-muted)]">Recebe dia</th>
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
                          {r.title}
                          {!r.isActive && <Badge variant="info">Inativo</Badge>}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 tabular text-right font-semibold text-[var(--success-strong)]">
                        +{formatBRL(r.amountCents)}
                      </td>
                      <td className="px-4 py-3.5 text-[var(--foreground-muted)]">Dia {r.dayOfMonth}</td>
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
                          <Link href={`/entradas/recorrentes/${r.id}/editar`}>
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
                    href={`/entradas/recorrentes/${r.id}/editar`}
                    className="flex items-start gap-3 p-4 hover:bg-[var(--surface-muted)]/40 transition"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-[var(--foreground)] truncate">{r.title}</p>
                      <p className="text-[11px] text-[var(--foreground-muted)] mt-0.5">Dia {r.dayOfMonth}</p>
                      {r.isActive && r.lastGeneratedYearMonth === ym && (
                        <p className="text-[11px] text-[var(--success-strong)] mt-1 inline-flex items-center gap-1">
                          <RefreshCw className="h-3 w-3" /> Entrada gerada este mês
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold tabular text-sm text-[var(--success-strong)]">
                        +{formatBRL(r.amountCents)}
                      </p>
                    </div>
                    <Pencil className="h-4 w-4 text-[var(--foreground-subtle)] shrink-0 mt-1" />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      )}

      {!isChildAccount(s.user) && recs.length === 0 && (
        <Card className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-[var(--success-bg)] p-2 text-[var(--success-strong)]">
              <Banknote className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--foreground)]">Recebimento recorrente</p>
              <p className="text-xs text-[var(--foreground-muted)] mt-0.5">
                Cadastre salário ou outra entrada fixa — ou marque &quot;Recorrente mensal&quot; ao criar uma entrada.
              </p>
            </div>
          </div>
          <Button asChild variant="secondary" size="sm" leftIcon={<Plus className="h-4 w-4" />}>
            <Link href="/entradas/recorrentes/novo">Novo modelo</Link>
          </Button>
        </Card>
      )}

      <EntradasList
        rows={rows.map((r) => ({
          id: r.id,
          title: r.title,
          amountCents: r.amountCents,
          receivedDate: r.receivedDate,
          responsible: r.responsible,
          cardId: r.cardId ?? null,
          incomeType: r.incomeType,
          recurrence: r.recurrence,
          installmentIndex: r.installmentIndex,
          installmentTotal: r.installmentTotal,
        }))}
        ctx={{
          cards: cards.map((c) => ({ id: c.id, name: c.name })),
          p1: s.user.couple.person1Label,
          p2: s.user.couple.person2Label,
          children: children.map((c) => ({ id: c.id, name: c.name })),
        }}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="text-[11px] uppercase tracking-[0.1em] font-medium text-[var(--foreground-muted)]">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular tracking-tight text-[var(--foreground)]">{value}</p>
    </div>
  );
}
