"use client";

import { updateExpenseAction } from "@/actions/expenses";
import { useState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ExpenseFormFields,
  type ExpenseFormCtx,
  type ExpenseFormDefaults,
} from "@/components/forms/expense-form-fields";

export function EditarDespesaForm({
  expenseId,
  initial,
  ctx,
}: {
  expenseId: string;
  initial: ExpenseFormDefaults;
  ctx: ExpenseFormCtx;
}) {
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [load, setLoad] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoad(true);
    setErr(null);
    setOk(false);
    const fd = new FormData(e.currentTarget);
    const r = await updateExpenseAction(expenseId, fd);
    setLoad(false);
    if (r && "error" in r && r.error) setErr(String(r.error));
    else {
      setOk(true);
      setTimeout(() => setOk(false), 2200);
    }
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
          <p>Despesa atualizada com sucesso.</p>
        </div>
      )}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-7 shadow-[var(--shadow-xs)]">
        <ExpenseFormFields ctx={ctx} defaults={initial} mode="edit" />
      </div>
      <div className="flex flex-col-reverse sm:flex-row gap-3">
        <Button asChild variant="ghost" className="flex-1">
          <Link href="/despesas">Voltar</Link>
        </Button>
        <Button type="submit" loading={load} className="flex-1">
          {load ? "Salvando…" : "Atualizar despesa"}
        </Button>
      </div>
    </form>
  );
}
