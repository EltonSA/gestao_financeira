import { getSession } from "@/lib/auth/session";
import { createGoalAction } from "@/actions/goals";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GoalFormFields } from "@/components/forms/goal-form-fields";
import { listChildrenByCouple } from "@/lib/data/children";
import { lockedResponsibleCtx } from "@/lib/auth/member";

export default async function NovaMetaPage() {
  const s = await getSession();
  if (!s) redirect("/login");
  const children = await listChildrenByCouple(s.user.coupleId);
  const childRows = children.map((c) => ({ id: c.id, name: c.name }));
  return (
    <div className="w-full space-y-6">
      <div>
        <Link
          href="/cofrinhos"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar para cofrinhos
        </Link>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.025em]">Nova meta</h1>
        <p className="mt-1.5 text-sm text-[var(--foreground-muted)]">
          Defina o objetivo, valor alvo e (opcional) um prazo para alcançar juntos.
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <form action={createGoalAction} className="space-y-5">
            <GoalFormFields
              ctx={{
                p1: s.user.couple.person1Label,
                p2: s.user.couple.person2Label,
                children: childRows,
                ...lockedResponsibleCtx(s.user, childRows),
              }}
            />
            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
              <Button asChild variant="ghost" className="flex-1">
                <Link href="/cofrinhos">Cancelar</Link>
              </Button>
              <Button type="submit" className="flex-1">Criar meta</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
