"use client";

import { useActionState } from "react";
import type { ActionState } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { AlertCircle, Lock, Mail, User as UserIcon } from "lucide-react";

const initial: ActionState = {};

export function RegisterChildInviteForm({
  action,
  token,
}: { action: (s: ActionState, fd: FormData) => Promise<ActionState>; token: string }) {
  const [state, formAction, pending] = useActionState(action, initial);
  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      {state?.error && (
        <div className="flex items-start gap-2.5 rounded-xl bg-[var(--danger-bg)] border border-[var(--danger-soft)] p-3 text-sm text-[var(--danger-strong)]">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <p>{state.error}</p>
        </div>
      )}
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
        {pending ? "Criando conta…" : "Criar minha conta"}
      </Button>
    </form>
  );
}
