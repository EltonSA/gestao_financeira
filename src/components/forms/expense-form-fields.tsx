"use client";

import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { CalendarDays, DollarSign, Tag } from "lucide-react";
import { childResponsibleValue } from "@/lib/responsible";

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
  cards: { id: string; name: string; institution: string }[];
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
}: { ctx: ExpenseFormCtx; defaults?: ExpenseFormDefaults }) {
  const d = defaults ?? {};
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
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Valor (R$)">
            <Input
              name="amount"
              required
              placeholder="0,00"
              inputMode="decimal"
              defaultValue={d.amount}
              leftIcon={<DollarSign className="h-4 w-4" />}
            />
          </Field>
          <Field label="Vencimento" hint="DD/MM/AAAA">
            <Input
              name="dueDate"
              required
              placeholder="01/01/2026"
              defaultValue={d.dueDate}
              leftIcon={<CalendarDays className="h-4 w-4" />}
            />
          </Field>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Forma de pagamento">
            <Select name="paymentMethod" required defaultValue={d.paymentMethod ?? "credit"}>
              {PM.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </Select>
          </Field>
          <Field label="Cartão" hint="Apenas se forma for crédito">
            <Select name="cardId" defaultValue={d.cardId ?? ""}>
              <option value="">—</option>
              {ctx.cards.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({INS[c.institution] ?? c.institution})
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Data de pagamento" hint="Preencha se já foi pago">
          <Input name="paidAt" placeholder="DD/MM/AAAA (opcional)" defaultValue={d.paidAt} />
        </Field>
      </Section>

      <Section title="Classificação" description="Como rastreamos no relatório">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Tipo">
            <Select name="expenseType" required defaultValue={d.expenseType ?? "variable"}>
              <option value="variable">Variável</option>
              <option value="fixed">Fixa</option>
              <option value="installment">Parcelada</option>
              <option value="goal">Meta</option>
            </Select>
          </Field>
          <Field label="Status">
            <Select name="status" required defaultValue={d.status ?? "pending"}>
              <option value="pending">Pendente</option>
              <option value="paid">Paga</option>
              <option value="overdue">Vencida</option>
              <option value="cancelled">Cancelada</option>
            </Select>
          </Field>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Parcelas">
            <Input
              name="installments"
              type="number"
              min="1"
              max="60"
              defaultValue={d.installments ?? "1"}
            />
          </Field>
          <Field label="Recorrência">
            <Select name="recurrence" defaultValue={d.recurrence ?? "none"}>
              <option value="none">Única</option>
              <option value="monthly">Mensal</option>
              <option value="weekly">Semanal</option>
              <option value="yearly">Anual</option>
            </Select>
          </Field>
        </div>
      </Section>
    </div>
  );
}
