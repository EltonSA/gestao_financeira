import { getSession } from "@/lib/auth/session";
import { db, schema } from "@/lib/db";
import { and, desc, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, History } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EditarMetaForm, AporteButton } from "./editar-form";
import { Progress } from "@/components/ui/progress";
import { formatBRL } from "@/lib/money";
import { formatDateBRFromISO } from "@/lib/dates";
import { listChildrenByCouple } from "@/lib/data/children";
import { isChildAccount, lockedResponsibleCtx, responsibleTagForChildUser } from "@/lib/auth/member";

function brFromCents(c: number) {
  return (c / 100).toFixed(2).replace(".", ",");
}

export default async function EditarMetaPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await getSession();
  if (!s) redirect("/login");
  const [g] = await db
    .select()
    .from(schema.goals)
    .where(and(eq(schema.goals.id, id), eq(schema.goals.coupleId, s.user.coupleId)));
  if (!g) notFound();
  const tag = responsibleTagForChildUser(s.user);
  if (isChildAccount(s.user)) {
    if (!tag || g.responsible !== tag) redirect("/cofrinhos");
  }
  const contributions = await db
    .select()
    .from(schema.goalContributions)
    .where(eq(schema.goalContributions.goalId, id))
    .orderBy(desc(schema.goalContributions.date))
    .limit(20);
  const children = await listChildrenByCouple(s.user.coupleId);
  const childRows = children.map((c) => ({ id: c.id, name: c.name }));

  const pct = g.targetCents ? Math.min(100, (g.currentCents / g.targetCents) * 100) : 0;
  const remaining = Math.max(0, g.targetCents - g.currentCents);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link
          href="/cofrinhos"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar para cofrinhos
        </Link>
        <div className="mt-3 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-[-0.025em]">Editar meta</h1>
            <p className="mt-1.5 text-sm text-[var(--foreground-muted)] truncate">{g.name}</p>
          </div>
          <AporteButton goalId={g.id} />
        </div>
      </div>

      {/* Progresso atual */}
      <Card>
        <CardContent className="p-5 space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="caption uppercase tracking-[0.1em]">Acumulado</p>
              <p className="mt-1 text-2xl font-semibold tabular tracking-tight">
                {formatBRL(g.currentCents)}
                <span className="text-sm font-medium text-[var(--foreground-muted)] ml-1.5">
                  / {formatBRL(g.targetCents)}
                </span>
              </p>
            </div>
            <p className="text-xs text-[var(--foreground-muted)] tabular">
              {pct >= 100 ? "Meta batida 🎉" : `Falta ${formatBRL(remaining)}`}
            </p>
          </div>
          <Progress value={pct} tone={pct >= 100 ? "success" : "primary"} height={8} />
        </CardContent>
      </Card>

      <EditarMetaForm
        goalId={g.id}
        initial={{
          name: g.name,
          description: g.description ?? "",
          targetBRL: brFromCents(g.targetCents),
          currentBRL: brFromCents(g.currentCents),
          dueDate: g.dueDate ? formatDateBRFromISO(g.dueDate) : "",
          responsible: g.responsible,
          goalCategory: g.goalCategory,
        }}
        ctx={{
          p1: s.user.couple.person1Label,
          p2: s.user.couple.person2Label,
          children: childRows,
          ...lockedResponsibleCtx(s.user, childRows),
        }}
      />

      {/* Histórico de aportes */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle className="inline-flex items-center gap-2">
              <History className="h-4 w-4 text-[var(--primary)]" />
              Histórico de aportes
            </CardTitle>
            <CardDescription>
              {contributions.length === 0
                ? "Nenhum aporte registrado ainda"
                : `${contributions.length} aporte${contributions.length === 1 ? "" : "s"}`}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {contributions.length === 0 ? (
            <p className="text-xs text-[var(--foreground-muted)] py-4 text-center">
              Use o botão &ldquo;Novo aporte&rdquo; acima para registrar valores guardados.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--border-subtle)]">
              {contributions.map((c) => (
                <li key={c.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--success-soft)] text-[var(--success-strong)]">
                    <History className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--foreground)] truncate">
                      {c.note ?? "Aporte"}
                    </p>
                    <p className="text-[11px] text-[var(--foreground-muted)] tabular">
                      {formatDateBRFromISO(c.date)}
                    </p>
                  </div>
                  <p className="tabular text-sm font-semibold text-[var(--success-strong)]">
                    + {formatBRL(c.amountCents)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
