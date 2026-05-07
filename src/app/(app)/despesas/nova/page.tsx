import { getSession } from "@/lib/auth/session";
import { db, schema } from "@/lib/db";
import { and, eq, isNull, or } from "drizzle-orm";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { NovaDespesaForm } from "./nova-form";
import { listChildrenByCouple } from "@/lib/data/children";
import { lockedResponsibleCtx } from "@/lib/auth/member";

export default async function NovaDespesaPage() {
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
    <div className="max-w-3xl space-y-6">
      <div>
        <Link
          href="/despesas"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar para despesas
        </Link>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.025em]">Nova despesa</h1>
        <p className="mt-1.5 text-sm text-[var(--foreground-muted)]">
          Cadastre um lançamento. Despesas em crédito abatem do limite do cartão automaticamente.
        </p>
      </div>
      <NovaDespesaForm
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
