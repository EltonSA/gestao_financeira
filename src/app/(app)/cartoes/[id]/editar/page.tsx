import { getSession } from "@/lib/auth/session";
import { db, schema } from "@/lib/db";
import { and, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { EditarCartaoForm } from "./editar-form";
import { isChildAccount } from "@/lib/auth/member";

function brFromCents(c: number) {
  return (c / 100).toFixed(2).replace(".", ",");
}

export default async function EditarCartaoPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await getSession();
  if (!s) redirect("/login");
  if (isChildAccount(s.user)) redirect("/cartoes");
  const [c] = await db
    .select()
    .from(schema.cards)
    .where(and(eq(schema.cards.id, id), eq(schema.cards.coupleId, s.user.coupleId)));
  if (!c) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link
          href="/cartoes"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar para cartões
        </Link>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.025em]">Editar cartão</h1>
        <p className="mt-1.5 text-sm text-[var(--foreground-muted)] truncate">{c.name}</p>
      </div>
      <EditarCartaoForm
        cardId={c.id}
        initial={{
          name: c.name,
          institution: c.institution,
          owner: c.owner,
          limitBRL: brFromCents(c.limitTotalCents),
          closingDay: String(c.closingDay),
          dueDay: String(c.dueDay),
          color: c.color,
          isActive: c.isActive,
        }}
        ctx={{ p1: s.user.couple.person1Label, p2: s.user.couple.person2Label }}
      />
    </div>
  );
}
