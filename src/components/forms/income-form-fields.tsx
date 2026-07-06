"use client";

import { useMemo, useState } from "react";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { DollarSign, Tag } from "lucide-react";
import { childResponsibleValue } from "@/lib/responsible";
import { firstInstallmentDueDate, formatDateBRFromISO } from "@/lib/dates";
import { MONTH_DAY_OPTIONS, monthDayLabel } from "@/lib/month-day";
import { DatePickerField } from "@/components/ui/date-picker";

const INS: Record<string, string> = {
  nubank: "Nubank",
  itau: "Itaú",
  santander: "Santander",
  c6: "C6",
  inter: "Inter",
  bradesco: "Bradesco",
  other: "Outro",
};

export type IncomeFormCtx = {
  cards: { id: string; name: string; institution: string }[];
  p1: string;
  p2: string;
  children: { id: string; name: string }[];
  lockedResponsible?: string;
  lockedResponsibleLabel?: string;
};

export type IncomeFormDefaults = Partial<{
  title: string;
  description: string;
  amount: string;
  receivedDate: string;
  receivedDayOfMonth: string;
  cardId: string;
  responsible: string;
  incomeType: string;
  installments: string;
}>;

export function IncomeFormFields({
  ctx,
  defaults,
  showClassification = true,
  mode = "create",
}: {
  ctx: IncomeFormCtx;
  defaults?: IncomeFormDefaults;
  showClassification?: boolean;
  mode?: "create" | "edit";
}) {
  const d = defaults ?? {};
  const [incomeType, setIncomeType] = useState(d.incomeType ?? "single");
  const [installments, setInstallments] = useState(Number(d.installments ?? 2) || 2);
  const [receivedDay, setReceivedDay] = useState(d.receivedDayOfMonth ?? "5");

  const isInstallmentPlan = mode === "create" && incomeType === "installment";
  const isRecurringPlan = mode === "create" && incomeType === "recurring";
  const useDayOfMonthReceived = isInstallmentPlan || isRecurringPlan;

  const handleIncomeTypeChange = (value: string) => {
    setIncomeType(value);
    if (value === "installment" && installments < 2) {
      setInstallments(2);
    }
  };

  const firstParcelPreview = useMemo(() => {
    const day = Number(receivedDay);
    if (!useDayOfMonthReceived || day < 1 || day > 31) return null;
    return formatDateBRFromISO(firstInstallmentDueDate(day));
  }, [useDayOfMonthReceived, receivedDay]);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="border-b border-[var(--border-subtle)] pb-2">
          <h3 className="text-sm font-semibold tracking-tight text-[var(--foreground)]">Entrada</h3>
          <p className="text-xs text-[var(--foreground-muted)] mt-0.5">
            Salário, PIX recebido, reembolso ou outro valor que entrou para o casal.
          </p>
        </div>
        <Field label="Título">
          <Input
            name="title"
            required
            placeholder="Ex.: Salário, PIX recebido, 13º"
            defaultValue={d.title}
            leftIcon={<Tag className="h-4 w-4" />}
          />
        </Field>
        <Field label="Descrição (opcional)">
          <Textarea
            name="description"
            placeholder="Detalhes…"
            rows={2}
            defaultValue={d.description}
          />
        </Field>

        {showClassification && (
          <div className="grid sm:grid-cols-2 gap-4">
            <Field
              label="Tipo"
              hint={
                incomeType === "recurring"
                  ? "Cria um modelo e repete todo mês no mesmo dia"
                  : incomeType === "installment"
                    ? "Divide o valor em parcelas mensais"
                    : undefined
              }
            >
              <Select
                name="incomeType"
                required
                value={incomeType}
                onChange={(e) => handleIncomeTypeChange(e.target.value)}
              >
                <option value="single">Única</option>
                <option value="recurring">Recorrente mensal</option>
                <option value="installment">Parcelada</option>
              </Select>
            </Field>
            {incomeType === "installment" ? (
              <Field label="Parcelas" hint="Mínimo 2">
                <Input
                  name="installments"
                  type="number"
                  min={2}
                  max={60}
                  required
                  value={installments}
                  onChange={(e) => setInstallments(Math.max(2, Number(e.target.value) || 2))}
                />
              </Field>
            ) : (
              <div aria-hidden className="hidden sm:block" />
            )}
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          <Field
            label="Valor (R$)"
            hint={isInstallmentPlan ? "Valor total — dividido entre as parcelas" : undefined}
          >
            <Input
              name="amount"
              required
              placeholder="0,00"
              inputMode="decimal"
              defaultValue={d.amount}
              leftIcon={<DollarSign className="h-4 w-4" />}
            />
          </Field>
          {useDayOfMonthReceived ? (
            <Field
              label={isInstallmentPlan ? "Recebimento das parcelas" : "Recebimento mensal"}
              hint={
                firstParcelPreview
                  ? isInstallmentPlan
                    ? `${monthDayLabel(Number(receivedDay))} · 1ª em ${firstParcelPreview}, depois todo mês no mesmo dia`
                    : `${monthDayLabel(Number(receivedDay))} · próximo em ${firstParcelPreview}, depois todo mês no mesmo dia`
                  : isInstallmentPlan
                    ? "Cada parcela cai no mesmo dia de cada mês"
                    : "Recebe todo mês no mesmo dia"
              }
            >
              <Select
                name="receivedDayOfMonth"
                required
                value={receivedDay}
                onChange={(e) => setReceivedDay(e.target.value)}
              >
                {MONTH_DAY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </Field>
          ) : (
            <Field label="Data do recebimento" hint="Toque para abrir o calendário">
              <DatePickerField name="receivedDate" defaultBr={d.receivedDate} />
            </Field>
          )}
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field
            label="Cartão (opcional)"
            hint="Se o valor caiu em conta vinculada a um cartão, selecione aqui."
          >
            <Select name="cardId" defaultValue={d.cardId ?? ""}>
              <option value="">— Não vincular</option>
              {ctx.cards.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({INS[c.institution] ?? c.institution})
                </option>
              ))}
            </Select>
          </Field>
          {ctx.lockedResponsible && ctx.lockedResponsibleLabel ? (
            <Field label="Responsável">
              <input type="hidden" name="responsible" value={ctx.lockedResponsible} />
              <p className="text-sm font-medium text-[var(--foreground)] rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5">
                {ctx.lockedResponsibleLabel}
              </p>
            </Field>
          ) : (
            <Field label="Responsável">
              <Select name="responsible" required defaultValue={d.responsible ?? "both"}>
                <option value="person1">{ctx.p1}</option>
                <option value="person2">{ctx.p2}</option>
                <option value="both">Ambos</option>
                {ctx.children.map((ch) => (
                  <option key={ch.id} value={childResponsibleValue(ch.id)}>
                    {ch.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}
        </div>
      </div>
    </div>
  );
}
