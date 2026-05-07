import * as React from "react";
import { cn, getInitials } from "@/lib/utils";

const SIZE_MAP = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-base",
} as const;

const COLORS = [
  "bg-grad-indigo",
  "bg-grad-violet",
  "bg-grad-rose",
  "bg-grad-emerald",
  "bg-grad-cyan",
  "bg-grad-amber",
  "bg-grad-pink",
];

function pickColor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length];
}

export function Avatar({
  name,
  size = "md",
  className,
}: { name: string; size?: keyof typeof SIZE_MAP; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-full font-semibold text-white flex items-center justify-center shadow-[var(--shadow-xs)] ring-2 ring-[var(--surface)]",
        SIZE_MAP[size],
        pickColor(name || "·"),
        className
      )}
      aria-label={name}
    >
      {getInitials(name)}
    </div>
  );
}

export function AvatarGroup({ names, size = "sm" }: { names: string[]; size?: keyof typeof SIZE_MAP }) {
  return (
    <div className="flex -space-x-2">
      {names.slice(0, 3).map((n) => (
        <Avatar key={n} name={n} size={size} />
      ))}
    </div>
  );
}
