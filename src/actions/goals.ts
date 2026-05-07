"use server";

import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireAuth } from "@/lib/auth/getCouple";
import { isChildAccount, responsibleTagForChildUser } from "@/lib/auth/member";
import { assertResponsibleBelongsToCouple } from "@/lib/data/children";
import { parseDateBR } from "@/lib/dates";
import { parseMoneyToCents } from "@/lib/money";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const gSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  targetBRL: z.string().min(1),
  currentBRL: z.string().optional(),
  dueDate: z.string().optional(),
  responsible: z.string().min(1),
  goalCategory: z.string().min(1),
});

export async function createGoalAction(formData: FormData) {
  const s = await requireAuth();
  const r = gSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    targetBRL: String(formData.get("targetBRL") ?? ""),
    currentBRL: String(formData.get("currentBRL") ?? "0"),
    dueDate: formData.get("dueDate") || undefined,
    responsible: formData.get("responsible"),
    goalCategory: formData.get("goalCategory"),
  });
  if (!r.success) redirect("/cofrinhos/nova?err=1");
  const d = r.data;
  const childTag = responsibleTagForChildUser(s.user);
  let responsible = d.responsible;
  if (childTag) {
    responsible = childTag;
  } else if (!(await assertResponsibleBelongsToCouple(s.user.coupleId, d.responsible))) {
    redirect("/cofrinhos/nova?err=1");
  }
  const targetCents = parseMoneyToCents(d.targetBRL);
  const currentCents = Math.min(
    parseMoneyToCents(d.currentBRL || "0"),
    targetCents
  );
  if (targetCents <= 0) redirect("/cofrinhos/nova?err=2");
  const due = d.dueDate ? parseDateBR(d.dueDate) : null;
  if (d.dueDate && !due) redirect("/cofrinhos/nova?err=3");
  const id = crypto.randomUUID();
  await db.insert(schema.goals).values({
    id,
    coupleId: s.user.coupleId,
    name: d.name,
    description: d.description,
    targetCents,
    currentCents,
    dueDate: due,
    responsible,
    goalCategory: d.goalCategory,
    createdByUserId: s.user.id,
  });
  revalidatePath("/cofrinhos");
  revalidatePath("/");
  redirect("/cofrinhos");
}

const contrib = z.object({
  amount: z.string().min(1),
  date: z.string().min(1),
  note: z.string().optional(),
});

export async function contributeGoalAction(
  goalId: string,
  formData: FormData
) {
  const s = await requireAuth();
  const r = contrib.safeParse({
    amount: formData.get("amount"),
    date: formData.get("date"),
    note: formData.get("note") || undefined,
  });
  if (!r.success) return { error: "Dados inválidos" };
  const dt = parseDateBR(r.data.date);
  if (!dt) return { error: "Data inválida" };
  const cents = parseMoneyToCents(r.data.amount);
  if (cents <= 0) return { error: "Informe o valor" };
  const [g] = await db
    .select()
    .from(schema.goals)
    .where(
      and(
        eq(schema.goals.id, goalId),
        eq(schema.goals.coupleId, s.user.coupleId)
      )
    );
  if (!g) return { error: "Meta não encontrada" };
  await db.insert(schema.goalContributions).values({
    goalId,
    amountCents: cents,
    date: dt,
    note: r.data.note,
    createdByUserId: s.user.id,
  });
  const next = g.currentCents + cents;
  await db
    .update(schema.goals)
    .set({ currentCents: next })
    .where(eq(schema.goals.id, goalId));
  revalidatePath("/cofrinhos");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteGoalAction(id: string) {
  const s = await requireAuth();
  const [g] = await db
    .select()
    .from(schema.goals)
    .where(and(eq(schema.goals.id, id), eq(schema.goals.coupleId, s.user.coupleId)));
  if (!g) return { ok: false as const };
  const childTag = responsibleTagForChildUser(s.user);
  if (isChildAccount(s.user)) {
    if (!childTag || g.responsible !== childTag) return { ok: false as const };
  }
  await db
    .delete(schema.goalContributions)
    .where(eq(schema.goalContributions.goalId, id));
  await db
    .delete(schema.goals)
    .where(
      and(
        eq(schema.goals.id, id),
        eq(schema.goals.coupleId, s.user.coupleId)
      )
    );
  revalidatePath("/cofrinhos");
  revalidatePath("/");
  return { ok: true };
}

/** Action wrapper para uso direto via <form action={…}> com input hidden `id`. */
export async function deleteGoalFormAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await deleteGoalAction(id);
  redirect("/cofrinhos");
}

export async function updateGoalAction(id: string, formData: FormData) {
  const s = await requireAuth();
  const r = gSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    targetBRL: String(formData.get("targetBRL") ?? ""),
    currentBRL: String(formData.get("currentBRL") ?? "0"),
    dueDate: formData.get("dueDate") || undefined,
    responsible: formData.get("responsible"),
    goalCategory: formData.get("goalCategory"),
  });
  if (!r.success) return { error: "Dados inválidos" };
  const d = r.data;
  const childTag = responsibleTagForChildUser(s.user);
  const responsible = childTag ?? d.responsible;
  if (!childTag && !(await assertResponsibleBelongsToCouple(s.user.coupleId, d.responsible))) {
    return { error: "Responsável inválido" };
  }
  const targetCents = parseMoneyToCents(d.targetBRL);
  const currentCents = Math.min(
    parseMoneyToCents(d.currentBRL || "0"),
    targetCents
  );
  if (targetCents <= 0) return { error: "Valor alvo deve ser maior que zero" };
  const due = d.dueDate ? parseDateBR(d.dueDate) : null;
  if (d.dueDate && !due) return { error: "Data inválida" };
  const [g] = await db
    .select()
    .from(schema.goals)
    .where(
      and(eq(schema.goals.id, id), eq(schema.goals.coupleId, s.user.coupleId))
    );
  if (!g) return { error: "Meta não encontrada" };
  if (isChildAccount(s.user)) {
    if (!childTag || g.responsible !== childTag) {
      return { error: "Sem permissão" };
    }
  }
  await db
    .update(schema.goals)
    .set({
      name: d.name,
      description: d.description,
      targetCents,
      currentCents,
      dueDate: due,
      responsible,
      goalCategory: d.goalCategory,
    })
    .where(eq(schema.goals.id, id));
  revalidatePath("/cofrinhos");
  revalidatePath("/");
  return { ok: true };
}
