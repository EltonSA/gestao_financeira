import { getSession } from "@/lib/auth/session";
import { db, schema } from "@/lib/db";
import { and, eq, isNull, or } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { EditarRecorrenteForm } from "./editar-form";
import { listChildrenByCouple } from "@/lib/data/children";
import { isChildAccount, lockedResponsibleCtx, responsibleTagForChildUser } from "@/lib/auth/member";

function brFromCents(c: number) {
  return (c / 100).toFixed(2).replace(".", ",");
}

export default async function EditarGastoFixoPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await getSession();
  if (!s) redirect("/login");
  const [r] = await db
    .select()
    .from(schema.recurringExpenses)
    .where(
      and(
        eq(schema.recurringExpenses.id, id),
        eq(schema.recurringExpenses.coupleId, s.user.coupleId)
      )
    );
  if (!r) notFound();
  const tag = responsibleTagForChildUser(s.user);
  if (isChildAccount(s.user)) {
    if (!tag || r.responsible !== tag) redirect("/gastos-fixos");
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
    <div className="max-w-2xl space-y-6">
      <div>
        <Link
          href="/gastos-fixos"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.025em]">Editar gasto fixo</h1>
        <p className="mt-1.5 text-sm text-[var(--foreground-muted)] truncate">{r.name}</p>
      </div>
      <EditarRecorrenteForm
        id={r.id}
        initial={{
          name: r.name,
          amount: brFromCents(r.amountCents),
          categoryId: r.categoryId,
          dayOfMonth: String(r.dayOfMonth),
          paymentMethod: r.paymentMethod,
          cardId: r.cardId ?? "",
          responsible: r.responsible,
        }}
        ctx={{
          cats: cats.map((c) => ({ id: c.id, name: c.name })),
          cards: cards.map((c) => ({ id: c.id, name: c.name })),
          p1: s.user.couple.person1Label,
          p2: s.user.couple.person2Label,
          children: childRows,
          ...lockedResponsibleCtx(s.user, childRows),
        }}
      />
    </div>
  );
}
