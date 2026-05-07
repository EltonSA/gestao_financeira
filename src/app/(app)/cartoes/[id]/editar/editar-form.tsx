"use client";

import { deleteCardAction, updateCardAction } from "@/actions/cards";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertCircle, CheckCircle2, Trash2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  CardFormFields,
  type CardFormCtx,
  type CardFormDefaults,
} from "@/components/forms/card-form-fields";

export function EditarCartaoForm({
  cardId,
  initial,
  ctx,
}: { cardId: string; initial: CardFormDefaults; ctx: CardFormCtx }) {
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
    const r = await updateCardAction(cardId, fd);
    setLoad(false);
    if (r && "error" in r && r.error) setErr(String(r.error));
    else {
      setOk(true);
      setTimeout(() => setOk(false), 2200);
      router.refresh();
    }
  }

  async function onDelete() {
    const r = await deleteCardAction(cardId);
    if (r && "error" in r && r.error) {
      throw new Error(String(r.error));
    }
    router.push("/cartoes");
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
          <p>Cartão atualizado com sucesso.</p>
        </div>
      )}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-7 shadow-[var(--shadow-xs)]">
        <CardFormFields ctx={ctx} defaults={initial} />
      </div>
      <div className="flex flex-col-reverse sm:flex-row gap-3 sm:items-center">
        <ConfirmDialog
          trigger={
            <Button type="button" variant="ghost" leftIcon={<Trash2 className="h-4 w-4" />} className="text-[var(--danger)] sm:mr-auto">
              Excluir cartão
            </Button>
          }
          title="Excluir este cartão?"
          description="A ação é permanente. Não é possível excluir cartões com despesas vinculadas."
          confirmLabel="Excluir"
          onConfirm={onDelete}
        />
        <Button asChild type="button" variant="ghost">
          <Link href="/cartoes">Voltar</Link>
        </Button>
        <Button type="submit" loading={load}>
          {load ? "Salvando…" : "Salvar alterações"}
        </Button>
      </div>
    </form>
  );
}
