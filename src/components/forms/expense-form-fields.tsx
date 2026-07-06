"use client";

import { useEffect, useMemo, useState } from "react";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { CalendarDays, DollarSign, Tag } from "lucide-react";
import { childResponsibleValue } from "@/lib/responsible";
import { cardSupportsCredit, cardSupportsDebit } from "@/lib/cardKind";
import { firstInstallmentDueDate, formatDateBRFromISO } from "@/lib/dates";
import { MONTH_DAY_OPTIONS, monthDayLabel } from "@/lib/month-day";

const PM = [
  { value: "cash", label: "Dinheiro" },
  { value: "pix", label: "Pix" },
  { value: "debit", label: "Débito" },
  { value: "credit", label: "Crédito" },
  { value: "boleto", label: "Boleto" },
  { value: "transfer", label: "Transferência" },
  { value: "other", label: "Outro" },
];

const INS: Record<string, string> = {
  nubank: "Nubank", itau: "Itaú", santander: "Santander", c6: "C6",
  inter: "Inter", bradesco: "Bradesco", other: "Outro",
};

export type ExpenseFormCtx = {
  cats: { id: string; name: string }[];
  cards: { id: string; name: string; institution: string; cardKind: string }[];
  p1: string;
  p2: string;
  children: { id: string; name: string }[];
  /** Conta de filho(a): responsável fixo. */
  lockedResponsible?: string;
  lockedResponsibleLabel?: string;
};

export type ExpenseFormDefaults = Partial<{
  title: string;
  description: string;
  categoryId: string;
  amount: string;
  dueDate: string;
  dueDayOfMonth: string;
  paidAt: string;
  paymentMethod: string;
  cardId: string;
  responsible: string;
  expenseType: string;
  status: string;
  recurrence: string;
  installments: string;
}>;

function Section({
  title,
  description,
  children,
}: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div className="border-b border-[var(--border-subtle)] pb-2">
        <h3 className="text-sm font-semibold tracking-tight text-[var(--foreground)]">{title}</h3>
        {description && <p className="text-xs text-[var(--foreground-muted)] mt-0.5">{description}</p>}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

export function ExpenseFormFields({
  ctx,
  defaults,
  mode = "create",
}: {
  ctx: ExpenseFormCtx;
  defaults?: ExpenseFormDefaults;
  mode?: "create" | "edit";
}) {
  const d = defaults ?? {};
  const creditCards = useMemo(
    () => ctx.cards.filter((c) => cardSupportsCredit(c.cardKind)),
    [ctx.cards]
  );
  const debitCards = useMemo(
    () => ctx.cards.filter((c) => cardSupportsDebit(c.cardKind)),
    [ctx.cards]
  );
  const [pm, setPm] = useState(d.paymentMethod ?? "credit");
  const [cardId, setCardId] = useState(d.cardId ?? "");
  const [expenseType, setExpenseType] = useState(d.expenseType ?? "variable");
  const [installments, setInstallments] = useState(
    Number(d.installments ?? (d.expenseType === "installment" ? 2 : 1)) || 1
  );
  const [dueDay, setDueDay] = useState(d.dueDayOfMonth ?? "10");

  const isInstallmentPlan = mode === "create" && expenseType === "installment";

  const handleExpenseTypeChange = (value: string) => {
    setExpenseType(value);
    if (value === "installment" && installments < 2) {
      setInstallments(2);
    }
  };

  const firstParcelPreview = useMemo(() => {
    const day = Number(dueDay);
    if (!isInstallmentPlan || day < 1 || day > 31) return null;
    return formatDateBRFromISO(firstInstallmentDueDate(day));
  }, [isInstallmentPlan, dueDay]);

  useEffect(() => {
    const pool =
      pm === "credit" ? creditCards : pm === "debit" ? debitCards : [];
    if (cardId && !pool.some((c) => c.id === cardId)) setCardId("");
    if (pm !== "credit" && pm !== "debit") setCardId("");
  }, [pm, creditCards, debitCards, cardId]);

  const cardPool = pm === "credit" ? creditCards : pm === "debit" ? debitCards : [];
  const showCardRow = pm === "credit" || pm === "debit";

  return (
    <div className="space-y-7">
      <Section title="Informações" description="Sobre o que é a despesa">
        <Field label="Título">
          <Input
            name="title"
            required
            placeholder="Ex.: Mercado da semana"
            defaultValue={d.title}
            leftIcon={<Tag className="h-4 w-4" />}
          />
        </Field>
        <Field label="Descrição (opcional)">
          <Textarea
            name="description"
            placeholder="Detalhes, observações…"
            rows={2}
            defaultValue={d.description}
          />
        </Field>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Categoria">
            <Select name="categoryId" required defaultValue={d.categoryId}>
              {ctx.cats.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </Field>
          {ctx.lockedResponsible && ctx.lockedResponsibleLabel ? (
            <Field label="Responsável">
              <input type="hidden" name="responsible" value={ctx.lockedResponsible} />
              <p className="text-sm font-medium text-[var(--foreground)] rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5">
                {ctx.lockedResponsibleLabel}
              </p>
              <p className="text-[11px] text-[var(--foreground-muted)] mt-1">
                Seus lançamentos ficam no seu nome.
              </p>
            </Field>
          ) : (
            <Field label="Responsável">
              <Select name="responsible" required defaultValue={d.responsible ?? "person1"}>
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
      </Section>

      <Section title="Pagamento" description="Valor, vencimento e forma">
        <input type="hidden" name="paymentMethod" value={pm} />
        <input type="hidden" name="cardId" value={cardId} />
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Tipo">
            <Select
              name="expenseType"
              required
              value={expenseType}
              onChange={(e) => handleExpenseTypeChange(e.target.value)}
            >
              <option value="variable">Variável</option>
              <option value="fixed">Fixa</option>
              <option value="installment">Parcelada</option>
              <option value="goal">Meta</option>
            </Select>
          </Field>
          <Field
            label="Parcelas"
            hint={expenseType === "installment" ? "Mínimo 2 parcelas mensais" : undefined}
          >
            <Input
              name="installments"
              type="number"
              min={expenseType === "installment" ? 2 : 1}
              max="60"
              value={installments}
              onChange={(e) => {
                const n = Number(e.target.value) || 1;
                setInstallments(
                  expenseType === "installment" ? Math.max(2, n) : Math.max(1, n)
                );
              }}
            />
          </Field>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Valor (R$)" hint={isInstallmentPlan ? "Valor total — dividido entre as parcelas" : undefined}>
            <Input
              name="amount"
              required
              placeholder="0,00"
              inputMode="decimal"
              defaultValue={d.amount}
              leftIcon={<DollarSign className="h-4 w-4" />}
            />
          </Field>
          {isInstallmentPlan ? (
            <Field
              label="Vencimento das parcelas"
              hint={
                firstParcelPreview
                  ? `${monthDayLabel(Number(dueDay))} · 1ª em ${firstParcelPreview}, depois todo mês no mesmo dia`
                  : "Cada parcela vence no mesmo dia de cada mês"
              }
            >
              <Select
                name="dueDayOfMonth"
                required
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value)}
              >
                {MONTH_DAY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </Field>
          ) : (
            <Field label="Vencimento" hint="DD/MM/AAAA">
              <Input
                name="dueDate"
                required
                placeholder="01/01/2026"
                defaultValue={d.dueDate}
                leftIcon={<CalendarDays className="h-4 w-4" />}
              />
            </Field>
          )}
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Forma de pagamento">
            <Select
              required
              value={pm}
              onChange={(e) => setPm(e.target.value)}
            >
              {PM.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </Select>
          </Field>
          {showCardRow ? (
            <Field
              label="Cartão"
              hint={
                pm === "credit"
                  ? "Obrigatório para crédito (cartões com função crédito)."
                  : "Opcional: escolha o cartão no débito, se quiser rastrear."
              }
            >
              <Select
                required={pm === "credit"}
                value={cardId}
                onChange={(e) => setCardId(e.target.value)}
              >
                <option value="">{pm === "credit" ? "Selecione…" : "—"}</option>
                {cardPool.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({INS[c.institution] ?? c.institution})
                  </option>
                ))}
              </Select>
            </Field>
          ) : (
            <div aria-hidden className="hidden sm:block" />
          )}
        </div>
        <Field label="Data de pagamento" hint="Preencha se já foi pago">
          <Input name="paidAt" placeholder="DD/MM/AAAA (opcional)" defaultValue={d.paidAt} />
        </Field>
      </Section>

      <Section title="Classificação" description="Status e recorrência no relatório">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Status">
            <Select name="status" required defaultValue={d.status ?? "pending"}>
              <option value="pending">Pendente</option>
              <option value="paid">Paga</option>
              <option value="overdue">Vencida</option>
              <option value="cancelled">Cancelada</option>
            </Select>
          </Field>
          <Field label="Recorrência" hint="Mensal + tipo Fixa cria também um modelo em Recorrentes">
            <Select name="recurrence" defaultValue={d.recurrence ?? "none"}>
              <option value="none">Única (só este lançamento)</option>
              <option value="monthly">Mensal (repete todo mês)</option>
              <option value="weekly">Semanal</option>
              <option value="yearly">Anual</option>
            </Select>
          </Field>
        </div>
      </Section>
    </div>
  );
}
