"use client";

import { useActionState } from "react";
import type { ActionState } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { AlertCircle, CheckCircle2, Copy, Heart, Lock, Mail, User as UserIcon } from "lucide-react";
import { useState } from "react";

const initial: ActionState = {};

export function RegisterCoupleForm({
  action,
}: { action: (s: ActionState, fd: FormData) => Promise<ActionState> }) {
  const [state, formAction, pending] = useActionState(action, initial);
  const [copied, setCopied] = useState(false);

  if (state?.success && state.inviteUrl) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-2.5 rounded-xl bg-[var(--success-bg)] border border-[var(--success-soft)] p-3.5 text-sm text-[var(--success-strong)]">
          <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
          <p>{state.success}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-[var(--foreground-muted)] mb-1.5">Link de convite</p>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3 flex items-center gap-2">
            <code className="text-[11px] font-mono text-[var(--foreground)] flex-1 break-all">{state.inviteUrl}</code>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(state.inviteUrl!);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="grid h-8 w-8 place-items-center rounded-lg text-[var(--foreground-muted)] hover:bg-[var(--surface)] hover:text-[var(--foreground)] transition shrink-0"
              aria-label="Copiar link"
            >
              {copied ? <CheckCircle2 className="h-4 w-4 text-[var(--success)]" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          <p className="mt-2 text-xs text-[var(--foreground-muted)] leading-relaxed">
            Envie esse link para seu par. Depois,{" "}
            <a className="text-[var(--primary)] font-medium hover:underline" href="/login">acesse o login</a>{" "}
            com o e-mail cadastrado.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <div className="flex items-start gap-2.5 rounded-xl bg-[var(--danger-bg)] border border-[var(--danger-soft)] p-3 text-sm text-[var(--danger-strong)]">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <p>{state.error}</p>
        </div>
      )}
      <Field label="Nome do casal" hint="Ex: Elton & Letícia">
        <Input name="coupleName" required placeholder="Apelido do casal" leftIcon={<Heart className="h-4 w-4" />} />
      </Field>
      <Field label="Seu nome">
        <Input name="name" required placeholder="Como prefere ser chamado(a)" leftIcon={<UserIcon className="h-4 w-4" />} />
      </Field>
      <Field label="E-mail">
        <Input name="email" type="email" required placeholder="voce@exemplo.com" leftIcon={<Mail className="h-4 w-4" />} />
      </Field>
      <Field label="Senha" hint="Mínimo de 6 caracteres">
        <Input name="password" type="password" minLength={6} required placeholder="••••••••" leftIcon={<Lock className="h-4 w-4" />} />
      </Field>
      <Button type="submit" block size="lg" loading={pending}>
        {pending ? "Criando…" : "Criar casal"}
      </Button>
    </form>
  );
}
