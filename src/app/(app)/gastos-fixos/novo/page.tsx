import { getSession } from "@/lib/auth/session";
import { createRecurringAction } from "@/actions/recurring";
import { db, schema } from "@/lib/db";
import { and, eq, isNull, or } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RecurringFormFields } from "@/components/forms/recurring-form-fields";
import { listChildrenByCouple } from "@/lib/data/children";
import { lockedResponsibleCtx } from "@/lib/auth/member";

export default async function NovoGastoFixoPage() {
  const s = await getSession();
  if (!s) redirect("/login");
  const cats = await db
    .select()
    .from(schema.categories)
    .where(
      or(
        isNull(schema.categories.coupleId),
        eq(schema.categories.coupleId, s.user.coupleId)
      )
    );
  const cards = await db
    .select()
    .from(schema.cards)
    .where(
      and(
        eq(schema.cards.coupleId, s.user.coupleId),
        eq(schema.cards.isActive, true)
      )
    );
  const children = await listChildrenByCouple(s.user.coupleId);
  const childRows = children.map((c) => ({ id: c.id, name: c.name }));
  return (
    <div className="w-full space-y-6">
      <div>
        <Link
          href="/gastos-fixos"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.025em]">Novo gasto fixo</h1>
        <p className="mt-1.5 text-sm text-[var(--foreground-muted)]">
          Modelo recorrente — usado para gerar a despesa mensal automaticamente.
        </p>
      </div>
      <Card>
        <CardContent className="p-6">
          <form action={createRecurringAction} className="space-y-5">
            <RecurringFormFields
              ctx={{
                cats: cats.map((c) => ({ id: c.id, name: c.name })),
                cards: cards.map((c) => ({
                  id: c.id,
                  name: c.name,
                  cardKind: c.cardKind ?? "credit",
                })),
                p1: s.user.couple.person1Label,
                p2: s.user.couple.person2Label,
                children: childRows,
                ...lockedResponsibleCtx(s.user, childRows),
              }}
            />
            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
              <Button asChild variant="ghost" className="flex-1">
                <Link href="/gastos-fixos">Cancelar</Link>
              </Button>
              <Button type="submit" className="flex-1">Salvar</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
