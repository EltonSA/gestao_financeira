import { getSession } from "@/lib/auth/session";
import { db, schema } from "@/lib/db";
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { NovaEntradaForm } from "./nova-form";
import { listChildrenByCouple } from "@/lib/data/children";
import { lockedResponsibleCtx } from "@/lib/auth/member";
import { formatDateBRFromISO } from "@/lib/dates";

export default async function NovaEntradaPage() {
  const s = await getSession();
  if (!s) redirect("/login");
  const cards = await db
    .select()
    .from(schema.cards)
    .where(
      and(eq(schema.cards.coupleId, s.user.coupleId), eq(schema.cards.isActive, true))
    );
  const children = await listChildrenByCouple(s.user.coupleId);
  const childRows = children.map((c) => ({ id: c.id, name: c.name }));
  const today = new Date();
  const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link
          href="/entradas"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar para entradas
        </Link>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.025em]">Nova entrada</h1>
        <p className="mt-1.5 text-sm text-[var(--foreground-muted)]">
          Registre o que entrou no caixa do casal. O cartão é opcional — use quando o valor caiu na conta daquele cartão.
        </p>
      </div>
      <NovaEntradaForm
        ctx={{
          cards: cards.map((c) => ({ id: c.id, name: c.name, institution: c.institution })),
          p1: s.user.couple.person1Label,
          p2: s.user.couple.person2Label,
          children: childRows,
          ...lockedResponsibleCtx(s.user, childRows),
        }}
        defaults={{ receivedDate: formatDateBRFromISO(iso) }}
      />
    </div>
  );
}
