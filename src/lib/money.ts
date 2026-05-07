const fmt = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatBRL(cents: number) {
  return fmt.format(cents / 100);
}

/** Parse "1.234,56" or "1234,56" or "1234.56" to cents */
export function parseMoneyToCents(input: string): number {
  const t = input.trim().replace(/\s/g, "");
  if (!t) return 0;
  const norm = t.includes(",")
    ? t.replace(/\./g, "").replace(",", ".")
    : t.replace(/,/g, "");
  const n = Number.parseFloat(norm);
  if (Number.isNaN(n)) return 0;
  return Math.round(n * 100);
}

export function centsToNumber(cents: number) {
  return cents / 100;
}
