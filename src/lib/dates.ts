import { format, isBefore, isValid, parse, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

const BR = "dd/MM/yyyy";

function ymdFromParts(y: number, m: number, day: number) {
  return `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Dia do mês em um ano/mês (ajusta se o mês for mais curto). */
export function dueDateForDayInMonth(
  year: number,
  month: number,
  dayOfMonth: number
): string {
  const lastDay = new Date(year, month, 0).getDate();
  const day = Math.min(Math.max(1, dayOfMonth), lastDay);
  return ymdFromParts(year, month, day);
}

/** Próxima data de vencimento a partir de um dia fixo do mês (para parcelas). */
export function firstInstallmentDueDate(
  dayOfMonth: number,
  from = new Date()
): string {
  const start = startOfDay(from);
  for (let offset = 0; offset < 24; offset++) {
    const probe = new Date(start.getFullYear(), start.getMonth() + offset, 1);
    const y = probe.getFullYear();
    const m = probe.getMonth() + 1;
    const iso = dueDateForDayInMonth(y, m, dayOfMonth);
    const candidate = startOfDay(parseISODate(iso));
    if (!isBefore(candidate, start)) return iso;
  }
  const y = start.getFullYear();
  const m = start.getMonth() + 1;
  return dueDateForDayInMonth(y, m, dayOfMonth);
}

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

/** Aceita "6", "06" ou extrai o dia de uma data DD/MM/AAAA. */
export function parseDayOfMonthInput(s: string | undefined | null): number | null {
  if (!s?.trim()) return null;
  const t = s.trim();
  if (/^\d{1,2}$/.test(t)) {
    const n = Number(t);
    return n >= 1 && n <= 31 ? n : null;
  }
  const iso = parseDateBR(t);
  if (iso) {
    const day = Number(iso.split("-")[2]);
    return day >= 1 && day <= 31 ? day : null;
  }
  return null;
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

export function ymdToday() {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
}

export function ymdInMonth(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return { y, m, start: new Date(y, m - 1, 1), end: new Date(y, m, 0) };
}
