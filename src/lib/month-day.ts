/** Opções de dia fixo no mês — parcelas e recorrentes. */
export const MONTH_DAY_OPTIONS = Array.from({ length: 31 }, (_, i) => {
  const day = i + 1;
  return {
    value: String(day),
    label: `Todo dia ${String(day).padStart(2, "0")}`,
  };
});

export function monthDayLabel(day: number): string {
  const d = Math.min(31, Math.max(1, Math.round(day)));
  return `Todo dia ${String(d).padStart(2, "0")}`;
}
