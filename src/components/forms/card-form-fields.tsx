"use client";

import { Field, Input, Select } from "@/components/ui/input";
import { INSTITUTIONS } from "@/lib/constants";

export type CardFormCtx = { p1: string; p2: string };

export type CardFormDefaults = Partial<{
  name: string;
  institution: string;
  owner: string;
  limitBRL: string;
  closingDay: string;
  dueDay: string;
  color: string;
  isActive: boolean;
}>;

export function CardFormFields({
  ctx,
  defaults,
}: { ctx: CardFormCtx; defaults?: CardFormDefaults }) {
  const d = defaults ?? {};
  return (
    <div className="space-y-5">
      <Field label="Nome do cartão" hint="Como vocês chamam ele no dia a dia">
        <Input name="name" required placeholder="Ex.: Nubank Roxinho" defaultValue={d.name} />
      </Field>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Instituição">
          <Select name="institution" required defaultValue={d.institution ?? "nubank"}>
            {INSTITUTIONS.map((i) => (
              <option key={i.value} value={i.value}>{i.label}</option>
            ))}
          </Select>
        </Field>
        <Field label="Dono">
          <Select name="owner" required defaultValue={d.owner ?? "shared"}>
            <option value="person1">{ctx.p1}</option>
            <option value="person2">{ctx.p2}</option>
            <option value="shared">Compartilhado</option>
          </Select>
        </Field>
      </div>

      <Field label="Limite total (R$)" hint="Use vírgula para os centavos">
        <Input
          name="limitBRL"
          required
          placeholder="0,00"
          inputMode="decimal"
          defaultValue={d.limitBRL}
        />
      </Field>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Dia de fechamento">
          <Input
            name="closingDay"
            type="number"
            min="1"
            max="31"
            required
            placeholder="20"
            defaultValue={d.closingDay}
          />
        </Field>
        <Field label="Dia de vencimento">
          <Input
            name="dueDay"
            type="number"
            min="1"
            max="31"
            required
            placeholder="27"
            defaultValue={d.dueDay}
          />
        </Field>
      </div>

      <Field label="Cor de identificação" hint="Aparece como acento nos relatórios">
        <Input
          name="color"
          type="color"
          defaultValue={d.color ?? "#6366f1"}
          className="h-12 cursor-pointer p-1"
        />
      </Field>

      <label className="flex items-center gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3 cursor-pointer">
        <input
          type="checkbox"
          name="isActive"
          value="true"
          defaultChecked={d.isActive ?? true}
          className="h-4 w-4 rounded border-[var(--border-strong)] text-[var(--primary)] focus:ring-[var(--ring)]"
        />
        <span className="text-sm font-medium text-[var(--foreground)]">Cartão ativo</span>
        <span className="ml-auto text-xs text-[var(--foreground-muted)]">Inativos não entram em totais</span>
      </label>
    </div>
  );
}
