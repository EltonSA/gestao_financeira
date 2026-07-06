import type { Couple } from "@/lib/db/schema";

export type FinancialCycleStartType = "fixed_day" | "business_day";

export type FinancialCycleSettings = {
  startType: FinancialCycleStartType;
  startDay: number;
  businessDayNumber: number;
};

export type FinancialCycleRange = {
  startDate: string;
  endDate: string;
  label: string;
  year: number;
  month: number;
};

const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export function ymdFromDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function parseYmd(iso: string): Date {
  const [y, m, day] = iso.split("-").map(Number);
  return new Date(y, m - 1, day);
}

/** Segunda a sexta (feriados ficam para fase futura). */
export function isBusinessDay(date: Date): boolean {
  const dow = date.getDay();
  return dow >= 1 && dow <= 5;
}

export function getNthBusinessDayOfMonth(
  year: number,
  month: number,
  n: number
): Date {
  const lastDay = new Date(year, month, 0).getDate();
  let count = 0;
  for (let day = 1; day <= lastDay; day++) {
    const d = new Date(year, month - 1, day);
    if (isBusinessDay(d)) {
      count++;
      if (count === n) return d;
    }
  }
  return new Date(year, month - 1, lastDay);
}

export function getCycleStartDate(
  year: number,
  month: number,
  settings: FinancialCycleSettings
): Date {
  if (settings.startType === "business_day") {
    return getNthBusinessDayOfMonth(year, month, settings.businessDayNumber);
  }
  const lastDay = new Date(year, month, 0).getDate();
  const day = Math.min(Math.max(1, settings.startDay), lastDay);
  return new Date(year, month - 1, day);
}

export function coupleToFinancialSettings(couple: Pick<
  Couple,
  | "financialCycleStartType"
  | "financialCycleStartDay"
  | "financialCycleBusinessDayNumber"
>): FinancialCycleSettings {
  const startType =
    couple.financialCycleStartType === "business_day"
      ? "business_day"
      : "fixed_day";
  return {
    startType,
    startDay: couple.financialCycleStartDay,
    businessDayNumber: couple.financialCycleBusinessDayNumber,
  };
}

export function getFinancialCycleRange(
  year: number,
  month: number,
  settings: FinancialCycleSettings
): FinancialCycleRange {
  const start = getCycleStartDate(year, month, settings);
  let ny = year;
  let nm = month + 1;
  if (nm > 12) {
    nm = 1;
    ny += 1;
  }
  const nextStart = getCycleStartDate(ny, nm, settings);
  const end = new Date(nextStart);
  end.setDate(end.getDate() - 1);
  return {
    startDate: ymdFromDate(start),
    endDate: ymdFromDate(end),
    label: `${MONTH_NAMES[month - 1]}/${year}`,
    year,
    month,
  };
}

export function getFinancialCycleForDate(
  date: Date,
  settings: FinancialCycleSettings
): FinancialCycleRange {
  let y = date.getFullYear();
  let m = date.getMonth() + 1;
  const startThis = getCycleStartDate(y, m, settings);
  if (date < startThis) {
    m -= 1;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
  }
  return getFinancialCycleRange(y, m, settings);
}

export function getPreviousFinancialCycle(
  cycle: FinancialCycleRange,
  settings: FinancialCycleSettings
): FinancialCycleRange {
  let py = cycle.year;
  let pm = cycle.month - 1;
  if (pm < 1) {
    pm = 12;
    py -= 1;
  }
  return getFinancialCycleRange(py, pm, settings);
}

export function daysInCycle(cycle: FinancialCycleRange): number {
  const start = parseYmd(cycle.startDate);
  const end = parseYmd(cycle.endDate);
  return Math.max(
    1,
    Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1
  );
}

export function dayOfCycle(date: Date, cycle: FinancialCycleRange): number {
  const start = parseYmd(cycle.startDate);
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.max(
    1,
    Math.round((d.getTime() - start.getTime()) / 86_400_000) + 1
  );
}

export function daysLeftInCycle(date: Date, cycle: FinancialCycleRange): number {
  const end = parseYmd(cycle.endDate);
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.max(0, Math.round((end.getTime() - d.getTime()) / 86_400_000));
}
