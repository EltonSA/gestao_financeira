"use server";

import { and, eq, isNull, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireAdultAuth } from "@/lib/auth/member";
import { childIdBelongsToCouple, countReferencesToChild } from "@/lib/data/children";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const nameS = z.string().trim().min(1).max(80);

export async function addChildAction(formData: FormData) {
  const s = await requireAdultAuth();
  const r = nameS.safeParse(String(formData.get("childName") ?? ""));
  if (!r.success) redirect("/configuracoes?child=err");
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)` })
    .from(schema.coupleChildren)
    .where(eq(schema.coupleChildren.coupleId, s.user.coupleId));
  await db.insert(schema.coupleChildren).values({
    coupleId: s.user.coupleId,
    name: r.data,
    sortOrder: Number(n ?? 0),
  });
  revalidatePath("/configuracoes");
  revalidatePath("/");
  revalidatePath("/despesas");
  revalidatePath("/gastos-fixos");
  revalidatePath("/cofrinhos");
  redirect("/configuracoes?child=ok");
}

export async function updateChildNameAction(formData: FormData) {
  const s = await requireAdultAuth();
  const id = String(formData.get("childId") ?? "");
  const r = nameS.safeParse(String(formData.get("childName") ?? ""));
  if (!id || !r.success) redirect("/configuracoes?child=err");
  const ok = await childIdBelongsToCouple(id, s.user.coupleId);
  if (!ok) redirect("/configuracoes?child=err");
  await db
    .update(schema.coupleChildren)
    .set({ name: r.data })
    .where(
      and(
        eq(schema.coupleChildren.id, id),
        eq(schema.coupleChildren.coupleId, s.user.coupleId)
      )
    );
  revalidatePath("/configuracoes");
  revalidatePath("/");
  revalidatePath("/despesas");
  revalidatePath("/gastos-fixos");
  revalidatePath("/cofrinhos");
  redirect("/configuracoes?child=ok");
}

export async function deleteChildAction(formData: FormData) {
  const s = await requireAdultAuth();
  const id = String(formData.get("childId") ?? "");
  if (!id) redirect("/configuracoes?child=err");
  const ok = await childIdBelongsToCouple(id, s.user.coupleId);
  if (!ok) redirect("/configuracoes?child=err");
  const refs = await countReferencesToChild(s.user.coupleId, id);
  if (refs > 0) {
    redirect("/configuracoes?child=in_use");
  }
  await db.delete(schema.users).where(eq(schema.users.linkedChildId, id));
  await db
    .delete(schema.childInvites)
    .where(eq(schema.childInvites.childId, id));
  await db
    .delete(schema.coupleChildren)
    .where(
      and(
        eq(schema.coupleChildren.id, id),
        eq(schema.coupleChildren.coupleId, s.user.coupleId)
      )
    );
  revalidatePath("/configuracoes");
  revalidatePath("/");
  revalidatePath("/despesas");
  revalidatePath("/gastos-fixos");
  revalidatePath("/cofrinhos");
  redirect("/configuracoes?child=removed");
}

/** Gera link de cadastro para o filho(a) criar e-mail e senha. */
export async function createChildInviteAction(formData: FormData) {
  const s = await requireAdultAuth();
  const childId = String(formData.get("childId") ?? "");
  if (!childId) redirect("/configuracoes?filhoConvite=err");
  const ok = await childIdBelongsToCouple(childId, s.user.coupleId);
  if (!ok) redirect("/configuracoes?filhoConvite=err");

  const [existingUser] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.linkedChildId, childId))
    .limit(1);
  if (existingUser) {
    redirect("/configuracoes?filhoConta=1");
  }

  await db
    .delete(schema.childInvites)
    .where(
      and(
        eq(schema.childInvites.childId, childId),
        isNull(schema.childInvites.usedAt)
      )
    );

  const token =
    crypto.randomUUID().replace(/-/g, "") +
    crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await db.insert(schema.childInvites).values({
    coupleId: s.user.coupleId,
    childId,
    token,
    expiresAt,
  });

  revalidatePath("/configuracoes");
  redirect(`/configuracoes?filhoConvite=${encodeURIComponent(token)}`);
}
