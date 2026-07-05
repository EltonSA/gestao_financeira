"use client";

import { useState } from "react";
import { changePasswordAction } from "@/actions/settings";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/input";
import { AlertCircle, CheckCircle2, Eye, EyeOff, KeyRound, Lock } from "lucide-react";

function PasswordInput({
  name,
  label,
  autoComplete,
}: {
  name: string;
  label: string;
  autoComplete: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <Field label={label}>
      <Input
        name={name}
        type={show ? "text" : "password"}
        autoComplete={autoComplete}
        required
        minLength={name === "currentPassword" ? 1 : 6}
        placeholder="••••••••"
        leftIcon={<Lock className="h-4 w-4" />}
        rightIcon={
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="cursor-pointer hover:text-[var(--foreground)]"
            aria-label={show ? "Ocultar senha" : "Mostrar senha"}
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        }
      />
    </Field>
  );
}

export function ChangePasswordDialog() {
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [load, setLoad] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoad(true);
    setErr(null);
    setOk(false);
    const fd = new FormData(e.currentTarget);
    const r = await changePasswordAction(fd);
    setLoad(false);
    if (r && "error" in r && r.error) {
      setErr(String(r.error));
      return;
    }
    setOk(true);
    e.currentTarget.reset();
    setTimeout(() => {
      setOpen(false);
      setOk(false);
    }, 1400);
  }

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setErr(null);
      setOk(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="secondary" size="sm" leftIcon={<KeyRound className="h-3.5 w-3.5" />}>
          Alterar senha
        </Button>
      </DialogTrigger>
      <DialogContent showClose={!load}>
        <DialogHeader>
          <DialogTitle>Alterar senha</DialogTitle>
          <DialogDescription>
            Informe a senha atual e escolha uma nova com pelo menos 6 caracteres.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          {err && (
            <div className="flex items-start gap-2.5 rounded-xl bg-[var(--danger-bg)] border border-[var(--danger-soft)] p-3 text-sm text-[var(--danger-strong)]">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <p>{err}</p>
            </div>
          )}
          {ok && (
            <div className="flex items-start gap-2.5 rounded-xl bg-[var(--success-bg)] border border-[var(--success-soft)] p-3 text-sm text-[var(--success-strong)]">
              <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
              <p>Senha atualizada com sucesso.</p>
            </div>
          )}
          <PasswordInput
            name="currentPassword"
            label="Senha atual"
            autoComplete="current-password"
          />
          <PasswordInput
            name="newPassword"
            label="Nova senha"
            autoComplete="new-password"
          />
          <PasswordInput
            name="confirmPassword"
            label="Confirmar nova senha"
            autoComplete="new-password"
          />
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost" disabled={load}>
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" loading={load} disabled={ok}>
              {load ? "Salvando…" : "Salvar nova senha"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
