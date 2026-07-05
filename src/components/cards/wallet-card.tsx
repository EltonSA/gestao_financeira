import * as React from "react";
import { formatBRL } from "@/lib/money";
import { Wifi } from "lucide-react";
import { cn } from "@/lib/utils";
import { cardKindLabel, cardSupportsCredit, cardSupportsDebit } from "@/lib/cardKind";

const GRAD_BY_INSTITUTION: Record<string, string> = {
  nubank:    "bg-grad-violet",
  itau:      "bg-grad-amber",
  santander: "bg-grad-rose",
  c6:        "bg-grad-slate",
  inter:     "bg-grad-amber",
  bradesco:  "bg-grad-rose",
  other:     "bg-grad-indigo",
};

const INST_LABEL: Record<string, string> = {
  nubank: "Nubank",
  itau: "Itaú",
  santander: "Santander",
  c6: "C6 Bank",
  inter: "Inter",
  bradesco: "Bradesco",
  other: "Outro",
};

export function WalletCard({
  name,
  institution,
  ownerLabel,
  used,
  limit,
  available,
  percent,
  cardKind = "credit",
  debitUsedCents = 0,
  incomeOnCardCents = 0,
  liquidAfterDebitCents = 0,
  className,
}: {
  name: string;
  institution: string;
  ownerLabel: string;
  used: number;
  limit: number;
  available: number;
  percent: number;
  /** credit | debit | both */
  cardKind?: string;
  /** Gastos em débito vinculados a este cartão (soma). */
  debitUsedCents?: number;
  /** Entradas vinculadas ao cartão (soma). */
  incomeOnCardCents?: number;
  /** Caixa após débito (entradas − crédito faturado − débito, ≥ 0). */
  liquidAfterDebitCents?: number;
  className?: string;
}) {
  const grad = GRAD_BY_INSTITUTION[institution] ?? "bg-grad-indigo";
  const trackCredit = cardSupportsCredit(cardKind) && limit > 0;
  const showDebitBlock = cardSupportsDebit(cardKind);
  return (
    <div
      className={cn(
        "card-noise relative overflow-hidden rounded-2xl text-white",
        "shadow-[var(--shadow-lg)] min-h-[200px]",
        showDebitBlock ? "min-h-[268px]" : "aspect-[1.586/1] min-h-[180px]",
        "transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[var(--shadow-xl)]",
        grad,
        className
      )}
    >
      {/* Brilhos decorativos */}
      <div aria-hidden className="absolute -top-12 -right-12 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
      <div aria-hidden className="absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-white/5 blur-2xl" />

      <div className="relative z-[1] flex h-full flex-col p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">
              {INST_LABEL[institution] ?? institution}
            </p>
            <p className="mt-1 text-base font-semibold tracking-tight">{name}</p>
          </div>
          <Wifi className="h-5 w-5 text-white/80 rotate-90" aria-hidden />
        </div>

        {/* Chip + bandeira simulada */}
        <div className="mt-3 flex items-center gap-2">
          <div className="h-7 w-9 rounded-md bg-gradient-to-br from-yellow-200/80 via-amber-200/80 to-amber-400/80 ring-1 ring-white/30 shadow-inner" />
          <p className="text-[10px] uppercase tracking-[0.16em] text-white/60">
            {cardKindLabel(cardKind)}
          </p>
        </div>

        <div className="mt-auto space-y-2">
          {trackCredit ? (
            <>
              <div className="grid grid-cols-2 gap-3 items-end">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-white/60">Crédito disponível</p>
                  <p className="mt-0.5 text-[20px] sm:text-[22px] font-semibold tabular tracking-tight truncate">
                    {formatBRL(available)}
                  </p>
                </div>
                <div className="min-w-0 text-right">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-white/60">Gasto no débito</p>
                  <p className="mt-0.5 text-[20px] sm:text-[22px] font-semibold tabular tracking-tight">
                    {formatBRL(debitUsedCents)}
                  </p>
                  {!cardSupportsDebit(cardKind) && (
                    <p className="mt-0.5 text-[9px] text-white/45 leading-tight">Cartão só crédito</p>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 text-[10px] text-white/55">
                <span className="truncate">{ownerLabel}</span>
                <span className="tabular shrink-0">{percent}% do limite</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-white transition-all duration-700"
                  style={{ width: `${Math.min(100, percent)}%` }}
                />
              </div>
              <p className="text-[10px] tabular text-white/65">
                Fatura crédito {formatBRL(used)} / {formatBRL(limit)}
              </p>
            </>
          ) : showDebitBlock ? (
            <>
              <div className="grid grid-cols-2 gap-3 items-end">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-white/60">Gasto no débito</p>
                  <p className="mt-0.5 text-[20px] sm:text-[22px] font-semibold tabular tracking-tight">
                    {formatBRL(debitUsedCents)}
                  </p>
                </div>
                <div className="min-w-0 text-right">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-white/60">Saldo (caixa)</p>
                  <p className="mt-0.5 text-[20px] sm:text-[22px] font-semibold tabular tracking-tight">
                    {formatBRL(liquidAfterDebitCents)}
                  </p>
                </div>
              </div>
              <p className="text-[10px] text-white/55 truncate">{ownerLabel}</p>
              <div className="rounded-xl bg-black/20 px-2.5 py-2 ring-1 ring-white/15">
                <div className="flex justify-between gap-2 text-[10px] tabular text-white/85">
                  <span className="text-white/55">Entradas no cartão</span>
                  <span className="font-medium text-white">{formatBRL(incomeOnCardCents)}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-[0.16em] text-white/60">{ownerLabel}</p>
              <p className="text-sm font-medium text-white/90">Sem limite de crédito cadastrado.</p>
            </div>
          )}

          {showDebitBlock && trackCredit && (
            <div className="rounded-xl bg-black/20 px-2.5 py-2 ring-1 ring-white/15 mt-1">
              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/55 mb-1.5">
                Entradas & caixa
              </p>
              <div className="space-y-1 text-[10px] tabular text-white/85">
                <div className="flex justify-between gap-2">
                  <span className="text-white/55">Entradas</span>
                  <span className="font-medium">{formatBRL(incomeOnCardCents)}</span>
                </div>
                <div className="flex justify-between gap-2 pt-1 border-t border-white/10">
                  <span className="text-white/55">Saldo (caixa)</span>
                  <span className="font-semibold text-white">{formatBRL(liquidAfterDebitCents)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
