"use client";

import { Field, Input, Select } from "@/components/ui/input";
import { PAYMENT_METHODS } from "@/lib/constants";
import { childResponsibleValue } from "@/lib/responsible";

export type RecurringFormCtx = {
  cats: { id: string; name: string }[];
  cards: { id: string; name: string }[];
  p1: string;
  p2: string;
  children: { id: string; name: string }[];
  lockedResponsible?: string;
  lockedResponsibleLabel?: string;
};

export type RecurringFormDefaults = Partial<{
  name: string;
  amount: string;
  categoryId: string;
  dayOfMonth: string;
  paymentMethod: string;
  cardId: string;
  responsible: string;
}>;

export function RecurringFormFields({
  ctx,
  defaults,
}: { ctx: RecurringFormCtx; defaults?: RecurringFormDefaults }) {
  const d = defaults ?? {};
  return (
    <div className="space-y-5">
      <Field label="Nome">
        <Input name="name" required placeholder="Ex.: Aluguel" defaultValue={d.name} />
      </Field>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Valor (R$)">
          <Input
            name="amount"
            required
            placeholder="0,00"
            inputMode="decimal"
            defaultValue={d.amount}
          />
        </Field>
        <Field label="Dia do mês" hint="Vencimento mensal">
          <Input
            name="dayOfMonth"
            type="number"
            min="1"
            max="31"
            required
            placeholder="10"
            defaultValue={d.dayOfMonth}
          />
        </Field>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Categoria">
          <Select name="categoryId" required defaultValue={d.categoryId}>
            {ctx.cats.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </Field>
        <Field label="Forma de pagamento">
          <Select name="paymentMethod" required defaultValue={d.paymentMethod ?? "pix"}>
            {PAYMENT_METHODS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Cartão" hint="Se forma for crédito">
          <Select name="cardId" defaultValue={d.cardId ?? ""}>
            <option value="">—</option>
            {ctx.cards.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </Field>
        <Field label="Responsável">
          {ctx.lockedResponsible && ctx.lockedResponsibleLabel ? (
            <>
              <input type="hidden" name="responsible" value={ctx.lockedResponsible} />
              <p className="text-sm font-medium text-[var(--foreground)] rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5">
                {ctx.lockedResponsibleLabel}
              </p>
              <p className="text-[11px] text-[var(--foreground-muted)] mt-1">
                Gasto fixo no seu nome.
              </p>
            </>
          ) : (
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
          )}
        </Field>
      </div>
    </div>
  );
}
