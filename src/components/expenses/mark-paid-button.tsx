"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { markPaidExpenseAction } from "@/actions/expenses";
import { PAYMENT_METHODS } from "@/lib/constants";
import { formatBRL } from "@/lib/money";
import { formatDateBRFromISO } from "@/lib/dates";
import { cardSupportsCredit, cardSupportsDebit } from "@/lib/cardKind";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/input";
import { CheckCircle2 } from "lucide-react";

const initial = {} as { error?: string; ok?: boolean };

export function canMarkExpenseAsPaid(status: string) {
  return status !== "paid" && status !== "cancelled";
}

export type MarkPaidCard = { id: string; name: string; cardKind: string };

export function MarkPaidDialog({
  expenseId,
  title,
  amountCents,
  dueDate,
  defaultPaymentMethod = "pix",
  defaultCardId = "",
  cards = [],
  showLabel = true,
  size = "sm",
  variant = "soft",
  triggerClassName,
  triggerLabel = "Pagar",
}: {
  expenseId: string;
  title: string;
  amountCents: number;
  dueDate?: string;
  defaultPaymentMethod?: string;
  defaultCardId?: string | null;
  cards?: MarkPaidCard[];
  showLabel?: boolean;
  size?: "sm" | "icon-sm";
  variant?: "ghost" | "soft";
  triggerClassName?: string;
  triggerLabel?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(markPaidExpenseAction, initial);
  const [pm, setPm] = useState(defaultPaymentMethod);
  const [cardId, setCardId] = useState(defaultCardId ?? "");

  const creditCards = useMemo(
    () => cards.filter((c) => cardSupportsCredit(c.cardKind)),
    [cards]
  );
  const debitCards = useMemo(
    () => cards.filter((c) => cardSupportsDebit(c.cardKind)),
    [cards]
  );
  const cardPool = pm === "credit" ? creditCards : pm === "debit" ? debitCards : [];
  const showCardRow = pm === "credit" || pm === "debit";

  useEffect(() => {
    if (!open) return;
    setPm(defaultPaymentMethod);
    setCardId(defaultCardId ?? "");
  }, [open, defaultPaymentMethod, defaultCardId]);

  useEffect(() => {
    const pool = pm === "credit" ? creditCards : pm === "debit" ? debitCards : [];
    if (cardId && !pool.some((c) => c.id === cardId)) setCardId("");
    if (pm !== "credit" && pm !== "debit") setCardId("");
  }, [pm, creditCards, debitCards, cardId]);

  useEffect(() => {
    if (state.ok) {
      setOpen(false);
      router.refresh();
    }
  }, [state.ok, router]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          size={size}
          variant={variant}
          title="Marcar como pago"
          className={triggerClassName}
          leftIcon={showLabel ? <CheckCircle2 className="h-4 w-4" /> : undefined}
        >
          {showLabel ? triggerLabel : <CheckCircle2 className="h-4 w-4" />}
        </Button>
      </DialogTrigger>
      <DialogContent showClose={!pending}>
        <DialogHeader>
          <DialogTitle>Marcar como pago</DialogTitle>
        </DialogHeader>
        <form action={action} className="space-y-4">
          <input type="hidden" name="id" value={expenseId} />
          <input type="hidden" name="paymentMethod" value={pm} />
          <input type="hidden" name="cardId" value={cardId} />
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)]/50 p-3 space-y-1">
            <p className="text-sm font-medium text-[var(--foreground)] truncate">{title}</p>
            <p className="text-sm tabular font-semibold">{formatBRL(amountCents)}</p>
            {dueDate && (
              <p className="text-xs text-[var(--foreground-muted)]">
                Vencimento {formatDateBRFromISO(dueDate)}
              </p>
            )}
          </div>
          <Field label="Forma de pagamento">
            <Select
              required
              value={pm}
              onChange={(e) => setPm(e.target.value)}
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </Select>
          </Field>
          {showCardRow && (
            <Field
              label="Cartão"
              hint={
                pm === "credit"
                  ? "Obrigatório para pagamento no crédito."
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
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          <Field label="Data do pagamento" hint="Deixe vazio para usar hoje">
            <Input name="paidAt" placeholder="DD/MM/AAAA" />
          </Field>
          {state.error && (
            <p className="text-sm text-[var(--danger-strong)]">{state.error}</p>
          )}
          <Button type="submit" block loading={pending}>
            {pending ? "Registrando…" : "Confirmar pagamento"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** @deprecated Use MarkPaidDialog */
export const MarkPaidButton = MarkPaidDialog;
