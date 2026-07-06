"use client";

import { useEffect, useMemo, useState } from "react";
import { Field, Input, Select } from "@/components/ui/input";
import { PAYMENT_METHODS } from "@/lib/constants";
import { childResponsibleValue } from "@/lib/responsible";
import { cardSupportsCredit, cardSupportsDebit } from "@/lib/cardKind";
import { MONTH_DAY_OPTIONS } from "@/lib/month-day";

export type RecurringFormCtx = {
  cats: { id: string; name: string }[];
  cards: { id: string; name: string; cardKind: string }[];
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
  const creditCards = useMemo(
    () => ctx.cards.filter((c) => cardSupportsCredit(c.cardKind)),
    [ctx.cards]
  );
  const debitCards = useMemo(
    () => ctx.cards.filter((c) => cardSupportsDebit(c.cardKind)),
    [ctx.cards]
  );
  const [pm, setPm] = useState(d.paymentMethod ?? "pix");
  const [cardId, setCardId] = useState(d.cardId ?? "");
  const [dayOfMonth, setDayOfMonth] = useState(d.dayOfMonth ?? "10");

  useEffect(() => {
    const pool =
      pm === "credit" ? creditCards : pm === "debit" ? debitCards : [];
    if (cardId && !pool.some((c) => c.id === cardId)) setCardId("");
    if (pm !== "credit" && pm !== "debit") setCardId("");
  }, [pm, creditCards, debitCards, cardId]);

  const cardPool = pm === "credit" ? creditCards : pm === "debit" ? debitCards : [];
  const showCardRow = pm === "credit" || pm === "debit";

  return (
    <div className="space-y-5">
      <input type="hidden" name="paymentMethod" value={pm} />
      <input type="hidden" name="cardId" value={cardId} />
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
        <Field label="Vencimento" hint="Todo mês no mesmo dia">
          <Select
            name="dayOfMonth"
            required
            value={dayOfMonth}
            onChange={(e) => setDayOfMonth(e.target.value)}
          >
            {MONTH_DAY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
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
          <Select required value={pm} onChange={(e) => setPm(e.target.value)}>
            {PAYMENT_METHODS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        {showCardRow ? (
          <Field
            label="Cartão"
            hint={
              pm === "credit"
                ? "Obrigatório para crédito."
                : "Opcional no débito."
            }
          >
            <Select
              required={pm === "credit"}
              value={cardId}
              onChange={(e) => setCardId(e.target.value)}
            >
              <option value="">{pm === "credit" ? "Selecione…" : "—"}</option>
              {cardPool.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </Field>
        ) : (
          <div aria-hidden className="hidden sm:block" />
        )}
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
