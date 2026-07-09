import { getSession } from "@/lib/auth/session";
import { getCardWalletSummaries } from "@/lib/services/cardWallet";
import { getRealBalanceBreakdown } from "@/lib/services/realBalance";
import { cardSupportsCredit, cardSupportsDebit } from "@/lib/cardKind";
import { formatBRL } from "@/lib/money";
import { formatDateBRFromISO } from "@/lib/dates";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, CreditCard as CreditCardIcon, AlertTriangle, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { WalletCard } from "@/components/cards/wallet-card";
import { PayInvoiceDialog } from "@/components/cards/pay-invoice-dialog";
import { Badge } from "@/components/ui/badge";

export default async function CartoesPage() {
  const s = await getSession();
  if (!s) redirect("/login");
  const [rows, balance] = await Promise.all([
    getCardWalletSummaries(s.user.coupleId),
    getRealBalanceBreakdown(s.user.coupleId),
  ]);
  const totLimit = rows.reduce(
    (acc, r) => acc + (cardSupportsCredit(r.card.cardKind) ? r.creditLimitCents : 0),
    0
  );
  const totUsed = rows.reduce((acc, r) => acc + r.creditUsedCents, 0);
  const totAvail = rows.reduce((acc, r) => acc + r.creditAvailableCents, 0);
  const totInvoice = rows.reduce((acc, r) => acc + r.currentInvoiceCents, 0);
  const cashRows = rows.filter((r) => cardSupportsDebit(r.card.cardKind));
  const totCardIncome = cashRows.reduce((acc, r) => acc + r.cardIncomeCents, 0);
  const totDebitUsed = cashRows.reduce((acc, r) => acc + r.debitUsedOnCardCents, 0);
  const totCashBalance = cashRows.reduce((acc, r) => acc + r.cardCashBalanceCents, 0);
  const ownerLabel = (o: string) =>
    o === "shared"
      ? "Compartilhado"
      : o === "person1"
        ? s.user.couple.person1Label
        : s.user.couple.person2Label;
  const alerts = rows.filter((r) => r.level !== "ok");

  const ownerGroups = (
    [
      { key: "shared", dot: "bg-[var(--foreground-subtle)]" },
      { key: "person1", dot: "bg-[var(--chart-1)]" },
      { key: "person2", dot: "bg-[var(--chart-6)]" },
    ] as const
  )
    .map((g) => ({
      ...g,
      label: ownerLabel(g.key),
      items: rows
        .filter((r) => r.card.owner === g.key)
        .sort((a, b) => a.card.name.localeCompare(b.card.name, "pt-BR")),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Carteira"
        title="Cartões"
        description="Linha de crédito e faturas separadas do saldo real da família."
        action={
          <Button asChild leftIcon={<Plus className="h-4 w-4" />}>
            <Link href="/cartoes/novo">Novo cartão</Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.1em] text-[var(--foreground-muted)]">
              Saldo real disponível
            </p>
            <p className="text-2xl font-semibold tabular text-[var(--foreground)] mt-1">
              {formatBRL(balance.realBalanceCents)}
            </p>
            <p className="text-xs text-[var(--foreground-muted)] mt-1">
              Entradas {formatBRL(balance.totalIncomesCents)} − saídas pagas{" "}
              {formatBRL(balance.paidNonCreditExpensesCents)}
            </p>
          </div>
          <p className="text-xs text-[var(--foreground-muted)] max-w-sm">
            O limite do cartão não entra no saldo. Compras no crédito aumentam a fatura; ao pagá-la, o saldo real é reduzido.
          </p>
        </CardContent>
      </Card>

      {rows.length > 0 && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <SummaryStat label="Cartões" value={String(rows.length).padStart(2, "0")} />
            <SummaryStat label="Limite crédito" value={formatBRL(totLimit)} />
            <SummaryStat label="Fatura em aberto" value={formatBRL(totUsed)} tone="warning" />
            <SummaryStat label="Limite disponível" value={formatBRL(totAvail)} tone="success" />
            <SummaryStat label="Fatura do ciclo" value={formatBRL(totInvoice)} />
          </div>
          {cashRows.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <SummaryStat label="Dinheiro entrou" value={formatBRL(totCardIncome)} />
              <SummaryStat label="Gasto no débito" value={formatBRL(totDebitUsed)} tone="warning" />
              <SummaryStat label="Saldo em conta" value={formatBRL(totCashBalance)} tone="success" />
            </div>
          )}
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
                Alertas em 70%, 85% e 95% do limite de crédito.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {rows.length === 0 ? (
        <EmptyState
          icon={<CreditCardIcon className="h-5 w-5" />}
          title="Nenhum cartão cadastrado"
          description="Adicione cartões para acompanhar limite, fatura e pagamentos."
          action={
            <Button asChild leftIcon={<Plus className="h-4 w-4" />}>
              <Link href="/cartoes/novo">Cadastrar cartão</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-8">
          {ownerGroups.map((group) => (
            <div key={group.key} className="space-y-3">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${group.dot}`} aria-hidden />
                <h2 className="text-sm font-semibold text-[var(--foreground)]">{group.label}</h2>
                <span className="text-xs text-[var(--foreground-muted)]">
                  {group.items.length} {group.items.length === 1 ? "cartão" : "cartões"}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {group.items.map((r) => (
                  <div key={r.card.id} className="space-y-3">
                    <div className="group relative">
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
                          available={r.creditAvailableCents}
                          percent={r.percent}
                          cardKind={r.card.cardKind}
                          debitUsedCents={r.debitUsedOnCardCents}
                          cardIncomeCents={r.cardIncomeCents}
                          cardCashBalanceCents={r.cardCashBalanceCents}
                          invoiceDueDate={r.currentInvoiceDueDate}
                        />
                      </Link>
                      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur px-2.5 py-1 text-[11px] font-semibold text-white ring-1 ring-white/30">
                          <Pencil className="h-3 w-3" />
                          Editar
                        </span>
                      </div>
                    </div>
                    {r.currentInvoiceId && r.currentInvoiceOutstandingCents > 0 && (
                      <div className="flex flex-wrap items-center gap-3 pl-1">
                        <Badge variant="warning">
                          Fatura {formatBRL(r.currentInvoiceOutstandingCents)} em aberto
                          {r.currentInvoiceDueDate && ` · vence ${formatDateBRFromISO(r.currentInvoiceDueDate)}`}
                        </Badge>
                        <PayInvoiceDialog
                          invoiceId={r.currentInvoiceId}
                          cardName={r.card.name}
                          outstandingCents={r.currentInvoiceOutstandingCents}
                          dueDate={r.currentInvoiceDueDate}
                        />
                      </div>
                    )}
                  </div>
                ))}
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
