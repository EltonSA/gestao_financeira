import { format, isBefore, isValid, parse, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

const BR = "dd/MM/yyyy";

export function parseISODate(s: string) {
  return new Date(s + (s.length === 10 ? "T12:00:00" : ""));
}

export function parseDateBR(s: string): string | null {
  const t = s.trim();
  if (!t) return null;
  const d = parse(t, BR, new Date());
  if (!isValid(d)) return null;
  return format(d, "yyyy-MM-dd");
}

export function formatDateBRFromISO(iso: string) {
  if (!iso) return "";
  const d = parseISODate(iso);
  if (!isValid(d)) return iso;
  return format(d, BR, { locale: ptBR });
}

export function isOverdue(iso: string) {
  return isBefore(
    startOfDay(parseISODate(iso)),
    startOfDay(new Date())
  );
}

export function getEffectiveStatus(dueDate: string, status: string) {
  if (status === "cancelled" || status === "paid") return status;
  if (status === "overdue") return "overdue";
  if (status === "pending" && isOverdue(dueDate)) return "overdue";
  return status;
}

export function ymdInMonth(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return { y, m, start: new Date(y, m - 1, 1), end: new Date(y, m, 0) };
}
