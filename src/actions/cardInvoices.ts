"use server";

import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireAdultAuth } from "@/lib/auth/member";
import { parseMoneyToCents } from "@/lib/money";
import { parseDateBR, ymdToday } from "@/lib/dates";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const paySchema = z.object({
  invoiceId: z.string().min(1),
  amount: z.string().min(1),
  paymentMethod: z.string().min(1),
  paidAt: z.string().optional(),
});

export async function payCardInvoiceAction(
  _prev: { error?: string; ok?: boolean },
  formData: FormData
) {
  const s = await requireAdultAuth();
  const r = paySchema.safeParse({
    invoiceId: formData.get("invoiceId"),
    amount: formData.get("amount"),
    paymentMethod: formData.get("paymentMethod"),
    paidAt: formData.get("paidAt") || undefined,
  });
  if (!r.success) return { error: "Dados inválidos" };

  const [invoice] = await db
    .select()
    .from(schema.cardInvoices)
    .where(
      and(
        eq(schema.cardInvoices.id, r.data.invoiceId),
        eq(schema.cardInvoices.coupleId, s.user.coupleId)
      )
    )
    .limit(1);
  if (!invoice) return { error: "Fatura não encontrada" };
  if (invoice.status === "paid") return { error: "Fatura já está quitada" };

  const amountCents = parseMoneyToCents(r.data.amount);
  if (amountCents <= 0) return { error: "Informe o valor do pagamento" };

  const outstanding = Math.max(
    0,
    invoice.totalAmountCents - invoice.paidAmountCents
  );
  if (amountCents > outstanding) {
    return {
      error: `Valor máximo em aberto: R$ ${(outstanding / 100).toFixed(2).replace(".", ",")}`,
    };
  }

  const paidAt =
    (r.data.paidAt && parseDateBR(r.data.paidAt)) || ymdToday();
  const newPaid = invoice.paidAmountCents + amountCents;
  const newStatus =
    newPaid >= invoice.totalAmountCents && invoice.totalAmountCents > 0
      ? "paid"
      : "partial_paid";

  const [card] = await db
    .select()
    .from(schema.cards)
    .where(eq(schema.cards.id, invoice.cardId))
    .limit(1);

  await db
    .update(schema.cardInvoices)
    .set({
      paidAmountCents: newPaid,
      status: newStatus,
      paidAt: newStatus === "paid" ? paidAt : invoice.paidAt ?? paidAt,
      paymentMethod: r.data.paymentMethod,
      updatedAt: new Date(),
    })
    .where(eq(schema.cardInvoices.id, invoice.id));

  if (newStatus === "paid") {
    const linked = await db
      .select()
      .from(schema.expenses)
      .where(eq(schema.expenses.cardInvoiceId, invoice.id));
    for (const exp of linked) {
      await db
        .update(schema.expenses)
        .set({
          status: "paid",
          paidAt,
          updatedByUserId: s.user.id,
          updatedAt: new Date(),
        })
        .where(eq(schema.expenses.id, exp.id));
    }
  }

  const cats = await db
    .select()
    .from(schema.categories)
    .where(eq(schema.categories.slug, "cartao-credito"))
    .limit(1);
  const categoryId = cats[0]?.id;
  if (categoryId) {
    await db.insert(schema.expenses).values({
      coupleId: s.user.coupleId,
      title: `Pagamento fatura — ${card?.name ?? "Cartão"}`,
      categoryId,
      amountCents,
      dueDate: paidAt,
      paidAt,
      paymentMethod: r.data.paymentMethod,
      responsible: "both",
      expenseType: "variable",
      status: "paid",
      createdByUserId: s.user.id,
      updatedByUserId: s.user.id,
    });
  }

  revalidatePath("/");
  revalidatePath("/cartoes");
  revalidatePath("/despesas");
  revalidatePath("/relatorios");
  return { ok: true };
}
