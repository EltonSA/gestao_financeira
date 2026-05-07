"use server";

import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, deleteSession } from "@/lib/auth/session";
import { ensureSystemCategories } from "@/lib/seedCategories";
import { redirect } from "next/navigation";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const registerCoupleSchema = z.object({
  coupleName: z.string().min(2),
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

const registerInviteSchema = z.object({
  token: z.string().min(1),
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

const registerChildInviteSchema = z.object({
  token: z.string().min(1),
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

export type ActionState = { error?: string; success?: string; inviteUrl?: string };

export async function loginAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "Dados inválidos" };
  const { email, password } = parsed.data;
  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email.toLowerCase()))
    .limit(1);
  if (!user) return { error: "E-mail ou senha incorretos" };
  const ok = await verifyPassword(user.passwordHash, password);
  if (!ok) return { error: "E-mail ou senha incorretos" };
  await createSession(user.id);
  redirect("/");
}

export async function registerCoupleAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = registerCoupleSchema.safeParse({
    coupleName: formData.get("coupleName"),
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "Preencha todos os campos corretamente" };
  const { coupleName, name, email, password } = parsed.data;
  const [exists] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email.toLowerCase()))
    .limit(1);
  if (exists) return { error: "E-mail já cadastrado" };

  await ensureSystemCategories();
  const coupleId = crypto.randomUUID();
  const userId = crypto.randomUUID();
  const ph = await hashPassword(password);
  const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const exp = new Date();
  exp.setDate(exp.getDate() + 7);

  await db.insert(schema.couples).values({ id: coupleId, name: coupleName });
  await db.insert(schema.users).values({
    id: userId,
    email: email.toLowerCase(),
    passwordHash: ph,
    name,
    coupleId,
    roleInCouple: "person1",
  });
  await db.insert(schema.coupleInvites).values({
    coupleId,
    token,
    expiresAt: exp,
  });
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const inviteUrl = `${base}/registro?token=${token}`;
  return {
    success:
      "Casal criado! Compartilhe o link de convite com o parceiro(a) e use /login com seu e-mail.",
    inviteUrl,
  };
}

export async function registerWithInviteAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = registerInviteSchema.safeParse({
    token: formData.get("token"),
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "Dados inválidos" };
  const { token, name, email, password } = parsed.data;

  const [inv] = await db
    .select()
    .from(schema.coupleInvites)
    .where(eq(schema.coupleInvites.token, token))
    .limit(1);
  if (!inv) return { error: "Convite inválido" };
  if (inv.usedAt) return { error: "Convite já utilizado" };
  if (inv.expiresAt < new Date()) return { error: "Convite expirado" };

  const members = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.coupleId, inv.coupleId));
  const adults = members.filter((m) => !m.linkedChildId);
  if (adults.length >= 2) {
    return { error: "Este casal já possui dois membros" };
  }
  const [mailTaken] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email.toLowerCase()))
    .limit(1);
  if (mailTaken) return { error: "E-mail já cadastrado" };

  await ensureSystemCategories();
  const userId = crypto.randomUUID();
  const ph = await hashPassword(password);
  await db.insert(schema.users).values({
    id: userId,
    email: email.toLowerCase(),
    passwordHash: ph,
    name,
    coupleId: inv.coupleId,
    roleInCouple: "person2",
  });
  await db
    .update(schema.coupleInvites)
    .set({ usedAt: new Date() })
    .where(eq(schema.coupleInvites.id, inv.id));
  await createSession(userId);
  redirect("/");
}

export async function registerWithChildInviteAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = registerChildInviteSchema.safeParse({
    token: formData.get("token"),
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "Dados inválidos" };
  const { token, name, email, password } = parsed.data;

  const [inv] = await db
    .select()
    .from(schema.childInvites)
    .where(eq(schema.childInvites.token, token))
    .limit(1);
  if (!inv) return { error: "Convite inválido" };
  if (inv.usedAt) return { error: "Convite já utilizado" };
  if (inv.expiresAt < new Date()) return { error: "Convite expirado" };

  const [child] = await db
    .select()
    .from(schema.coupleChildren)
    .where(
      and(
        eq(schema.coupleChildren.id, inv.childId),
        eq(schema.coupleChildren.coupleId, inv.coupleId)
      )
    )
    .limit(1);
  if (!child) return { error: "Convite inválido" };

  const [already] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.linkedChildId, inv.childId))
    .limit(1);
  if (already) return { error: "Este perfil já possui conta. Use o login." };

  const [mailTaken] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email.toLowerCase()))
    .limit(1);
  if (mailTaken) return { error: "E-mail já cadastrado" };

  await ensureSystemCategories();
  const userId = crypto.randomUUID();
  const ph = await hashPassword(password);
  await db.insert(schema.users).values({
    id: userId,
    email: email.toLowerCase(),
    passwordHash: ph,
    name,
    coupleId: inv.coupleId,
    roleInCouple: "child",
    linkedChildId: inv.childId,
  });
  await db
    .update(schema.childInvites)
    .set({ usedAt: new Date() })
    .where(eq(schema.childInvites.id, inv.id));
  await createSession(userId);
  redirect("/");
}

export async function logoutAction() {
  await deleteSession();
  redirect("/login");
}
