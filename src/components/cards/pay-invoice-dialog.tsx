"use client";

import { useActionState } from "react";
import { payCardInvoiceAction } from "@/actions/cardInvoices";
import { formatBRL } from "@/lib/money";
import { formatDateBRFromISO } from "@/lib/dates";
import { PAYMENT_METHODS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/input";
import { DatePickerField } from "@/components/ui/date-picker";
import { Banknote } from "lucide-react";

const initial = {} as { error?: string; ok?: boolean };

export function PayInvoiceDialog({
  invoiceId,
  cardName,
  outstandingCents,
  dueDate,
}: {
  invoiceId: string;
  cardName: string;
  outstandingCents: number;
  dueDate: string | null;
}) {
  const [state, action, pending] = useActionState(payCardInvoiceAction, initial);

  if (outstandingCents <= 0) return null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary" leftIcon={<Banknote className="h-4 w-4" />}>
          Pagar fatura
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pagar fatura — {cardName}</DialogTitle>
        </DialogHeader>
        <form action={action} className="space-y-4">
          <input type="hidden" name="invoiceId" value={invoiceId} />
          <p className="text-sm text-[var(--foreground-muted)]">
            Em aberto: <strong className="text-[var(--foreground)]">{formatBRL(outstandingCents)}</strong>
            {dueDate && (
              <> · Vence {formatDateBRFromISO(dueDate)}</>
            )}
          </p>
          <Field label="Valor do pagamento">
            <Input
              name="amount"
              required
              placeholder={(outstandingCents / 100).toFixed(2).replace(".", ",")}
              defaultValue={(outstandingCents / 100).toFixed(2).replace(".", ",")}
            />
          </Field>
          <Field label="Forma de pagamento">
            <Select name="paymentMethod" required defaultValue="pix">
              {PAYMENT_METHODS.filter((m) => m.value !== "credit").map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Data do pagamento" hint="Vazio usa hoje">
            <DatePickerField name="paidAt" optional placeholder="Hoje se vazio" />
          </Field>
          {state.error && (
            <p className="text-sm text-[var(--danger-strong)]">{state.error}</p>
          )}
          {state.ok && (
            <p className="text-sm text-[var(--success-strong)]">Pagamento registrado.</p>
          )}
          <Button type="submit" block disabled={pending}>
            {pending ? "Registrando…" : "Confirmar pagamento"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
