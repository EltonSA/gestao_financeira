import "server-only";
import { and, asc, eq, isNotNull, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import {
  childResponsibleValue,
  parseChildIdFromResponsible,
} from "@/lib/responsible";

export async function listChildrenByCouple(coupleId: string) {
  return db
    .select({
      id: schema.coupleChildren.id,
      name: schema.coupleChildren.name,
      sortOrder: schema.coupleChildren.sortOrder,
    })
    .from(schema.coupleChildren)
    .where(eq(schema.coupleChildren.coupleId, coupleId))
    .orderBy(asc(schema.coupleChildren.sortOrder), asc(schema.coupleChildren.name));
}

export async function assertResponsibleBelongsToCouple(
  coupleId: string,
  responsible: string
): Promise<boolean> {
  if (responsible === "person1" || responsible === "person2" || responsible === "both") {
    return true;
  }
  const childId = parseChildIdFromResponsible(responsible);
  if (!childId) return false;
  const [row] = await db
    .select({ id: schema.coupleChildren.id })
    .from(schema.coupleChildren)
    .where(
      and(
        eq(schema.coupleChildren.id, childId),
        eq(schema.coupleChildren.coupleId, coupleId)
      )
    )
    .limit(1);
  return !!row;
}

export async function childIdBelongsToCouple(childId: string, coupleId: string) {
  const [row] = await db
    .select({ id: schema.coupleChildren.id })
    .from(schema.coupleChildren)
    .where(
      and(eq(schema.coupleChildren.id, childId), eq(schema.coupleChildren.coupleId, coupleId))
    )
    .limit(1);
  return !!row;
}

export async function listChildAccountsByCouple(coupleId: string) {
  return db
    .select({
      linkedChildId: schema.users.linkedChildId,
      email: schema.users.email,
      name: schema.users.name,
    })
    .from(schema.users)
    .where(
      and(eq(schema.users.coupleId, coupleId), isNotNull(schema.users.linkedChildId))
    );
}

export async function countReferencesToChild(coupleId: string, childId: string) {
  const tag = childResponsibleValue(childId);
  const [ex] = await db
    .select({ n: sql<number>`count(*)` })
    .from(schema.expenses)
    .where(
      and(eq(schema.expenses.coupleId, coupleId), eq(schema.expenses.responsible, tag))
    );
  const [re] = await db
    .select({ n: sql<number>`count(*)` })
    .from(schema.recurringExpenses)
    .where(
      and(
        eq(schema.recurringExpenses.coupleId, coupleId),
        eq(schema.recurringExpenses.responsible, tag)
      )
    );
  const [go] = await db
    .select({ n: sql<number>`count(*)` })
    .from(schema.goals)
    .where(and(eq(schema.goals.coupleId, coupleId), eq(schema.goals.responsible, tag)));
  return Number(ex?.n ?? 0) + Number(re?.n ?? 0) + Number(go?.n ?? 0);
}
