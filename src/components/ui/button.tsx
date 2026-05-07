"use client";

import * as React from "react";
import { Slot, Slottable } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl",
    "font-medium tracking-tight transition-all duration-150 ease-out",
    "select-none active:scale-[0.985] disabled:pointer-events-none disabled:opacity-50",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]",
  ].join(" "),
  {
    variants: {
      variant: {
        primary:
          "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-[var(--shadow-sm)] hover:bg-[var(--primary-hover)] hover:shadow-[var(--shadow-md)]",
        secondary:
          "bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] shadow-[var(--shadow-xs)] hover:bg-[var(--surface-hover)] hover:border-[var(--border-strong)]",
        ghost:
          "bg-transparent text-[var(--foreground)] hover:bg-[var(--surface-muted)]",
        danger:
          "bg-[var(--danger)] text-white shadow-[var(--shadow-sm)] hover:bg-[var(--danger-strong)] hover:shadow-[var(--shadow-md)]",
        soft:
          "bg-[var(--primary-soft)] text-[var(--primary)] hover:bg-[color-mix(in_srgb,var(--primary-soft)_70%,var(--primary)_15%)]",
        link:
          "bg-transparent text-[var(--primary)] underline-offset-4 hover:underline px-0",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-base",
        icon: "h-10 w-10 p-0",
        "icon-sm": "h-8 w-8 p-0",
      },
      block: { true: "w-full", false: "" },
    },
    defaultVariants: { variant: "primary", size: "md", block: false },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      block,
      asChild,
      loading,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const classes = cn(buttonVariants({ variant, size, block, className }));
    const startSlot = loading ? <Loader2 className="h-4 w-4 animate-spin" /> : leftIcon;
    const endSlot = !loading ? rightIcon : null;

    if (asChild) {
      return (
        <Slot ref={ref} className={classes} {...props}>
          {startSlot}
          <Slottable>{children}</Slottable>
          {endSlot}
        </Slot>
      );
    }

    return (
      <button
        ref={ref}
        className={classes}
        disabled={disabled ?? loading}
        {...props}
      >
        {startSlot}
        {children}
        {endSlot}
      </button>
    );
  }
);
Button.displayName = "Button";

export { buttonVariants };
