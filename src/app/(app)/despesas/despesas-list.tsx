"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatBRL } from "@/lib/money";
import { formatDateBRFromISO } from "@/lib/dates";
import { markPaidFormAction } from "@/actions/expenses";
import { labelForResponsible, childResponsibleValue } from "@/lib/responsible";
import { Badge, STATUS_BADGE } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Edit3, Filter, Search, ListChecks } from "lucide-react";

export type ExpenseRow = {
  id: string;
  title: string;
  amountCents: number;
  dueDate: string;
  status: string;
  /** Status efetivo calculado no servidor (evita hydration mismatch) */
  effectiveStatus: string;
  categoryId: string;
  responsible: string;
  cardId: string | null;
  paymentMethod: string;
  isRecurring: boolean;
};

export type ListCtx = {
  cats: { id: string; name: string }[];
  cards: { id: string; name: string }[];
  p1: string;
  p2: string;
  children: { id: string; name: string }[];
};

type FilterStatus = "all" | "pending" | "paid" | "overdue";

export function DespesasList({
  rows,
  ctx,
}: { rows: ExpenseRow[]; ctx: ListCtx }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<FilterStatus>("all");
  const [categoryId, setCategoryId] = useState<string>("");
  const [responsible, setResponsible] = useState<string>("");
  const [cardId, setCardId] = useState<string>("");

  const catName = useMemo(
    () => Object.fromEntries(ctx.cats.map((c) => [c.id, c.name])),
    [ctx.cats]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (status !== "all" && r.effectiveStatus !== status) return false;
      if (categoryId && r.categoryId !== categoryId) return false;
      if (responsible && r.responsible !== responsible) return false;
      if (cardId && r.cardId !== cardId) return false;
      if (q && !r.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, search, status, categoryId, responsible, cardId]);

  const total = filtered.reduce((acc, r) => acc + r.amountCents, 0);

  const responsibleLabel = (k: string) =>
    labelForResponsible(k, { p1: ctx.p1, p2: ctx.p2, children: ctx.children });

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <Card className="p-4 space-y-3">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex-1">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por título…"
              leftIcon={<Search className="h-4 w-4" />}
            />
          </div>
          <Segmented
            value={status}
            onChange={(v) => setStatus(v)}
            options={[
              { value: "all" as const, label: "Todos" },
              { value: "pending" as const, label: "Pendentes" },
              { value: "paid" as const, label: "Pagas" },
              { value: "overdue" as const, label: "Vencidas" },
            ]}
          />
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          <Field label="Categoria" className="space-y-1">
            <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Todas as categorias</option>
              {ctx.cats.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Responsável" className="space-y-1">
            <Select value={responsible} onChange={(e) => setResponsible(e.target.value)}>
              <option value="">Qualquer pessoa</option>
              <option value="person1">{ctx.p1}</option>
              <option value="person2">{ctx.p2}</option>
              <option value="both">Ambos</option>
              {ctx.children.map((ch) => (
                <option key={ch.id} value={childResponsibleValue(ch.id)}>
                  {ch.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Cartão" className="space-y-1">
            <Select value={cardId} onChange={(e) => setCardId(e.target.value)}>
              <option value="">Todos os cartões</option>
              {ctx.cards.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-[var(--foreground-muted)] inline-flex items-center gap-1.5">
            <Filter className="h-3 w-3" />
            {filtered.length} de {rows.length} despesa(s)
          </p>
          <p className="text-xs text-[var(--foreground-muted)]">
            Total filtrado: <span className="font-semibold tabular text-[var(--foreground)]">{formatBRL(total)}</span>
          </p>
        </div>
      </Card>

      {/* Lista */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<ListChecks className="h-5 w-5" />}
          title="Nenhuma despesa encontrada"
          description="Ajuste os filtros ou crie uma nova despesa para começar."
        />
      ) : (
        <Card className="overflow-hidden">
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--surface-muted)]/50 border-b border-[var(--border)]">
                <tr className="text-left">
                  <th className="px-4 py-3 text-[11px] uppercase tracking-[0.08em] font-semibold text-[var(--foreground-muted)]">Despesa</th>
                  <th className="px-4 py-3 text-[11px] uppercase tracking-[0.08em] font-semibold text-[var(--foreground-muted)]">Categoria</th>
                  <th className="px-4 py-3 text-[11px] uppercase tracking-[0.08em] font-semibold text-[var(--foreground-muted)]">Responsável</th>
                  <th className="px-4 py-3 text-[11px] uppercase tracking-[0.08em] font-semibold text-[var(--foreground-muted)]">Vencimento</th>
                  <th className="px-4 py-3 text-[11px] uppercase tracking-[0.08em] font-semibold text-[var(--foreground-muted)] text-right">Valor</th>
                  <th className="px-4 py-3 text-[11px] uppercase tracking-[0.08em] font-semibold text-[var(--foreground-muted)]">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => {
                  const eff = e.effectiveStatus;
                  const meta = STATUS_BADGE[eff] ?? STATUS_BADGE.pending;
                  return (
                    <tr key={e.id} className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--surface-muted)]/40 transition-colors">
                      <td className="px-4 py-3.5 font-medium text-[var(--foreground)] max-w-[220px]">
                        <span className="truncate block">{e.title}</span>
                        {e.isRecurring && (
                          <Badge variant="info" className="mt-1 text-[10px]">Recorrente</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-[var(--foreground-muted)]">{catName[e.categoryId] ?? "—"}</td>
                      <td className="px-4 py-3.5 text-[var(--foreground-muted)]">{responsibleLabel(e.responsible)}</td>
                      <td className="px-4 py-3.5 text-[var(--foreground-muted)] tabular whitespace-nowrap">
                        {formatDateBRFromISO(e.dueDate)}
                      </td>
                      <td className="px-4 py-3.5 tabular text-right font-semibold text-[var(--foreground)]">
                        {formatBRL(e.amountCents)}
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge variant={meta.variant} dot>{meta.label}</Badge>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          {eff === "pending" && (
                            <form action={markPaidFormAction}>
                              <input type="hidden" name="id" value={e.id} />
                              <Button type="submit" size="icon-sm" variant="ghost" title="Marcar como pago">
                                <CheckCircle2 className="h-4 w-4 text-[var(--success)]" />
                              </Button>
                            </form>
                          )}
                          <Button asChild size="icon-sm" variant="ghost" title="Editar">
                            <Link href={`/despesas/${e.id}/editar`}>
                              <Edit3 className="h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Mobile list */}
          <ul className="md:hidden divide-y divide-[var(--border-subtle)]">
            {filtered.map((e) => {
              const eff = e.effectiveStatus;
              const meta = STATUS_BADGE[eff] ?? STATUS_BADGE.pending;
              return (
                <li key={e.id} className="p-4 flex items-start gap-3 hover:bg-[var(--surface-muted)]/40 transition">
                  <Link href={`/despesas/${e.id}/editar`} className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm text-[var(--foreground)] truncate">{e.title}</p>
                        {e.isRecurring && (
                          <Badge variant="info" className="mt-1 text-[10px]">Recorrente</Badge>
                        )}
                        <p className="text-[11px] text-[var(--foreground-muted)] mt-0.5">
                          {catName[e.categoryId] ?? "—"} · {responsibleLabel(e.responsible)}
                        </p>
                        <p className="text-[11px] text-[var(--foreground-muted)] mt-0.5 tabular">
                          {formatDateBRFromISO(e.dueDate)}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-semibold tabular text-sm">{formatBRL(e.amountCents)}</p>
                        <Badge variant={meta.variant} dot className="mt-1">{meta.label}</Badge>
                      </div>
                    </div>
                  </Link>
                  {eff === "pending" && (
                    <form action={markPaidFormAction} className="shrink-0">
                      <input type="hidden" name="id" value={e.id} />
                      <Button type="submit" size="icon-sm" variant="soft" title="Marcar como pago">
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
