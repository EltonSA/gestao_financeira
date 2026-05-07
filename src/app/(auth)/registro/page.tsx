import { registerCoupleAction, registerWithInviteAction } from "@/actions/auth";
import Link from "next/link";
import { RegisterCoupleForm } from "./register-couple-form";
import { RegisterInviteForm } from "./register-invite-form";
import { Card } from "@/components/ui/card";
import { Heart, Mail } from "lucide-react";

export default async function RegistroPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (token) {
    return (
      <Card className="p-8">
        <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
          <Mail className="h-4 w-4" />
        </div>
        <h1 className="text-2xl font-semibold tracking-[-0.025em] text-[var(--foreground)]">Entrar no casal</h1>
        <p className="mt-1.5 text-sm text-[var(--foreground-muted)] leading-relaxed">
          Você foi convidado(a). Crie a sua conta para entrar no espaço financeiro do casal.
        </p>
        <div className="mt-7">
          <RegisterInviteForm action={registerWithInviteAction} token={token} />
        </div>
        <p className="mt-6 text-center text-sm text-[var(--foreground-muted)]">
          Já tem conta?{" "}
          <Link href="/login" className="font-medium text-[var(--primary)] hover:underline underline-offset-4">
            Entrar
          </Link>
        </p>
      </Card>
    );
  }
  return (
    <Card className="p-8">
      <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
        <Heart className="h-4 w-4" />
      </div>
      <h1 className="text-2xl font-semibold tracking-[-0.025em] text-[var(--foreground)]">Comece com seu par</h1>
      <p className="mt-1.5 text-sm text-[var(--foreground-muted)] leading-relaxed">
        Crie o espaço do casal e convide o segundo membro pelo link.
      </p>
      <div className="mt-7">
        <RegisterCoupleForm action={registerCoupleAction} />
      </div>
      <p className="mt-6 text-center text-sm text-[var(--foreground-muted)]">
        Já tem conta?{" "}
        <Link href="/login" className="font-medium text-[var(--primary)] hover:underline underline-offset-4">
          Entrar
        </Link>
      </p>
    </Card>
  );
}
