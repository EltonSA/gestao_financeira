"use client";

import * as React from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = "Excluir",
  cancelLabel = "Cancelar",
  destructive = true,
  onConfirm,
}: {
  trigger: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  /** A ação a ser executada — pode ser server action ou função client. */
  onConfirm: () => void | Promise<void>;
}) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    try {
      await onConfirm();
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao confirmar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <span onClick={() => setOpen(true)} className="contents">
        {trigger}
      </span>
      <DialogContent showClose={!loading}>
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div
              className={
                destructive
                  ? "grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--danger-soft)] text-[var(--danger-strong)]"
                  : "grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--warning-soft)] text-[var(--warning-strong)]"
              }
            >
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <DialogTitle>{title}</DialogTitle>
              {description && <DialogDescription className="mt-1">{description}</DialogDescription>}
            </div>
          </div>
        </DialogHeader>

        {error && (
          <div className="flex items-start gap-2.5 rounded-xl bg-[var(--danger-bg)] border border-[var(--danger-soft)] p-3 text-sm text-[var(--danger-strong)]">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" disabled={loading}>{cancelLabel}</Button>
          </DialogClose>
          <Button
            variant={destructive ? "danger" : "primary"}
            onClick={handleConfirm}
            disabled={loading}
            leftIcon={loading ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined}
          >
            {loading ? "Processando…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
