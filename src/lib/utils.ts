import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Mescla classes Tailwind com precedência de ordem e dedupe. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Inicial(is) para Avatar a partir de um nome. */
export function getInitials(name?: string | null) {
  if (!name) return "·";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Saudação contextual em PT-BR pelo horário local. */
export function greetingByHour(hour = new Date().getHours()) {
  if (hour < 5) return "Boa madrugada";
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}
