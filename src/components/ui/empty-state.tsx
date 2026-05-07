import * as React from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--surface)]/50 p-10 text-center",
        "flex flex-col items-center justify-center gap-3 animate-fade-in",
        className
      )}
    >
      {icon && (
        <div className="h-12 w-12 rounded-2xl bg-[var(--primary-soft)] text-[var(--primary)] flex items-center justify-center">
          {icon}
        </div>
      )}
      <div className="space-y-1 max-w-sm">
        <h3 className="text-sm font-semibold tracking-tight text-[var(--foreground)]">{title}</h3>
        {description && (
          <p className="text-xs text-[var(--foreground-muted)] leading-relaxed">{description}</p>
        )}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
