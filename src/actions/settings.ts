"use server";

import { and, eq, isNull } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireAuth } from "@/lib/auth/getCouple";
import { requireAdultAuth } from "@/lib/auth/member";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const coupleS = z.object({
  name: z.string().min(2),
  person1Label: z.string().min(1),
  person2Label: z.string().min(1),
});

export async function updateCoupleAction(formData: FormData) {
  const s = await requireAdultAuth();
  const r = coupleS.safeParse({
    name: formData.get("name"),
    person1Label: formData.get("person1Label"),
    person2Label: formData.get("person2Label"),
  });
  if (!r.success) redirect("/configuracoes?err=1");
  await db
    .update(schema.couples)
    .set({
      name: r.data.name,
      person1Label: r.data.person1Label,
      person2Label: r.data.person2Label,
    })
    .where(eq(schema.couples.id, s.user.coupleId));
  revalidatePath("/configuracoes");
  revalidatePath("/");
  redirect("/configuracoes");
}

const prof = z.object({
  name: z.string().min(2),
});

export async function updateProfileAction(formData: FormData) {
  const s = await requireAuth();
  const r = prof.safeParse({ name: formData.get("name") });
  if (!r.success) redirect("/perfil?err=1");
  await db
    .update(schema.users)
    .set({ name: r.data.name })
    .where(eq(schema.users.id, s.user.id));
  revalidatePath("/perfil");
  revalidatePath("/");
  redirect("/perfil");
}

export async function regenerateInviteAction() {
  const s = await requireAdultAuth();
  const coupleId = s.user.coupleId;

  const members = await db
    .select({ linkedChildId: schema.users.linkedChildId })
    .from(schema.users)
    .where(eq(schema.users.coupleId, coupleId));
  const adults = members.filter((m) => !m.linkedChildId);
  if (adults.length >= 2) {
    redirect("/configuracoes?invite=full");
  }

  await db
    .delete(schema.coupleInvites)
    .where(
      and(
        eq(schema.coupleInvites.coupleId, coupleId),
        isNull(schema.coupleInvites.usedAt)
      )
    );

  const token =
    crypto.randomUUID().replace(/-/g, "") +
    crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await db.insert(schema.coupleInvites).values({
    coupleId,
    token,
    expiresAt,
  });

  revalidatePath("/configuracoes");
  redirect("/configuracoes?invite=ok");
}
