"use client";

import * as React from "react";
import { Check, Copy, Link2, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { regenerateInviteAction } from "@/actions/settings";

type Props = {
  inviteUrl: string | null;
  expiresAt: Date | null;
  hasInvite: boolean;
  status: "ok" | "expired" | "missing";
};

function formatExpiry(date: Date | null) {
  if (!date) return "";
  const fmt = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  return fmt.format(date);
}

export function InviteCard({ inviteUrl, expiresAt, hasInvite, status }: Props) {
  const [copied, setCopied] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  async function handleCopy() {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = inviteUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  }

  function handleRegenerate() {
    startTransition(async () => {
      await regenerateInviteAction();
    });
  }

  return (
    <Card className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[color-mix(in_srgb,var(--primary)_8%,transparent)] via-transparent to-transparent" />
      <CardContent className="p-6 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary-soft)] text-[var(--primary)]">
                <Sparkles className="h-4 w-4" />
              </span>
              <h3 className="text-base font-semibold tracking-tight">
                Convidar parceiro(a)
              </h3>
            </div>
            <p className="text-sm text-[var(--foreground-muted)]">
              Compartilhe o link abaixo. Ele expira em 7 dias e só pode ser
              usado uma vez.
            </p>
          </div>
          {hasInvite && status === "ok" ? (
            <Badge variant="success" dot>
              Ativo
            </Badge>
          ) : status === "expired" ? (
            <Badge variant="warning" dot>
              Expirado
            </Badge>
          ) : (
            <Badge variant="neutral" dot>
              Sem convite
            </Badge>
          )}
        </div>

        {inviteUrl && status === "ok" ? (
          <div className="space-y-3">
            <div className="group flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-1 pl-3 transition-all focus-within:border-[var(--ring)] focus-within:bg-[var(--surface)]">
              <Link2 className="h-4 w-4 shrink-0 text-[var(--foreground-muted)]" />
              <input
                value={inviteUrl}
                readOnly
                onFocus={(e) => e.currentTarget.select()}
                className="flex-1 bg-transparent py-2 text-sm font-mono tracking-tight outline-none truncate"
                aria-label="Link de convite"
              />
              <Button
                type="button"
                variant={copied ? "soft" : "secondary"}
                size="sm"
                onClick={handleCopy}
                leftIcon={
                  copied ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )
                }
              >
                {copied ? "Copiado" : "Copiar"}
              </Button>
            </div>

            <div className="flex items-center justify-between text-xs text-[var(--foreground-muted)]">
              <span>Expira em {formatExpiry(expiresAt)}</span>
              <button
                type="button"
                onClick={handleRegenerate}
                disabled={pending}
                className="inline-flex items-center gap-1.5 font-medium text-[var(--foreground)] hover:text-[var(--primary)] transition-colors disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${pending ? "animate-spin" : ""}`}
                />
                Gerar novo link
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-muted)] p-5 text-center">
            <p className="text-sm text-[var(--foreground-muted)] mb-3">
              {status === "expired"
                ? "Seu convite anterior expirou. Gere um novo para enviar."
                : "Nenhum convite ativo. Gere um para compartilhar com seu parceiro(a)."}
            </p>
            <Button
              type="button"
              onClick={handleRegenerate}
              loading={pending}
              leftIcon={<RefreshCw className="h-4 w-4" />}
            >
              Gerar link de convite
            </Button>
          </div>
        )}

        <div className="border-t border-[var(--border)] pt-4 text-xs text-[var(--foreground-muted)] space-y-1.5">
          <p className="font-medium text-[var(--foreground)]">Como funciona</p>
          <ol className="space-y-1 list-decimal list-inside">
            <li>Envie o link para seu parceiro(a) (WhatsApp, email…).</li>
            <li>Ele(a) abre o link e cria a senha.</li>
            <li>Pronto — ambos compartilham todos os dados do casal.</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
