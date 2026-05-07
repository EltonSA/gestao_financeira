import "server-only";
import { and, eq, lt } from "drizzle-orm";
import { db, schema } from "@/lib/db";
function todayIso() {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
}

export async function syncOverdueForCouple(coupleId: string) {
  const today = todayIso();
  await db
    .update(schema.expenses)
    .set({ status: "overdue" })
    .where(
      and(
        eq(schema.expenses.coupleId, coupleId),
        eq(schema.expenses.status, "pending"),
        lt(schema.expenses.dueDate, today)
      )
    );
}
