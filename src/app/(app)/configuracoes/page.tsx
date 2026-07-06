import { and, desc, eq, isNull } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { updateCoupleAction, updateFinancialCycleAction } from "@/actions/settings";
import { redirect } from "next/navigation";
import { db, schema } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { InviteCard } from "@/components/settings/invite-card";
import { ChangePasswordDialog } from "@/components/settings/change-password-dialog";
import { RemoveMemberButton } from "@/components/settings/remove-member-button";
import { addChildAction, createChildInviteAction, deleteChildAction, updateChildNameAction } from "@/actions/children";
import { listChildrenByCouple, listChildAccountsByCouple } from "@/lib/data/children";
import { isChildAccount } from "@/lib/auth/member";
import { CheckCircle2, Heart, Baby } from "lucide-react";

export default async function ConfigPage({
  searchParams,
}: { searchParams: Promise<{ child?: string; filhoConvite?: string; filhoConta?: string; cycle?: string }> }) {
  const sp = await searchParams;
  const s = await getSession();
  if (!s) redirect("/login");
  if (isChildAccount(s.user)) redirect("/");
  const c = s.user.couple;

  const members = await db
    .select({
      id: schema.users.id,
      name: schema.users.name,
      email: schema.users.email,
      role: schema.users.roleInCouple,
      linkedChildId: schema.users.linkedChildId,
      createdAt: schema.users.createdAt,
    })
    .from(schema.users)
    .where(eq(schema.users.coupleId, s.user.coupleId))
    .orderBy(desc(schema.users.createdAt));

  members.sort((a, b) => {
    if (!a.linkedChildId && b.linkedChildId) return -1;
    if (a.linkedChildId && !b.linkedChildId) return 1;
    if (a.role === "person1") return -1;
    if (b.role === "person1") return 1;
    return 0;
  });

  const adults = members.filter((m) => !m.linkedChildId);
  const isFull = adults.length >= 2;

  const childrenList = await listChildrenByCouple(s.user.coupleId);
  const childAccounts = await listChildAccountsByCouple(s.user.coupleId);
  const accountByChildId = Object.fromEntries(
    childAccounts
      .filter((a) => a.linkedChildId)
      .map((a) => [a.linkedChildId as string, a])
  );

  let inviteUrl: string | null = null;
  let expiresAt: Date | null = null;
  let inviteStatus: "ok" | "expired" | "missing" = "missing";

  if (!isFull) {
    const [inv] = await db
      .select()
      .from(schema.coupleInvites)
      .where(
        and(
          eq(schema.coupleInvites.coupleId, s.user.coupleId),
          isNull(schema.coupleInvites.usedAt)
        )
      )
      .orderBy(desc(schema.coupleInvites.expiresAt))
      .limit(1);

    if (inv) {
      const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      expiresAt = inv.expiresAt;
      if (inv.expiresAt > new Date()) {
        inviteUrl = `${base}/registro?token=${inv.token}`;
        inviteStatus = "ok";
      } else {
        inviteStatus = "expired";
      }
    }
  }

  return (
    <div className="w-full space-y-6">
      <PageHeader
        eyebrow="Conta"
        title="Configurações da família"
        description="Nome do casal, filhos (com link para criarem conta e lançarem) e convite do parceiro(a)."
      />

      {sp.filhoConta === "1" && (
        <p className="text-sm text-[var(--foreground-muted)] rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3">
          Este filho(a) já tem conta cadastrada. Ele(a) pode entrar em <strong>Entrar</strong> com o e-mail cadastrado.
        </p>
      )}
      {sp.filhoConvite && (
        <div className="rounded-xl border border-[var(--primary)]/25 bg-[var(--primary-soft)] px-4 py-3 space-y-2">
          <p className="text-sm font-medium text-[var(--foreground)]">Link para cadastro do filho(a)</p>
          <p className="text-xs text-[var(--foreground-muted)] break-all font-mono">
            {(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000")}/registro/filho?token=
            {decodeURIComponent(sp.filhoConvite)}
          </p>
          <p className="text-[11px] text-[var(--foreground-muted)]">
            Válido por 7 dias. Envie por WhatsApp ou e-mail. Cada link só pode ser usado uma vez.
          </p>
        </div>
      )}

      {sp.child === "ok" && (
        <p className="text-sm text-[var(--success-strong)] rounded-xl border border-[var(--success)]/30 bg-[var(--success-soft)] px-4 py-3">
          Alterações nos filhos salvas.
        </p>
      )}
      {sp.child === "removed" && (
        <p className="text-sm text-[var(--foreground-muted)] rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3">
          Filho(a) removido(a) da lista.
        </p>
      )}
      {sp.child === "in_use" && (
        <p className="text-sm text-[var(--warning-strong)] rounded-xl border border-[var(--warning)]/30 bg-[var(--warning-soft)] px-4 py-3">
          Não é possível remover enquanto existir despesa, gasto fixo ou meta com esse responsável.
        </p>
      )}
      {sp.child === "err" && (
        <p className="text-sm text-[var(--danger-strong)] rounded-xl border border-[var(--danger)]/30 bg-[var(--danger-soft)] px-4 py-3">
          Não foi possível salvar. Verifique o nome e tente de novo.
        </p>
      )}

      <Card>
        <CardContent className="p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-3">
              <Avatar name={c.person1Label} size="lg" />
              <Avatar name={c.person2Label} size="lg" />
            </div>
            <div>
              <p className="text-base font-semibold tracking-tight">{c.name}</p>
              <p className="text-xs text-[var(--foreground-muted)]">
                {c.person1Label} & {c.person2Label}
              </p>
            </div>
          </div>

          <form action={updateCoupleAction} className="space-y-4">
            <Field label="Nome do casal">
              <Input
                name="name"
                defaultValue={c.name}
                required
                placeholder="Ex.: Elton & Letícia"
              />
            </Field>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Rótulo pessoa 1">
                <Input
                  name="person1Label"
                  defaultValue={c.person1Label}
                  required
                />
              </Field>
              <Field label="Rótulo pessoa 2">
                <Input
                  name="person2Label"
                  defaultValue={c.person2Label}
                  required
                />
              </Field>
            </div>
            <div className="pt-2">
              <Button type="submit" block>
                Salvar alterações
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-5">
          <div>
            <h3 className="text-base font-semibold tracking-tight">Ciclo financeiro</h3>
            <p className="text-xs text-[var(--foreground-muted)] mt-1">
              Define quando começa o período para dashboard, relatórios e insights (ex.: 5º dia útil do mês).
            </p>
          </div>
          {sp.cycle === "ok" && (
            <p className="text-sm text-[var(--success-strong)]">Ciclo financeiro salvo.</p>
          )}
          {sp.cycle === "err" && (
            <p className="text-sm text-[var(--danger-strong)]">Verifique os valores e tente novamente.</p>
          )}
          <form action={updateFinancialCycleAction} className="space-y-4">
            <Field label="Tipo de início">
              <select
                name="financialCycleStartType"
                defaultValue={c.financialCycleStartType}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
              >
                <option value="fixed_day">Dia fixo do mês</option>
                <option value="business_day">Dia útil do mês</option>
              </select>
            </Field>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Dia fixo (1–31)" hint="Quando tipo = dia fixo">
                <Input
                  name="financialCycleStartDay"
                  type="number"
                  min={1}
                  max={31}
                  defaultValue={c.financialCycleStartDay}
                  required
                />
              </Field>
              <Field label="Nº dia útil" hint="Ex.: 5 = 5º dia útil (seg–sex)">
                <Input
                  name="financialCycleBusinessDayNumber"
                  type="number"
                  min={1}
                  max={23}
                  defaultValue={c.financialCycleBusinessDayNumber}
                  required
                />
              </Field>
            </div>
            <Button type="submit" block>
              Salvar ciclo financeiro
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
              <Baby className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-base font-semibold tracking-tight">Filhos</h3>
              <p className="text-xs text-[var(--foreground-muted)]">
                Cadastre quem faz parte da família. Gere um link para o filho(a) criar login e adicionar despesas no próprio nome.
              </p>
            </div>
          </div>

          <form action={addChildAction} className="flex flex-col sm:flex-row gap-2 sm:items-end">
            <Field label="Nome" className="flex-1 min-w-0">
              <Input name="childName" required placeholder="Ex.: Maria" maxLength={80} />
            </Field>
            <Button type="submit" className="sm:shrink-0">
              Adicionar
            </Button>
          </form>

          {childrenList.length === 0 ? (
            <p className="text-xs text-[var(--foreground-muted)] py-2">
              Nenhum filho cadastrado ainda.
            </p>
          ) : (
            <ul className="space-y-3">
              {childrenList.map((ch) => (
                <li
                  key={ch.id}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3 space-y-3"
                >
                  <form action={updateChildNameAction} className="flex flex-col sm:flex-row gap-2 sm:items-end">
                    <input type="hidden" name="childId" value={ch.id} />
                    <Field label="Nome" className="flex-1 min-w-0">
                      <Input name="childName" required defaultValue={ch.name} maxLength={80} />
                    </Field>
                    <Button type="submit" variant="secondary" className="sm:shrink-0">
                      Salvar nome
                    </Button>
                  </form>
                  <form action={deleteChildAction} className="flex justify-end">
                    <input type="hidden" name="childId" value={ch.id} />
                    <Button type="submit" variant="ghost" className="text-[var(--danger-strong)] text-xs h-8">
                      Remover da lista
                    </Button>
                  </form>
                  {accountByChildId[ch.id] ? (
                    <p className="text-[11px] text-[var(--foreground-muted)]">
                      Conta ativa: <span className="font-medium text-[var(--foreground)]">{accountByChildId[ch.id].email}</span>
                    </p>
                  ) : (
                    <form action={createChildInviteAction} className="pt-1">
                      <input type="hidden" name="childId" value={ch.id} />
                      <Button type="submit" variant="secondary" size="sm" className="w-full sm:w-auto">
                        Gerar link para criar conta
                      </Button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold tracking-tight">
                Membros do casal
              </h3>
              <p className="text-xs text-[var(--foreground-muted)]">
                {isFull
                  ? "Vocês dois já têm acesso à conta."
                  : "Apenas você tem acesso. Convide seu parceiro(a) abaixo."}
              </p>
            </div>
            <Badge variant={isFull ? "success" : "warning"} dot>
              {adults.length}/2
            </Badge>
          </div>

          <div className="space-y-2">
            {adults.map((m) => {
              const isYou = m.id === s.user.id;
              return (
                <div
                  key={m.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar name={m.name} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{m.name}</p>
                        {isYou && (
                          <Badge variant="primary" className="text-[10px]">
                            Você
                          </Badge>
                        )}
                        {m.role === "person1" && !m.linkedChildId && (
                          <Badge variant="neutral" className="text-[10px]">
                            Criou o casal
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-[var(--foreground-muted)] truncate">
                        {m.email}
                      </p>
                    </div>
                    {!isYou && (
                      <CheckCircle2 className="h-4 w-4 text-[var(--success)] shrink-0 hidden sm:block" />
                    )}
                  </div>
                  {isYou ? (
                    <div className="flex items-center gap-2 sm:shrink-0 pl-12 sm:pl-0">
                      <ChangePasswordDialog />
                      <CheckCircle2 className="h-4 w-4 text-[var(--success)] shrink-0" />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 sm:shrink-0 pl-12 sm:pl-0">
                      <RemoveMemberButton userId={m.id} memberName={m.name} variant="adult" />
                      <CheckCircle2 className="h-4 w-4 text-[var(--success)] shrink-0" />
                    </div>
                  )}
                </div>
              );
            })}

            {members.filter((m) => m.linkedChildId).map((m) => {
              const isYou = m.id === s.user.id;
              return (
                <div
                  key={m.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar name={m.name} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium truncate">{m.name}</p>
                        {isYou && (
                          <Badge variant="primary" className="text-[10px]">
                            Você
                          </Badge>
                        )}
                        <Badge variant="neutral" className="text-[10px]">
                          Filho(a)
                        </Badge>
                      </div>
                      <p className="text-xs text-[var(--foreground-muted)] truncate">
                        {m.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:shrink-0 pl-12 sm:pl-0">
                    <RemoveMemberButton userId={m.id} memberName={m.name} variant="child" />
                    <CheckCircle2 className="h-4 w-4 text-[var(--success)] shrink-0" />
                  </div>
                </div>
              );
            })}

            {!isFull && (
              <div className="flex items-center gap-3 rounded-xl border border-dashed border-[var(--border)] p-3 text-[var(--foreground-muted)]">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--surface-muted)] border border-dashed border-[var(--border)]">
                  <Heart className="h-4 w-4" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--foreground)]">
                    Aguardando parceiro(a)
                  </p>
                  <p className="text-xs">
                    Envie o link de convite para vocês compartilharem a conta.
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {!isFull && (
        <InviteCard
          inviteUrl={inviteUrl}
          expiresAt={expiresAt}
          hasInvite={inviteStatus === "ok"}
          status={inviteStatus}
        />
      )}
    </div>
  );
}
