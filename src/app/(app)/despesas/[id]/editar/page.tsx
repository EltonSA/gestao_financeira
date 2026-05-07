import { getSession } from "@/lib/auth/session";
import { db, schema } from "@/lib/db";
import { and, eq, isNull, or } from "drizzle-orm";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { EditarDespesaForm } from "./editar-form";
import { formatDateBRFromISO } from "@/lib/dates";
import { listChildrenByCouple } from "@/lib/data/children";
import { isChildAccount, lockedResponsibleCtx, responsibleTagForChildUser } from "@/lib/auth/member";

function brFromCents(c: number) {
  return (c / 100).toFixed(2).replace(".", ",");
}

export default async function EditarDespesaPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await getSession();
  if (!s) redirect("/login");
  const [e] = await db
    .select()
    .from(schema.expenses)
    .where(
      and(
        eq(schema.expenses.id, id),
        eq(schema.expenses.coupleId, s.user.coupleId)
      )
    );
  if (!e) notFound();
  const tag = responsibleTagForChildUser(s.user);
  if (isChildAccount(s.user)) {
    if (!tag || e.responsible !== tag) redirect("/despesas");
  }
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
    <div className="max-w-3xl space-y-6">
      <div>
        <Link
          href="/despesas"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar para despesas
        </Link>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.025em]">Editar despesa</h1>
        <p className="mt-1.5 text-sm text-[var(--foreground-muted)] truncate">
          {e.title}
        </p>
      </div>
      <EditarDespesaForm
        expenseId={e.id}
        initial={{
          title: e.title,
          description: e.description ?? "",
          categoryId: e.categoryId,
          amount: brFromCents(e.amountCents),
          dueDate: formatDateBRFromISO(e.dueDate),
          paidAt: e.paidAt ? formatDateBRFromISO(e.paidAt) : "",
          paymentMethod: e.paymentMethod,
          cardId: e.cardId ?? "",
          responsible: e.responsible,
          expenseType: e.expenseType,
          status: e.status,
          recurrence: e.recurrence,
        }}
        ctx={{
          cats: cats.map((c) => ({ id: c.id, name: c.name })),
          cards: cards.map((c) => ({ id: c.id, name: c.name, institution: c.institution })),
          p1: s.user.couple.person1Label,
          p2: s.user.couple.person2Label,
          children: childRows,
          ...lockedResponsibleCtx(s.user, childRows),
        }}
      />
    </div>
  );
}
