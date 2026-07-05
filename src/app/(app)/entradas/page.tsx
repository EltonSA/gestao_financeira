import { getSession } from "@/lib/auth/session";
import { db, schema } from "@/lib/db";
import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { EntradasList } from "./entradas-list";
import { listChildrenByCouple } from "@/lib/data/children";

export default async function EntradasPage() {
  const s = await getSession();
  if (!s) redirect("/login");
  const rows = await db
    .select()
    .from(schema.incomes)
    .where(eq(schema.incomes.coupleId, s.user.coupleId))
    .orderBy(desc(schema.incomes.receivedDate));
  const cards = await db
    .select()
    .from(schema.cards)
    .where(eq(schema.cards.coupleId, s.user.coupleId));
  const children = await listChildrenByCouple(s.user.coupleId);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Receitas"
        title="Entradas"
        description="Valores que entram para o casal: salário, PIX, reembolsos. Opcionalmente vincule ao cartão em que o dinheiro caiu."
        action={
          <Button asChild leftIcon={<Plus className="h-4 w-4" />}>
            <Link href="/entradas/nova">Nova entrada</Link>
          </Button>
        }
      />
      <EntradasList
        rows={rows.map((r) => ({
          id: r.id,
          title: r.title,
          amountCents: r.amountCents,
          receivedDate: r.receivedDate,
          responsible: r.responsible,
          cardId: r.cardId ?? null,
        }))}
        ctx={{
          cards: cards.map((c) => ({ id: c.id, name: c.name })),
          p1: s.user.couple.person1Label,
          p2: s.user.couple.person2Label,
          children: children.map((c) => ({ id: c.id, name: c.name })),
        }}
      />
    </div>
  );
}
