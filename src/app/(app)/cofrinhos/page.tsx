import { getSession } from "@/lib/auth/session";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { formatBRL } from "@/lib/money";
import { GOAL_CATEGORIES } from "@/lib/constants";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, PiggyBank, CalendarDays, Sparkles, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Progress } from "@/components/ui/progress";

const CATEGORY_GRAD: Record<string, string> = {
  travel:     "bg-grad-cyan",
  emergency:  "bg-grad-rose",
  purchase:   "bg-grad-violet",
  investment: "bg-grad-emerald",
  house:      "bg-grad-amber",
  car:        "bg-grad-slate",
  other:      "bg-grad-indigo",
};

export default async function CofrinhosPage() {
  const s = await getSession();
  if (!s) redirect("/login");
  const list = await db
    .select()
    .from(schema.goals)
    .where(eq(schema.goals.coupleId, s.user.coupleId));

  const totTarget = list.reduce((acc, g) => acc + g.targetCents, 0);
  const totSaved = list.reduce((acc, g) => acc + g.currentCents, 0);
  const totalPct = totTarget ? Math.min(100, (totSaved / totTarget) * 100) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Metas"
        title="Cofrinhos"
        description="Sonhem juntos. Definam objetivos e acompanhem o progresso de cada um."
        action={
          <Button asChild leftIcon={<Plus className="h-4 w-4" />}>
            <Link href="/cofrinhos/nova">Nova meta</Link>
          </Button>
        }
      />

      {list.length > 0 && (
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="caption uppercase tracking-[0.12em]">Progresso geral</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight tabular">
                  {formatBRL(totSaved)}
                  <span className="text-sm font-medium text-[var(--foreground-muted)] ml-1.5">
                    / {formatBRL(totTarget)}
                  </span>
                </p>
              </div>
              <Badge variant="primary" dot>
                {Math.round(totalPct)}% atingido
              </Badge>
            </div>
            <Progress value={totalPct} tone="primary" height={8} />
            <p className="text-xs text-[var(--foreground-muted)]">
              {list.length} meta{list.length === 1 ? "" : "s"} ativa{list.length === 1 ? "" : "s"}.
            </p>
          </CardContent>
        </Card>
      )}

      {list.length === 0 ? (
        <EmptyState
          icon={<PiggyBank className="h-5 w-5" />}
          title="Comece a sonhar juntos"
          description="Crie a primeira meta — uma viagem, reserva de emergência, casa ou qualquer objetivo do casal."
          action={
            <Button asChild leftIcon={<Plus className="h-4 w-4" />}>
              <Link href="/cofrinhos/nova">Criar primeira meta</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {list.map((g) => {
            const pct = g.targetCents ? Math.min(100, (g.currentCents / g.targetCents) * 100) : 0;
            const remaining = Math.max(0, g.targetCents - g.currentCents);
            const grad = CATEGORY_GRAD[g.goalCategory] ?? "bg-grad-indigo";
            const catLabel = GOAL_CATEGORIES.find((c) => c.value === g.goalCategory)?.label;
            const completed = pct >= 100;
            return (
              <Link
                key={g.id}
                href={`/cofrinhos/${g.id}/editar`}
                aria-label={`Abrir meta ${g.name}`}
                className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 rounded-2xl"
              >
                <Card hover className="overflow-hidden cursor-pointer">
                  <div className={`relative ${grad} card-noise text-white p-5 pb-7`}>
                    <div className="flex items-start justify-between">
                      <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/15 backdrop-blur ring-1 ring-white/30">
                        <PiggyBank className="h-4 w-4" />
                      </div>
                      <div className="flex items-center gap-1.5">
                        {completed && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-semibold backdrop-blur ring-1 ring-white/30">
                            <Sparkles className="h-3 w-3" />
                            Concluído
                          </span>
                        )}
                        <span className="grid h-7 w-7 place-items-center rounded-full bg-white/15 backdrop-blur ring-1 ring-white/30 transition-transform group-hover:translate-x-0.5">
                          <ChevronRight className="h-4 w-4" />
                        </span>
                      </div>
                    </div>
                    <h3 className="mt-4 text-lg font-semibold tracking-tight">{g.name}</h3>
                    {catLabel && (
                      <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-white/70 font-medium">
                        {catLabel}
                      </p>
                    )}
                  </div>
                  <CardContent className="p-5 -mt-4 relative">
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-xs)] space-y-3">
                      <div className="flex items-end justify-between gap-2">
                        <div>
                          <p className="caption">Acumulado</p>
                          <p className="text-lg font-semibold tabular tracking-tight">
                            {formatBRL(g.currentCents)}
                          </p>
                        </div>
                        <p className="text-xs text-[var(--foreground-muted)] tabular">
                          de {formatBRL(g.targetCents)}
                        </p>
                      </div>
                      <Progress value={pct} tone={completed ? "success" : "primary"} />
                      <div className="flex items-center justify-between text-[11px] text-[var(--foreground-muted)]">
                        <span className="tabular">{Math.round(pct)}%</span>
                        <span className="tabular">
                          {completed ? "Meta batida! 🎉" : `Falta ${formatBRL(remaining)}`}
                        </span>
                      </div>
                    </div>
                    {g.dueDate && (
                      <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-[var(--foreground-muted)]">
                        <CalendarDays className="h-3.5 w-3.5" />
                        Prazo: <span className="font-medium tabular">{g.dueDate.split("-").reverse().join("/")}</span>
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
