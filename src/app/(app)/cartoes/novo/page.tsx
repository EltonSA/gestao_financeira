import { getSession } from "@/lib/auth/session";
import { createCardAction } from "@/actions/cards";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CardFormFields } from "@/components/forms/card-form-fields";
import { isChildAccount } from "@/lib/auth/member";

export default async function NovoCartaoPage() {
  const s = await getSession();
  if (!s) redirect("/login");
  if (isChildAccount(s.user)) redirect("/cartoes");
  return (
    <div className="w-full space-y-6">
      <div>
        <Link
          href="/cartoes"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar para cartões
        </Link>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.025em]">Novo cartão</h1>
        <p className="mt-1.5 text-sm text-[var(--foreground-muted)]">
          Cadastre cartão de crédito, débito ou ambos no mesmo plástico. O limite de fatura vale só para a função crédito.
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <form action={createCardAction} className="space-y-5">
            <CardFormFields ctx={{ p1: s.user.couple.person1Label, p2: s.user.couple.person2Label }} />
            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
              <Button asChild variant="ghost" className="flex-1">
                <Link href="/cartoes">Cancelar</Link>
              </Button>
              <Button type="submit" className="flex-1">Salvar cartão</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
