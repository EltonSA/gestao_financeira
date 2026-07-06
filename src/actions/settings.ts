"use server";

import { and, eq, isNull } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireAuth } from "@/lib/auth/getCouple";
import { requireAdultAuth } from "@/lib/auth/member";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const coupleS = z.object({
  name: z.string().min(2),
  person1Label: z.string().min(1),
  person2Label: z.string().min(1),
});

const financialCycleS = z.object({
  financialCycleStartType: z.enum(["fixed_day", "business_day"]),
  financialCycleStartDay: z.coerce.number().int().min(1).max(31),
  financialCycleBusinessDayNumber: z.coerce.number().int().min(1).max(23),
});

export async function updateFinancialCycleAction(formData: FormData) {
  const s = await requireAdultAuth();
  const r = financialCycleS.safeParse({
    financialCycleStartType: formData.get("financialCycleStartType"),
    financialCycleStartDay: formData.get("financialCycleStartDay"),
    financialCycleBusinessDayNumber: formData.get("financialCycleBusinessDayNumber"),
  });
  if (!r.success) redirect("/configuracoes?cycle=err");
  await db
    .update(schema.couples)
    .set({
      financialCycleStartType: r.data.financialCycleStartType,
      financialCycleStartDay: r.data.financialCycleStartDay,
      financialCycleBusinessDayNumber: r.data.financialCycleBusinessDayNumber,
    })
    .where(eq(schema.couples.id, s.user.coupleId));
  revalidatePath("/configuracoes");
  revalidatePath("/");
  revalidatePath("/relatorios");
  redirect("/configuracoes?cycle=ok");
}

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

const passwordChange = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
  confirmPassword: z.string().min(6),
});

export async function changePasswordAction(formData: FormData) {
  const s = await requireAuth();
  const r = passwordChange.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!r.success) return { error: "Preencha todos os campos corretamente" };
  const d = r.data;
  if (d.newPassword !== d.confirmPassword) {
    return { error: "A confirmação não coincide com a nova senha" };
  }
  if (d.currentPassword === d.newPassword) {
    return { error: "A nova senha deve ser diferente da atual" };
  }

  const [user] = await db
    .select({ passwordHash: schema.users.passwordHash })
    .from(schema.users)
    .where(eq(schema.users.id, s.user.id))
    .limit(1);
  if (!user) return { error: "Usuário não encontrado" };

  const valid = await verifyPassword(user.passwordHash, d.currentPassword);
  if (!valid) return { error: "Senha atual incorreta" };

  const passwordHash = await hashPassword(d.newPassword);
  await db
    .update(schema.users)
    .set({ passwordHash })
    .where(eq(schema.users.id, s.user.id));

  revalidatePath("/configuracoes");
  revalidatePath("/perfil");
  return { ok: true as const };
}

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

export async function removeMemberAction(userId: string) {
  const s = await requireAdultAuth();
  if (!userId) return { error: "Membro inválido" };
  if (userId === s.user.id) {
    return { error: "Você não pode remover a si mesmo" };
  }

  const [target] = await db
    .select({
      id: schema.users.id,
      linkedChildId: schema.users.linkedChildId,
    })
    .from(schema.users)
    .where(
      and(
        eq(schema.users.id, userId),
        eq(schema.users.coupleId, s.user.coupleId)
      )
    )
    .limit(1);
  if (!target) return { error: "Membro não encontrado" };

  await db.delete(schema.users).where(eq(schema.users.id, userId));

  revalidatePath("/configuracoes");
  revalidatePath("/");
  return { ok: true as const, wasChild: Boolean(target.linkedChildId) };
}
