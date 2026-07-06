"use client";

import { useMemo, useState } from "react";
import { DayPicker } from "react-day-picker";
import { ptBR } from "date-fns/locale";
import { format } from "date-fns";
import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseISODate, parseDateBR, ymdToday } from "@/lib/dates";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import "react-day-picker/style.css";

function isoToDate(iso: string): Date {
  return parseISODate(iso);
}

function dateToIso(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

function resolveDefaultIso(
  defaultIso?: string,
  defaultBr?: string,
  optional?: boolean
): string {
  if (defaultIso) return defaultIso;
  if (defaultBr?.trim()) {
    return parseDateBR(defaultBr.trim()) ?? (optional ? "" : ymdToday());
  }
  return optional ? "" : ymdToday();
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Selecione a data",
  className,
  disabled,
  allowClear = false,
}: {
  value: string;
  onChange: (iso: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  allowClear?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = useMemo(() => (value ? isoToDate(value) : undefined), [value]);
  const label = selected ? format(selected, "dd/MM/yyyy", { locale: ptBR }) : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex w-full items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5",
            "text-sm text-left transition-all duration-150",
            "hover:border-[var(--border-strong)]",
            "focus:outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--ring)]",
            "disabled:opacity-60 disabled:cursor-not-allowed",
            !selected && "text-[var(--foreground-subtle)]",
            className
          )}
        >
          <CalendarDays className="h-4 w-4 shrink-0 text-[var(--foreground-subtle)]" />
          <span className="flex-1 tabular">{label}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="start">
        <DayPicker
          mode="single"
          locale={ptBR}
          selected={selected}
          onSelect={(d) => {
            if (!d) return;
            onChange(dateToIso(d));
            setOpen(false);
          }}
          className="date-picker-calendar"
        />
        {allowClear && value && (
          <button
            type="button"
            className="mt-2 w-full rounded-lg px-2 py-1.5 text-xs font-medium text-[var(--foreground-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
          >
            Limpar data
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}

/** Campo de formulário com calendário; envia DD/MM/AAAA no `name`. */
export function DatePickerField({
  name,
  defaultIso,
  defaultBr,
  optional = false,
  placeholder,
}: {
  name: string;
  defaultIso?: string;
  defaultBr?: string;
  optional?: boolean;
  placeholder?: string;
}) {
  const [iso, setIso] = useState(() =>
    resolveDefaultIso(defaultIso, defaultBr, optional)
  );

  const brValue = iso
    ? format(isoToDate(iso), "dd/MM/yyyy", { locale: ptBR })
    : "";

  return (
    <>
      <input type="hidden" name={name} value={brValue} />
      <DatePicker
        value={iso}
        onChange={setIso}
        placeholder={placeholder ?? (optional ? "Opcional" : "Selecione a data")}
        allowClear={optional}
      />
    </>
  );
}
