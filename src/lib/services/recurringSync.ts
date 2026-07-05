import "server-only";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";

export function currentYearMonth(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function dueDateForRecurringDay(year: number, month: number, dayOfMonth: number) {
  const lastDay = new Date(year, month, 0).getDate();
  const day = Math.min(dayOfMonth, lastDay);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Gera despesas pendentes do mês a partir dos modelos ativos (idempotente por mês). */
export async function syncRecurringForCouple(coupleId: string, yearMonth?: string) {
  const ym = yearMonth ?? currentYearMonth();
  const [y, m] = ym.split("-").map(Number);

  const recs = await db
    .select()
    .from(schema.recurringExpenses)
    .where(
      and(
        eq(schema.recurringExpenses.coupleId, coupleId),
        eq(schema.recurringExpenses.isActive, true)
      )
    );

  for (const r of recs) {
    if (r.lastGeneratedYearMonth === ym) continue;

    const due = dueDateForRecurringDay(y, m, r.dayOfMonth);
    await db.insert(schema.expenses).values({
      coupleId,
      title: r.name,
      categoryId: r.categoryId,
      amountCents: r.amountCents,
      dueDate: due,
      paymentMethod: r.paymentMethod,
      cardId: r.cardId,
      responsible: r.responsible,
      expenseType: "fixed",
      status: "pending",
      recurrence: "monthly",
      recurringTemplateId: r.id,
      createdByUserId: r.createdByUserId,
    });

    await db
      .update(schema.recurringExpenses)
      .set({ lastGeneratedYearMonth: ym })
      .where(eq(schema.recurringExpenses.id, r.id));
  }
}

/** Cria modelo recorrente a partir de uma despesa fixa mensal recém-cadastrada. */
export async function createRecurringTemplateFromExpense(input: {
  coupleId: string;
  userId: string;
  title: string;
  amountCents: number;
  categoryId: string;
  dueDate: string;
  paymentMethod: string;
  cardId: string | null;
  responsible: string;
}) {
  const dayOfMonth = Number(input.dueDate.split("-")[2]);
  if (!dayOfMonth || dayOfMonth < 1 || dayOfMonth > 31) return null;

  const id = crypto.randomUUID();
  await db.insert(schema.recurringExpenses).values({
    id,
    coupleId: input.coupleId,
    name: input.title,
    amountCents: input.amountCents,
    categoryId: input.categoryId,
    dayOfMonth,
    paymentMethod: input.paymentMethod,
    cardId: input.cardId,
    responsible: input.responsible,
    isActive: true,
    createdByUserId: input.userId,
    lastGeneratedYearMonth: input.dueDate.slice(0, 7),
  });
  return id;
}
