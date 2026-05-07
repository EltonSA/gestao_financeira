"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const fieldClasses = [
  "w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5",
  "text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-subtle)]",
  "transition-all duration-150 ease-out",
  "hover:border-[var(--border-strong)]",
  "focus:outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--ring)]",
  "disabled:opacity-60 disabled:cursor-not-allowed",
].join(" ");

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  error?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, leftIcon, rightIcon, error, ...props }, ref) => {
    if (leftIcon || rightIcon) {
      return (
        <div className="relative">
          {leftIcon && (
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--foreground-subtle)]">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            className={cn(
              fieldClasses,
              leftIcon && "pl-10",
              rightIcon && "pr-10",
              error && "border-[var(--danger)] focus:border-[var(--danger)] focus:ring-[var(--danger-soft)]",
              className
            )}
            {...props}
          />
          {rightIcon && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--foreground-subtle)]">
              {rightIcon}
            </span>
          )}
        </div>
      );
    }
    return (
      <input
        ref={ref}
        className={cn(
          fieldClasses,
          error && "border-[var(--danger)] focus:border-[var(--danger)] focus:ring-[var(--danger-soft)]",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn(fieldClasses, "min-h-[80px] resize-y", className)} {...props} />
  )
);
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        className={cn(fieldClasses, "appearance-none pr-10 cursor-pointer", className)}
        {...props}
      >
        {children}
      </select>
      <svg
        aria-hidden
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--foreground-muted)]"
        viewBox="0 0 20 20" fill="currentColor"
      >
        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
      </svg>
    </div>
  )
);
Select.displayName = "Select";

export function Label({ className, children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "block text-xs font-medium text-[var(--foreground-muted)] mb-1.5 tracking-tight",
        className
      )}
      {...props}
    >
      {children}
    </label>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && <Label>{label}</Label>}
      {children}
      {hint && !error && <p className="text-xs text-[var(--foreground-subtle)]">{hint}</p>}
      {error && <p className="text-xs text-[var(--danger)] font-medium">{error}</p>}
    </div>
  );
}
