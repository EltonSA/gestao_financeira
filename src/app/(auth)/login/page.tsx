import { loginAction } from "@/actions/auth";
import Link from "next/link";
import { LoginForm } from "./login-form";
import { Card } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <Card className="p-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-[-0.025em] text-[var(--foreground)]">
          Bem-vindo de volta
        </h1>
        <p className="text-sm text-[var(--foreground-muted)] leading-relaxed">
          Entre para acompanhar despesas, cartões e metas com o seu par.
        </p>
      </div>
      <div className="mt-7">
        <LoginForm action={loginAction} />
      </div>
      <div className="mt-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-[var(--border-subtle)]" />
        <span className="text-[11px] uppercase tracking-[0.14em] text-[var(--foreground-subtle)]">ou</span>
        <span className="h-px flex-1 bg-[var(--border-subtle)]" />
      </div>
      <p className="mt-6 text-center text-sm text-[var(--foreground-muted)] leading-relaxed">
        Filho(a)? Peça aos pais o link em <span className="font-medium text-[var(--foreground)]">Configurações</span>.
        Casal novo?{" "}
        <Link href="/registro" className="font-medium text-[var(--primary)] hover:underline underline-offset-4">
          Criar casal
        </Link>
        .
      </p>
    </Card>
  );
}
