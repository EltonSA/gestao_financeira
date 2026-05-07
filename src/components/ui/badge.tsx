import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium tracking-tight whitespace-nowrap leading-none",
  {
    variants: {
      variant: {
        neutral: "bg-[var(--surface-muted)] text-[var(--foreground-muted)] border border-[var(--border)]",
        success: "bg-[var(--success-soft)] text-[var(--success-strong)]",
        warning: "bg-[var(--warning-soft)] text-[var(--warning-strong)]",
        danger:  "bg-[var(--danger-soft)] text-[var(--danger-strong)]",
        info:    "bg-[var(--info-soft)] text-[var(--info-strong)]",
        primary: "bg-[var(--primary-soft)] text-[var(--primary)]",
        outline: "border border-[var(--border)] text-[var(--foreground-muted)]",
      },
      dot: { true: "pl-2", false: "" },
    },
    defaultVariants: { variant: "neutral", dot: false },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, dot }), className)} {...props}>
      {dot && (
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            variant === "success" && "bg-[var(--success)]",
            variant === "warning" && "bg-[var(--warning)]",
            variant === "danger" && "bg-[var(--danger)]",
            variant === "info" && "bg-[var(--info)]",
            variant === "primary" && "bg-[var(--primary)]",
            (variant === "neutral" || variant === "outline" || !variant) && "bg-[var(--foreground-subtle)]"
          )}
        />
      )}
      {children}
    </span>
  );
}

export const STATUS_BADGE: Record<string, { label: string; variant: BadgeProps["variant"] }> = {
  paid: { label: "Pago", variant: "success" },
  pending: { label: "Pendente", variant: "warning" },
  overdue: { label: "Vencido", variant: "danger" },
  cancelled: { label: "Cancelado", variant: "neutral" },
};
