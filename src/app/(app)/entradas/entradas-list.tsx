"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatBRL } from "@/lib/money";
import { formatDateBRFromISO } from "@/lib/dates";
import { labelForResponsible } from "@/lib/responsible";
import { deleteIncomeAction } from "@/actions/incomes";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Banknote, Edit3, Search, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

export type IncomeRow = {
  id: string;
  title: string;
  amountCents: number;
  receivedDate: string;
  responsible: string;
  cardId: string | null;
};

export type EntradasListCtx = {
  cards: { id: string; name: string }[];
  p1: string;
  p2: string;
  children: { id: string; name: string }[];
};

export function EntradasList({
  rows,
  ctx,
}: { rows: IncomeRow[]; ctx: EntradasListCtx }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [cardId, setCardId] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (cardId && r.cardId !== cardId) return false;
      if (q && !r.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, search, cardId]);

  const total = filtered.reduce((acc, r) => acc + r.amountCents, 0);

  const responsibleLabel = (k: string) =>
    labelForResponsible(k, { p1: ctx.p1, p2: ctx.p2, children: ctx.children });

  const cardName = (id: string | null) =>
    id ? ctx.cards.find((c) => c.id === id)?.name ?? "—" : "—";

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por título…"
              leftIcon={<Search className="h-4 w-4" />}
            />
          </div>
          <Field label="Cartão" className="space-y-1 sm:w-56">
            <Select value={cardId} onChange={(e) => setCardId(e.target.value)}>
              <option value="">Todos</option>
              {ctx.cards.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </Field>
        </div>
        <p className="text-xs text-[var(--foreground-muted)]">
          {filtered.length} de {rows.length} entrada(s) · Total filtrado:{" "}
          <span className="font-semibold tabular text-[var(--foreground)]">{formatBRL(total)}</span>
        </p>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Banknote className="h-5 w-5" />}
          title="Nenhuma entrada encontrada"
          description="Ajuste os filtros ou registre uma nova entrada."
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--surface-muted)]/50 border-b border-[var(--border)]">
                <tr className="text-left">
                  <th className="px-4 py-3 text-[11px] uppercase tracking-[0.08em] font-semibold text-[var(--foreground-muted)]">Título</th>
                  <th className="px-4 py-3 text-[11px] uppercase tracking-[0.08em] font-semibold text-[var(--foreground-muted)]">Responsável</th>
                  <th className="px-4 py-3 text-[11px] uppercase tracking-[0.08em] font-semibold text-[var(--foreground-muted)]">Data</th>
                  <th className="px-4 py-3 text-[11px] uppercase tracking-[0.08em] font-semibold text-[var(--foreground-muted)]">Cartão</th>
                  <th className="px-4 py-3 text-[11px] uppercase tracking-[0.08em] font-semibold text-[var(--foreground-muted)] text-right">Valor</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--surface-muted)]/40 transition-colors">
                    <td className="px-4 py-3.5 font-medium text-[var(--foreground)] max-w-[220px] truncate">{r.title}</td>
                    <td className="px-4 py-3.5 text-[var(--foreground-muted)]">{responsibleLabel(r.responsible)}</td>
                    <td className="px-4 py-3.5 text-[var(--foreground-muted)] tabular whitespace-nowrap">
                      {formatDateBRFromISO(r.receivedDate)}
                    </td>
                    <td className="px-4 py-3.5 text-[var(--foreground-muted)]">{cardName(r.cardId)}</td>
                    <td className="px-4 py-3.5 tabular text-right font-semibold text-[var(--success-strong)]">
                      +{formatBRL(r.amountCents)}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <Button asChild size="icon-sm" variant="ghost" title="Editar">
                          <Link href={`/entradas/${r.id}/editar`}>
                            <Edit3 className="h-4 w-4" />
                          </Link>
                        </Button>
                        <ConfirmDialog
                          trigger={
                            <Button type="button" size="icon-sm" variant="ghost" title="Excluir" className="text-[var(--danger)]">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          }
                          title="Excluir esta entrada?"
                          description="A ação não pode ser desfeita."
                          confirmLabel="Excluir"
                          onConfirm={async () => {
                            await deleteIncomeAction(r.id);
                            router.refresh();
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="md:hidden divide-y divide-[var(--border-subtle)]">
            {filtered.map((r) => (
              <li key={r.id} className="p-4 flex items-start gap-3">
                <Link href={`/entradas/${r.id}/editar`} className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm text-[var(--foreground)] truncate">{r.title}</p>
                      <p className="text-[11px] text-[var(--foreground-muted)] mt-0.5">
                        {responsibleLabel(r.responsible)} · {cardName(r.cardId)}
                      </p>
                      <p className="text-[11px] text-[var(--foreground-muted)] mt-0.5 tabular">
                        {formatDateBRFromISO(r.receivedDate)}
                      </p>
                    </div>
                    <p className="font-semibold tabular text-sm text-[var(--success-strong)] shrink-0">
                      +{formatBRL(r.amountCents)}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
