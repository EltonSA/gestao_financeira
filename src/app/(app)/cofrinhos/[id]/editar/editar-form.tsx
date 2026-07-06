"use client";

import { contributeGoalAction, deleteGoalAction, updateGoalAction } from "@/actions/goals";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertCircle, CheckCircle2, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/input";
import { DatePickerField } from "@/components/ui/date-picker";
import {
  GoalFormFields,
  type GoalFormCtx,
  type GoalFormDefaults,
} from "@/components/forms/goal-form-fields";

export function EditarMetaForm({
  goalId,
  initial,
  ctx,
}: { goalId: string; initial: GoalFormDefaults; ctx: GoalFormCtx }) {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [load, setLoad] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoad(true);
    setErr(null);
    setOk(false);
    const fd = new FormData(e.currentTarget);
    const r = await updateGoalAction(goalId, fd);
    setLoad(false);
    if (r && "error" in r && r.error) setErr(String(r.error));
    else {
      setOk(true);
      setTimeout(() => setOk(false), 2200);
      router.refresh();
    }
  }

  async function onDelete() {
    const r = await deleteGoalAction(goalId);
    if (r && "error" in r && r.error) {
      throw new Error(String(r.error));
    }
    router.push("/cofrinhos");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {err && (
        <div className="flex items-start gap-2.5 rounded-xl bg-[var(--danger-bg)] border border-[var(--danger-soft)] p-3 text-sm text-[var(--danger-strong)]">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <p>{err}</p>
        </div>
      )}
      {ok && (
        <div className="flex items-start gap-2.5 rounded-xl bg-[var(--success-bg)] border border-[var(--success-soft)] p-3 text-sm text-[var(--success-strong)] animate-fade-in">
          <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
          <p>Meta atualizada com sucesso.</p>
        </div>
      )}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-7 shadow-[var(--shadow-xs)]">
        <GoalFormFields ctx={ctx} defaults={initial} />
      </div>
      <div className="flex flex-col-reverse sm:flex-row gap-3 sm:items-center">
        <ConfirmDialog
          trigger={
            <Button type="button" variant="ghost" leftIcon={<Trash2 className="h-4 w-4" />} className="text-[var(--danger)] sm:mr-auto">
              Excluir meta
            </Button>
          }
          title="Excluir esta meta?"
          description="A ação remove a meta e todos os aportes vinculados. Não pode ser desfeita."
          confirmLabel="Excluir"
          onConfirm={onDelete}
        />
        <Button asChild type="button" variant="ghost">
          <Link href="/cofrinhos">Voltar</Link>
        </Button>
        <Button type="submit" loading={load}>
          {load ? "Salvando…" : "Salvar alterações"}
        </Button>
      </div>
    </form>
  );
}

/** Modal de aporte (depósito numa meta). */
export function AporteButton({ goalId }: { goalId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [load, setLoad] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoad(true);
    setErr(null);
    const fd = new FormData(e.currentTarget);
    const r = await contributeGoalAction(goalId, fd);
    setLoad(false);
    if (r && "error" in r && r.error) setErr(String(r.error));
    else {
      setOpen(false);
      router.refresh();
    }
  }

  const today = new Date();
  const todayBR = `${String(today.getDate()).padStart(2, "0")}/${String(today.getMonth() + 1).padStart(2, "0")}/${today.getFullYear()}`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant="primary"
        leftIcon={<Plus className="h-4 w-4" />}
        onClick={() => setOpen(true)}
      >
        Novo aporte
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo aporte</DialogTitle>
          <DialogDescription>Registre um valor depositado nesta meta.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          {err && (
            <div className="flex items-start gap-2.5 rounded-xl bg-[var(--danger-bg)] border border-[var(--danger-soft)] p-3 text-sm text-[var(--danger-strong)]">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <p>{err}</p>
            </div>
          )}
          <Field label="Valor (R$)">
            <Input name="amount" required placeholder="0,00" inputMode="decimal" autoFocus />
          </Field>
          <Field label="Data" hint="Toque para abrir o calendário">
            <DatePickerField name="date" defaultBr={todayBR} />
          </Field>
          <Field label="Observação (opcional)">
            <Textarea name="note" rows={2} placeholder="Ex.: bônus do salário" />
          </Field>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={load}>
              Cancelar
            </Button>
            <Button type="submit" loading={load}>
              {load ? "Registrando…" : "Registrar aporte"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
