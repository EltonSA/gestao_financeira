import { getSession } from "@/lib/auth/session";
import { db, schema } from "@/lib/db";
import { and, eq } from "drizzle-orm";
import { formatBRL } from "@/lib/money";
import { generateRecurringForMonthFormAction } from "@/actions/recurring";
import { redirect } from "next/navigation";
import { PAYMENT_METHODS } from "@/lib/constants";
import Link from "next/link";
import { HandCoins, Pencil, Plus, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

export default async function GastosFixosPage() {
  const s = await getSession();
  if (!s) redirect("/login");
  const recs = await db
    .select()
    .from(schema.recurringExpenses)
    .where(and(eq(schema.recurringExpenses.coupleId, s.user.coupleId)));

  const total = recs.reduce((acc, r) => acc + r.amountCents, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Modelos"
        title="Gastos fixos"
        description="Modelos usados para gerar despesas recorrentes do mês com um clique."
        action={
          <div className="flex flex-col sm:flex-row gap-2">
            <Button asChild variant="secondary" leftIcon={<Plus className="h-4 w-4" />}>
              <Link href="/gastos-fixos/novo">Novo fixo</Link>
            </Button>
            <form action={generateRecurringForMonthFormAction}>
              <Button type="submit" leftIcon={<Wand2 className="h-4 w-4" />}>
                Gerar despesas do mês
              </Button>
            </form>
          </div>
        }
      />

      {recs.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat label="Modelos" value={String(recs.length).padStart(2, "0")} />
          <Stat label="Total mensal" value={formatBRL(total)} />
          <Stat label="Categoria" value="Fixos" />
        </div>
      )}

      {recs.length === 0 ? (
        <EmptyState
          icon={<HandCoins className="h-5 w-5" />}
          title="Nenhum gasto fixo"
          description="Cadastre modelos como aluguel, internet ou academia. Eles geram as despesas mensalmente em um clique."
          action={
            <Button asChild leftIcon={<Plus className="h-4 w-4" />}>
              <Link href="/gastos-fixos/novo">Cadastrar primeiro</Link>
            </Button>
          }
        />
      ) : (
        <Card className="overflow-hidden">
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--surface-muted)]/50 border-b border-[var(--border)]">
                <tr className="text-left">
                  <th className="px-4 py-3 text-[11px] uppercase tracking-[0.08em] font-semibold text-[var(--foreground-muted)]">Nome</th>
                  <th className="px-4 py-3 text-[11px] uppercase tracking-[0.08em] font-semibold text-[var(--foreground-muted)] text-right">Valor</th>
                  <th className="px-4 py-3 text-[11px] uppercase tracking-[0.08em] font-semibold text-[var(--foreground-muted)]">Dia</th>
                  <th className="px-4 py-3 text-[11px] uppercase tracking-[0.08em] font-semibold text-[var(--foreground-muted)]">Forma</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {recs.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--surface-muted)]/40 transition"
                  >
                    <td className="px-4 py-3.5 font-medium text-[var(--foreground)]">{r.name}</td>
                    <td className="px-4 py-3.5 tabular text-right font-semibold">{formatBRL(r.amountCents)}</td>
                    <td className="px-4 py-3.5 text-[var(--foreground-muted)]">Dia {r.dayOfMonth}</td>
                    <td className="px-4 py-3.5 text-[var(--foreground-muted)]">
                      {PAYMENT_METHODS.find((p) => p.value === r.paymentMethod)?.label}
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
          {/* Mobile list */}
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="text-[11px] uppercase tracking-[0.1em] font-medium text-[var(--foreground-muted)]">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular tracking-tight text-[var(--foreground)]">{value}</p>
    </div>
  );
}
