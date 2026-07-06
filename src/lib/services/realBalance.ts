import "server-only";
import { and, eq, sum } from "drizzle-orm";
import { db, schema } from "@/lib/db";

/**
 * Saldo real = entradas − despesas pagas que saem do caixa (tudo exceto crédito).
 * Pagamento de fatura gera despesa paga (pix/transferência etc.) e reduz o saldo.
 * Compras no crédito permanecem pendentes até a fatura ser paga.
 */
export async function getRealBalanceCents(coupleId: string): Promise<number> {
  const b = await getRealBalanceBreakdown(coupleId);
  return b.realBalanceCents;
}

export async function getRealBalanceBreakdown(coupleId: string) {
  const [incRow] = await db
    .select({ s: sum(schema.incomes.amountCents) })
    .from(schema.incomes)
    .where(eq(schema.incomes.coupleId, coupleId));

  const paidRows = await db
    .select({
      amountCents: schema.expenses.amountCents,
      paymentMethod: schema.expenses.paymentMethod,
    })
    .from(schema.expenses)
    .where(
      and(
        eq(schema.expenses.coupleId, coupleId),
        eq(schema.expenses.status, "paid")
      )
    );

  const paidNonCredit = paidRows
    .filter((e) => e.paymentMethod !== "credit")
    .reduce((a, e) => a + e.amountCents, 0);

  const totalIncomes = Number(incRow?.s ?? 0);
  const balance = totalIncomes - paidNonCredit;

  return {
    totalIncomesCents: totalIncomes,
    paidNonCreditExpensesCents: paidNonCredit,
    realBalanceCents: balance,
  };
}
