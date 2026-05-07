import { registerWithChildInviteAction } from "@/actions/auth";
import Link from "next/link";
import { RegisterChildInviteForm } from "./register-child-invite-form";
import { Card } from "@/components/ui/card";
import { Baby } from "lucide-react";
import { redirect } from "next/navigation";

export default async function RegistroFilhoPage({
  searchParams,
}: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  if (!token) {
    redirect("/login");
  }
  return (
    <Card className="p-8">
      <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
        <Baby className="h-4 w-4" />
      </div>
      <h1 className="text-2xl font-semibold tracking-[-0.025em] text-[var(--foreground)]">Conta de filho(a)</h1>
      <p className="mt-1.5 text-sm text-[var(--foreground-muted)] leading-relaxed">
        Seus pais enviaram este link para você entrar no controle financeiro da família e lançar suas próprias despesas.
      </p>
      <div className="mt-7">
        <RegisterChildInviteForm action={registerWithChildInviteAction} token={token} />
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
