import "server-only";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { cache } from "react";

const COOKIE = "session";
const MAX_AGE_DAYS = 30;

export const getSession = cache(async () => {
  const id = (await cookies()).get(COOKIE)?.value;
  if (!id) return null;
  const [row] = await db
    .select()
    .from(schema.sessions)
    .where(eq(schema.sessions.id, id))
    .limit(1);
  if (!row) return null;
  if (row.expiresAt < new Date()) {
    await db.delete(schema.sessions).where(eq(schema.sessions.id, id));
    return null;
  }
  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, row.userId))
    .limit(1);
  if (!user) return null;
  const [couple] = await db
    .select()
    .from(schema.couples)
    .where(eq(schema.couples.id, user.coupleId))
    .limit(1);
  if (!couple) return null;
  return { session: row, user: { ...user, couple } };
});

export type SessionData = NonNullable<Awaited<ReturnType<typeof getSession>>>;

export async function createSession(userId: string) {
  const id = crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + MAX_AGE_DAYS);
  await db.insert(schema.sessions).values({ id, userId, expiresAt });
  (await cookies()).set(COOKIE, id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function deleteSession() {
  const id = (await cookies()).get(COOKIE)?.value;
  if (id) {
    await db.delete(schema.sessions).where(eq(schema.sessions.id, id));
  }
  (await cookies()).delete(COOKIE);
}
