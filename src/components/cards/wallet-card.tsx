import * as React from "react";
import { formatBRL } from "@/lib/money";
import { Wifi } from "lucide-react";
import { cn } from "@/lib/utils";

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
  className,
}: {
  name: string;
  institution: string;
  ownerLabel: string;
  used: number;
  limit: number;
  available: number;
  percent: number;
  className?: string;
}) {
  const grad = GRAD_BY_INSTITUTION[institution] ?? "bg-grad-indigo";
  return (
    <div
      className={cn(
        "card-noise relative overflow-hidden rounded-2xl text-white",
        "shadow-[var(--shadow-lg)] aspect-[1.586/1] min-h-[180px]",
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
          <p className="text-[10px] uppercase tracking-[0.16em] text-white/60">Crédito</p>
        </div>

        <div className="mt-auto">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-white/60">Disponível</p>
              <p className="mt-0.5 text-[22px] font-semibold tabular tracking-tight">{formatBRL(available)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-[0.16em] text-white/60">{ownerLabel}</p>
              <p className="mt-0.5 text-[11px] tabular text-white/85">{percent}% usado</p>
            </div>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/15">
            <div
              className="h-full rounded-full bg-white transition-all duration-700"
              style={{ width: `${Math.min(100, percent)}%` }}
            />
          </div>
          <p className="mt-2 text-[10px] tabular text-white/65">
            {formatBRL(used)} de {formatBRL(limit)}
          </p>
        </div>
      </div>
    </div>
  );
}
