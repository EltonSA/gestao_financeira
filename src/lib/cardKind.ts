export const CARD_KIND_VALUES = ["credit", "debit", "both"] as const;
export type CardKind = (typeof CARD_KIND_VALUES)[number];

export function parseCardKind(v: unknown): CardKind | null {
  if (v === "credit" || v === "debit" || v === "both") return v;
  return null;
}

export function cardSupportsCredit(kind: string) {
  return kind === "credit" || kind === "both";
}

export function cardSupportsDebit(kind: string) {
  return kind === "debit" || kind === "both";
}

export function cardKindLabel(kind: string) {
  if (kind === "credit") return "Crédito";
  if (kind === "debit") return "Débito";
  if (kind === "both") return "Crédito e débito";
  return kind;
}
