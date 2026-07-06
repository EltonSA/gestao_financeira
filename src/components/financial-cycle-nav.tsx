import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatDateBRFromISO } from "@/lib/dates";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { FinancialCycleRange } from "@/lib/financial-cycle";

export type FinancialCycleNavProps = {
  cycle: FinancialCycleRange;
  basePath: string;
  prevParam: string;
  nextParam: string;
  isCurrent: boolean;
};

function hrefFor(basePath: string, param?: string) {
  if (!param) return basePath;
  const sep = basePath.includes("?") ? "&" : "?";
  return `${basePath}${sep}ciclo=${param}`;
}

export function FinancialCycleNav({
  cycle,
  basePath,
  prevParam,
  nextParam,
  isCurrent,
}: FinancialCycleNavProps) {
  return (
    <Card className="p-3 sm:p-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.1em] text-[var(--foreground-muted)]">
            Período
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <p className="text-sm font-semibold text-[var(--foreground)]">
              Ciclo {cycle.label}
            </p>
            {isCurrent && (
              <Badge variant="primary" className="text-[10px]">
                Atual
              </Badge>
            )}
          </div>
          <p className="text-xs text-[var(--foreground-muted)] mt-0.5 tabular">
            {formatDateBRFromISO(cycle.startDate)} a {formatDateBRFromISO(cycle.endDate)}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button asChild size="sm" variant="secondary" title="Ciclo anterior">
            <Link href={hrefFor(basePath, prevParam)}>
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Anterior</span>
            </Link>
          </Button>
          {!isCurrent && (
            <Button asChild size="sm" variant="soft">
              <Link href={basePath}>Atual</Link>
            </Button>
          )}
          <Button asChild size="sm" variant="secondary" title="Próximo ciclo">
            <Link href={hrefFor(basePath, nextParam)}>
              <span className="hidden sm:inline">Próximo</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}
