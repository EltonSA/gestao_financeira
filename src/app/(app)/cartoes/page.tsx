import { getSession } from "@/lib/auth/session";
import { getCardWalletSummaries } from "@/lib/services/cardWallet";
import { cardSupportsCredit } from "@/lib/cardKind";
import { formatBRL } from "@/lib/money";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, CreditCard as CreditCardIcon, AlertTriangle, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { WalletCard } from "@/components/cards/wallet-card";

export default async function CartoesPage() {
  const s = await getSession();
  if (!s) redirect("/login");
  const rows = await getCardWalletSummaries(s.user.coupleId);
  const totLimit = rows.reduce(
    (acc, r) => acc + (cardSupportsCredit(r.card.cardKind) ? r.creditLimitCents : 0),
    0
  );
  const totUsed = rows.reduce((acc, r) => acc + r.creditUsedCents, 0);
  const totAvail = rows.reduce((acc, r) => acc + r.effectiveCreditAvailableCents, 0);
  const totDebitUsed = rows.reduce((acc, r) => acc + r.debitUsedOnCardCents, 0);
  const ownerLabel = (o: string) =>
    o === "shared"
      ? "Compartilhado"
      : o === "person1"
        ? s.user.couple.person1Label
        : s.user.couple.person2Label;
  const alerts = rows.filter((r) => r.level !== "ok");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Carteira"
        title="Cartões"
        description="Crédito (limite e fatura), débito (gastos na função) e entradas vinculadas ao cartão."
        action={
          <Button asChild leftIcon={<Plus className="h-4 w-4" />}>
            <Link href="/cartoes/novo">Novo cartão</Link>
          </Button>
        }
      />

      {rows.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <SummaryStat label="Cartões" value={String(rows.length).padStart(2, "0")} />
          <SummaryStat label="Limite crédito" value={formatBRL(totLimit)} />
          <SummaryStat label="Fatura crédito" value={formatBRL(totUsed)} tone="warning" />
          <SummaryStat label="Disp. crédito" value={formatBRL(totAvail)} tone="success" />
          <SummaryStat label="Gasto débito" value={formatBRL(totDebitUsed)} />
        </div>
      )}

      {alerts.length > 0 && (
        <Card className="border-[var(--warning-soft)] bg-[var(--warning-bg)]">
          <CardContent className="flex items-start gap-3 p-4">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--warning-soft)] text-[var(--warning-strong)]">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div className="flex-1 text-sm">
              <p className="font-semibold text-[var(--warning-strong)]">
                {alerts.length} cartão(ões) com uso elevado
              </p>
              <p className="text-xs text-[var(--warning-strong)]/80 mt-0.5">
                Alertas em 70%, 85% e 95% do limite. Reduza compras parceladas para os próximos meses.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {rows.length === 0 ? (
        <EmptyState
          icon={<CreditCardIcon className="h-5 w-5" />}
          title="Nenhum cartão cadastrado"
          description="Adicione o primeiro cartão para acompanhar limite usado e disponível em tempo real."
          action={
            <Button asChild leftIcon={<Plus className="h-4 w-4" />}>
              <Link href="/cartoes/novo">Cadastrar cartão</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {rows.map((r) => (
            <div key={r.card.id} className="group relative">
              <Link
                href={`/cartoes/${r.card.id}/editar`}
                aria-label={`Editar ${r.card.name}`}
                className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 rounded-2xl"
              >
                <WalletCard
                  name={r.card.name}
                  institution={r.card.institution}
                  ownerLabel={ownerLabel(r.card.owner)}
                  used={r.creditUsedCents}
                  limit={r.creditLimitCents}
                  available={r.effectiveCreditAvailableCents}
                  percent={r.percent}
                  cardKind={r.card.cardKind}
                  debitUsedCents={r.debitUsedOnCardCents}
                  incomeOnCardCents={r.incomeOnCardCents}
                  liquidAfterDebitCents={r.liquidAfterDebitCents}
                />
              </Link>
              {/* Quick edit chip — visível ao hover */}
              <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur px-2.5 py-1 text-[11px] font-semibold text-white ring-1 ring-white/30">
                  <Pencil className="h-3 w-3" />
                  Editar
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "success" | "warning" | "danger";
}) {
  const toneClass =
    tone === "success"
      ? "text-[var(--success-strong)]"
      : tone === "warning"
        ? "text-[var(--warning-strong)]"
        : tone === "danger"
          ? "text-[var(--danger-strong)]"
          : "text-[var(--foreground)]";
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="text-[11px] uppercase tracking-[0.1em] font-medium text-[var(--foreground-muted)]">{label}</p>
      <p className={`mt-1 text-lg font-semibold tabular tracking-tight ${toneClass}`}>{value}</p>
    </div>
  );
}
