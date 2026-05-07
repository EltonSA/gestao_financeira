import * as React from "react";
import { cn } from "@/lib/utils";

export type ProgressTone = "primary" | "success" | "warning" | "danger" | "info";

const toneBg: Record<ProgressTone, string> = {
  primary: "bg-[var(--primary)]",
  success: "bg-[var(--success)]",
  warning: "bg-[var(--warning)]",
  danger:  "bg-[var(--danger)]",
  info:    "bg-[var(--info)]",
};

export function Progress({
  value,
  tone = "primary",
  className,
  height = 6,
  showValue = false,
}: {
  value: number;
  tone?: ProgressTone;
  className?: string;
  height?: number;
  showValue?: boolean;
}) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("w-full", className)}>
      <div
        className="w-full overflow-hidden rounded-full bg-[var(--surface-muted)] border border-[var(--border-subtle)]"
        style={{ height }}
      >
        <div
          role="progressbar"
          aria-valuenow={v}
          aria-valuemin={0}
          aria-valuemax={100}
          className={cn("h-full rounded-full transition-[width] duration-700 ease-out", toneBg[tone])}
          style={{ width: `${v}%` }}
        />
      </div>
      {showValue && (
        <p className="mt-1 text-[11px] text-[var(--foreground-muted)] tabular">{Math.round(v)}%</p>
      )}
    </div>
  );
}
