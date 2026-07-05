import { getSession } from "@/lib/auth/session";
import { db, schema } from "@/lib/db";
import { desc, eq, isNull, or } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { DespesasList } from "./despesas-list";
import { getEffectiveStatus } from "@/lib/dates";
import { listChildrenByCouple } from "@/lib/data/children";

export default async function DespesasPage() {
  const s = await getSession();
  if (!s) redirect("/login");
  const rows = await db
    .select()
    .from(schema.expenses)
    .where(eq(schema.expenses.coupleId, s.user.coupleId))
    .orderBy(desc(schema.expenses.dueDate));
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
    .where(eq(schema.cards.coupleId, s.user.coupleId));
  const children = await listChildrenByCouple(s.user.coupleId);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Lançamentos"
        title="Despesas"
        description="Tudo que entra e sai. Filtre por status, categoria, responsável ou cartão."
        action={
          <Button asChild leftIcon={<Plus className="h-4 w-4" />}>
            <Link href="/despesas/nova">Nova despesa</Link>
          </Button>
        }
      />
      <DespesasList
        rows={rows.map((r) => ({
          id: r.id,
          title: r.title,
          amountCents: r.amountCents,
          dueDate: r.dueDate,
          status: r.status,
          effectiveStatus: getEffectiveStatus(r.dueDate, r.status),
          categoryId: r.categoryId,
          responsible: r.responsible,
          cardId: r.cardId ?? null,
          paymentMethod: r.paymentMethod,
          isRecurring: !!r.recurringTemplateId,
        }))}
        ctx={{
          cats: cats.map((c) => ({ id: c.id, name: c.name })),
          cards: cards.map((c) => ({ id: c.id, name: c.name })),
          p1: s.user.couple.person1Label,
          p2: s.user.couple.person2Label,
          children: children.map((c) => ({ id: c.id, name: c.name })),
        }}
      />
    </div>
  );
}
