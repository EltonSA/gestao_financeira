import * as React from "react";
import { formatBRL } from "@/lib/money";
import { formatDateBRFromISO } from "@/lib/dates";
import { Wifi } from "lucide-react";
import { cn } from "@/lib/utils";
import { cardKindLabel, cardSupportsCredit, cardSupportsDebit } from "@/lib/cardKind";

const GRAD_BY_INSTITUTION: Record<string, string> = {
  nubank: "bg-grad-violet",
  itau: "bg-grad-amber",
  santander: "bg-grad-rose",
  c6: "bg-grad-slate",
  inter: "bg-grad-amber",
  bradesco: "bg-grad-rose",
  other: "bg-grad-indigo",
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
  currentInvoiceCents = 0,
  invoiceDueDate,
  className,
}: {
  name: string;
  institution: string;
  ownerLabel: string;
  /** Crédito em aberto (fatura não quitada). */
  used: number;
  limit: number;
  /** Limite disponível no cartão (não é saldo do casal). */
  available: number;
  percent: number;
  cardKind?: string;
  debitUsedCents?: number;
  currentInvoiceCents?: number;
  invoiceDueDate?: string | null;
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
        showDebitBlock ? "min-h-[240px]" : "aspect-[1.586/1] min-h-[180px]",
        "transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[var(--shadow-xl)]",
        grad,
        className
      )}
    >
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
                  <p className="text-[10px] uppercase tracking-[0.16em] text-white/60">Limite disponível</p>
                  <p className="mt-0.5 text-[20px] sm:text-[22px] font-semibold tabular tracking-tight truncate">
                    {formatBRL(available)}
                  </p>
                </div>
                <div className="min-w-0 text-right">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-white/60">Fatura atual</p>
                  <p className="mt-0.5 text-[20px] sm:text-[22px] font-semibold tabular tracking-tight">
                    {formatBRL(currentInvoiceCents)}
                  </p>
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
                Em aberto {formatBRL(used)} / Limite {formatBRL(limit)}
                {invoiceDueDate && (
                  <> · Vence {formatDateBRFromISO(invoiceDueDate)}</>
                )}
              </p>
            </>
          ) : showDebitBlock ? (
            <>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.16em] text-white/60">Gasto no débito</p>
                <p className="mt-0.5 text-[20px] sm:text-[22px] font-semibold tabular tracking-tight">
                  {formatBRL(debitUsedCents)}
                </p>
              </div>
              <p className="text-[10px] text-white/55 truncate">{ownerLabel}</p>
            </>
          ) : (
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-[0.16em] text-white/60">{ownerLabel}</p>
              <p className="text-sm font-medium text-white/90">Sem limite de crédito cadastrado.</p>
            </div>
          )}

          {showDebitBlock && trackCredit && (
            <p className="text-[10px] tabular text-white/65 pt-1">
              Débito no cartão: {formatBRL(debitUsedCents)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
