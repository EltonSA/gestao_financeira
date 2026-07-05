"use client";

import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { CalendarDays, DollarSign, Tag } from "lucide-react";
import { childResponsibleValue } from "@/lib/responsible";

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
  cardId: string;
  responsible: string;
}>;

export function IncomeFormFields({
  ctx,
  defaults,
}: { ctx: IncomeFormCtx; defaults?: IncomeFormDefaults }) {
  const d = defaults ?? {};
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
          <Field label="Data do recebimento" hint="DD/MM/AAAA">
            <Input
              name="receivedDate"
              required
              placeholder="01/01/2026"
              defaultValue={d.receivedDate}
              leftIcon={<CalendarDays className="h-4 w-4" />}
            />
          </Field>
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
