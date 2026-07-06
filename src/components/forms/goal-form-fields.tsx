"use client";

import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { DatePickerField } from "@/components/ui/date-picker";
import { GOAL_CATEGORIES } from "@/lib/constants";
import { childResponsibleValue } from "@/lib/responsible";

export type GoalFormCtx = {
  p1: string;
  p2: string;
  children: { id: string; name: string }[];
  lockedResponsible?: string;
  lockedResponsibleLabel?: string;
};

export type GoalFormDefaults = Partial<{
  name: string;
  description: string;
  targetBRL: string;
  currentBRL: string;
  dueDate: string;
  responsible: string;
  goalCategory: string;
}>;

export function GoalFormFields({
  ctx,
  defaults,
}: { ctx: GoalFormCtx; defaults?: GoalFormDefaults }) {
  const d = defaults ?? {};
  return (
    <div className="space-y-5">
      <Field label="Nome da meta">
        <Input name="name" required placeholder="Ex.: Viagem Europa 2026" defaultValue={d.name} />
      </Field>
      <Field label="Descrição (opcional)">
        <Textarea
          name="description"
          rows={2}
          placeholder="Detalhes que motivam o casal"
          defaultValue={d.description}
        />
      </Field>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Valor alvo (R$)">
          <Input
            name="targetBRL"
            required
            placeholder="0,00"
            inputMode="decimal"
            defaultValue={d.targetBRL}
          />
        </Field>
        <Field label="Já guardado (R$)">
          <Input
            name="currentBRL"
            defaultValue={d.currentBRL ?? "0"}
            inputMode="decimal"
          />
        </Field>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Prazo" hint="Opcional">
          <DatePickerField name="dueDate" defaultBr={d.dueDate} optional />
        </Field>
        <Field label="Categoria">
          <Select name="goalCategory" required defaultValue={d.goalCategory ?? "other"}>
            {GOAL_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Responsável">
        {ctx.lockedResponsible && ctx.lockedResponsibleLabel ? (
          <>
            <input type="hidden" name="responsible" value={ctx.lockedResponsible} />
            <p className="text-sm font-medium text-[var(--foreground)] rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5">
              {ctx.lockedResponsibleLabel}
            </p>
            <p className="text-[11px] text-[var(--foreground-muted)] mt-1">
              Meta no seu nome.
            </p>
          </>
        ) : (
          <Select name="responsible" required defaultValue={d.responsible ?? "both"}>
            <option value="both">Ambos (recomendado)</option>
            <option value="person1">{ctx.p1}</option>
            <option value="person2">{ctx.p2}</option>
            {ctx.children.map((ch) => (
              <option key={ch.id} value={childResponsibleValue(ch.id)}>
                {ch.name}
              </option>
            ))}
          </Select>
        )}
      </Field>
    </div>
  );
}
