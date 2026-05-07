"use client";

import { useActionState, useState } from "react";
import type { ActionState } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { AlertCircle, Eye, EyeOff, Lock, Mail } from "lucide-react";

const initial: ActionState = {};

export function LoginForm({
  action,
}: { action: (s: ActionState, fd: FormData) => Promise<ActionState> }) {
  const [state, formAction, pending] = useActionState(action, initial);
  const [show, setShow] = useState(false);
  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <div className="flex items-start gap-2.5 rounded-xl bg-[var(--danger-bg)] border border-[var(--danger-soft)] p-3 text-sm text-[var(--danger-strong)]">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <p>{state.error}</p>
        </div>
      )}
      <Field label="E-mail">
        <Input
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="voce@exemplo.com"
          leftIcon={<Mail className="h-4 w-4" />}
        />
      </Field>
      <Field label="Senha">
        <Input
          name="password"
          type={show ? "text" : "password"}
          autoComplete="current-password"
          required
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
      <Button type="submit" block size="lg" loading={pending}>
        {pending ? "Entrando…" : "Entrar"}
      </Button>
    </form>
  );
}
