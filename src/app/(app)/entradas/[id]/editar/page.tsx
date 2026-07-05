import { getSession } from "@/lib/auth/session";
import { db, schema } from "@/lib/db";
import { and, eq } from "drizzle-orm";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { EditarEntradaForm } from "./editar-form";
import { formatDateBRFromISO } from "@/lib/dates";
import { listChildrenByCouple } from "@/lib/data/children";
import { isChildAccount, lockedResponsibleCtx, responsibleTagForChildUser } from "@/lib/auth/member";

function brFromCents(c: number) {
  return (c / 100).toFixed(2).replace(".", ",");
}

export default async function EditarEntradaPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await getSession();
  if (!s) redirect("/login");
  const [row] = await db
    .select()
    .from(schema.incomes)
    .where(
      and(eq(schema.incomes.id, id), eq(schema.incomes.coupleId, s.user.coupleId))
    );
  if (!row) notFound();
  const tag = responsibleTagForChildUser(s.user);
  if (isChildAccount(s.user)) {
    if (!tag || row.responsible !== tag) redirect("/entradas");
  }
  const cards = await db
    .select()
    .from(schema.cards)
    .where(
      and(eq(schema.cards.coupleId, s.user.coupleId), eq(schema.cards.isActive, true))
    );
  const children = await listChildrenByCouple(s.user.coupleId);
  const childRows = children.map((c) => ({ id: c.id, name: c.name }));

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link
          href="/entradas"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar para entradas
        </Link>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.025em]">Editar entrada</h1>
        <p className="mt-1.5 text-sm text-[var(--foreground-muted)] truncate">{row.title}</p>
      </div>
      <EditarEntradaForm
        incomeId={row.id}
        initial={{
          title: row.title,
          description: row.description ?? "",
          amount: brFromCents(row.amountCents),
          receivedDate: formatDateBRFromISO(row.receivedDate),
          cardId: row.cardId ?? "",
          responsible: row.responsible,
        }}
        ctx={{
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
