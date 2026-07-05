import "server-only";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { currentYearMonth, dueDateForRecurringDay } from "@/lib/services/recurringSync";

/** Gera entradas do mês a partir dos modelos ativos (idempotente por mês). */
export async function syncRecurringIncomesForCouple(coupleId: string, yearMonth?: string) {
  const ym = yearMonth ?? currentYearMonth();
  const [y, m] = ym.split("-").map(Number);

  const recs = await db
    .select()
    .from(schema.recurringIncomes)
    .where(
      and(
        eq(schema.recurringIncomes.coupleId, coupleId),
        eq(schema.recurringIncomes.isActive, true)
      )
    );

  for (const r of recs) {
    if (r.lastGeneratedYearMonth === ym) continue;

    const received = dueDateForRecurringDay(y, m, r.dayOfMonth);
    await db.insert(schema.incomes).values({
      coupleId,
      title: r.title,
      description: r.description,
      amountCents: r.amountCents,
      receivedDate: received,
      cardId: r.cardId,
      responsible: r.responsible,
      incomeType: "recurring",
      recurrence: "monthly",
      recurringTemplateId: r.id,
      createdByUserId: r.createdByUserId,
      updatedByUserId: r.createdByUserId,
    });

    await db
      .update(schema.recurringIncomes)
      .set({ lastGeneratedYearMonth: ym })
      .where(eq(schema.recurringIncomes.id, r.id));
  }
}

export async function createRecurringIncomeTemplate(input: {
  coupleId: string;
  userId: string;
  title: string;
  description?: string | null;
  amountCents: number;
  receivedDate: string;
  cardId: string | null;
  responsible: string;
}) {
  const dayOfMonth = Number(input.receivedDate.split("-")[2]);
  if (!dayOfMonth || dayOfMonth < 1 || dayOfMonth > 31) return null;

  const id = crypto.randomUUID();
  await db.insert(schema.recurringIncomes).values({
    id,
    coupleId: input.coupleId,
    title: input.title,
    description: input.description ?? null,
    amountCents: input.amountCents,
    dayOfMonth,
    cardId: input.cardId,
    responsible: input.responsible,
    isActive: true,
    createdByUserId: input.userId,
    lastGeneratedYearMonth: input.receivedDate.slice(0, 7),
  });
  return id;
}
