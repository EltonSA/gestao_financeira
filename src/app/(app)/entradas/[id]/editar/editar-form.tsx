"use client";

import { updateIncomeAction } from "@/actions/incomes";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  IncomeFormFields,
  type IncomeFormCtx,
  type IncomeFormDefaults,
} from "@/components/forms/income-form-fields";

export function EditarEntradaForm({
  incomeId,
  initial,
  ctx,
}: {
  incomeId: string;
  initial: IncomeFormDefaults;
  ctx: IncomeFormCtx;
}) {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [load, setLoad] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoad(true);
    setErr(null);
    const fd = new FormData(e.currentTarget);
    const r = await updateIncomeAction(incomeId, fd);
    setLoad(false);
    if (r && "error" in r && r.error) setErr(String(r.error));
    else router.push("/entradas");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {err && (
        <div className="flex items-start gap-2.5 rounded-xl bg-[var(--danger-bg)] border border-[var(--danger-soft)] p-3 text-sm text-[var(--danger-strong)]">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <p>{err}</p>
        </div>
      )}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-7 shadow-[var(--shadow-xs)]">
        <IncomeFormFields ctx={ctx} defaults={initial} mode="edit" />
      </div>
      <div className="flex flex-col-reverse sm:flex-row gap-3">
        <Button asChild variant="ghost" className="flex-1">
          <Link href="/entradas">Cancelar</Link>
        </Button>
        <Button type="submit" loading={load} className="flex-1">
          {load ? "Salvando…" : "Salvar alterações"}
        </Button>
      </div>
    </form>
  );
}
