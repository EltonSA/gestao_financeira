import { hash } from "@node-rs/argon2";
import { db, schema } from "../src/lib/db";
import { DEFAULT_CATEGORY_SEED } from "../src/lib/constants";

const opts = {
  memoryCost: 19456,
  timeCost: 2,
  outputLen: 32,
  parallelism: 1,
};

function ymd() {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
}

async function main() {
  const [u] = await db.select().from(schema.users).limit(1);
  if (u) {
    console.log("Banco já possui usuários. Remova data/app.db para re-seed.");
    process.exit(0);
  }

  const ph = await hash("demo123", opts);
  const coupleId = crypto.randomUUID();
  const u1 = crypto.randomUUID();
  const u2 = crypto.randomUUID();
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  await db.insert(schema.couples).values({
    id: coupleId,
    name: "Elton & Letícia",
    person1Label: "Elton",
    person2Label: "Letícia",
  });

  await db.insert(schema.users).values([
    {
      id: u1,
      email: "elton@exemplo.com",
      passwordHash: ph,
      name: "Elton",
      coupleId,
      roleInCouple: "person1" as const,
    },
    {
      id: u2,
      email: "leticia@exemplo.com",
      passwordHash: ph,
      name: "Letícia",
      coupleId,
      roleInCouple: "person2" as const,
    },
  ]);

  const childDemo = crypto.randomUUID();
  await db.insert(schema.coupleChildren).values({
    id: childDemo,
    coupleId,
    name: "Maria (demo)",
    sortOrder: 0,
  });

  const inviteTtl = new Date();
  inviteTtl.setDate(inviteTtl.getDate() + 7);
  await db.insert(schema.coupleInvites).values({
    coupleId,
    token: "DEMO-CONVIDE",
    expiresAt: inviteTtl,
  });

  const catIds: Record<string, string> = {};
  for (const c of DEFAULT_CATEGORY_SEED) {
    const id = crypto.randomUUID();
    catIds[c.slug] = id;
    await db.insert(schema.categories).values({
      id,
      coupleId: null,
      name: c.name,
      slug: c.slug,
      isSystem: true,
    });
  }

  const card1 = crypto.randomUUID();
  const card2 = crypto.randomUUID();
  await db.insert(schema.cards).values([
    {
      id: card1,
      coupleId,
      name: "Nubank Roxo",
      institution: "nubank",
      owner: "shared",
      limitTotalCents: 5000_00,
      closingDay: 10,
      dueDay: 17,
      color: "#8a05be",
      isActive: true,
      createdByUserId: u1,
      updatedByUserId: u1,
    },
    {
      id: card2,
      coupleId,
      name: "C6",
      institution: "c6",
      owner: "person1",
      limitTotalCents: 10_000_00,
      closingDay: 5,
      dueDay: 12,
      color: "#1e2b57",
      isActive: true,
      createdByUserId: u1,
      updatedByUserId: u1,
    },
  ]);

  const mStart = ymd();
  const prevM = new Date();
  prevM.setMonth(prevM.getMonth() - 1);
  const prevYmd = `${prevM.getFullYear()}-${String(prevM.getMonth() + 1).padStart(2, "0")}-10`;

  await db.insert(schema.expenses).values([
    {
      coupleId,
      title: "Compra do mês (cartão)",
      description: "Supermercado",
      categoryId: catIds.mercado!,
      amountCents: 350_00,
      dueDate: mStart,
      paymentMethod: "credit",
      cardId: card1,
      responsible: "both",
      expenseType: "variable",
      status: "paid" as const,
      recurrence: "none" as const,
      paidAt: mStart,
      createdByUserId: u1,
    },
    {
      coupleId,
      title: "Energia",
      categoryId: catIds["contas-casa"]!,
      amountCents: 220_00,
      dueDate: mStart,
      paymentMethod: "pix" as const,
      responsible: "both",
      expenseType: "fixed" as const,
      status: "pending" as const,
      recurrence: "monthly" as const,
      createdByUserId: u1,
    },
    {
      coupleId,
      title: "Gasto antigo pago (mês anterior)",
      categoryId: catIds.mercado!,
      amountCents: 120_00,
      dueDate: prevYmd,
      paymentMethod: "pix" as const,
      paidAt: prevYmd,
      responsible: "person1",
      expenseType: "variable" as const,
      status: "paid" as const,
      recurrence: "none" as const,
      createdByUserId: u1,
    },
    {
      coupleId,
      title: "Cinema",
      categoryId: catIds.lazer!,
      amountCents: 60_00,
      dueDate: mStart,
      paymentMethod: "debit" as const,
      responsible: "person2",
      expenseType: "variable" as const,
      status: "pending" as const,
      recurrence: "none" as const,
      createdByUserId: u2,
    },
  ]);

  await db.insert(schema.recurringExpenses).values({
    coupleId,
    name: "Plano de internet",
    amountCents: 99_90,
    categoryId: catIds["contas-casa"]!,
    dayOfMonth: 5,
    paymentMethod: "pix" as const,
    responsible: "both",
    isActive: true,
    lastGeneratedYearMonth: ym,
    createdByUserId: u1,
  });

  const g1 = crypto.randomUUID();
  await db.insert(schema.goals).values({
    id: g1,
    coupleId,
    name: "Viagem a Gramado",
    description: "Férias de inverno",
    targetCents: 5_000_00,
    currentCents: 1_250_00,
    dueDate: "2026-10-30",
    responsible: "both",
    goalCategory: "travel" as const,
    createdByUserId: u1,
  });
  await db.insert(schema.goalContributions).values({
    goalId: g1,
    amountCents: 1_000_00,
    date: prevYmd,
    note: "Aporte mensal",
    createdByUserId: u1,
  });
  await db.insert(schema.goalContributions).values({
    goalId: g1,
    amountCents: 250_00,
    date: mStart,
    createdByUserId: u2,
  });

  console.log("Seed concluído. Login: elton@exemplo.com / leticia@exemplo.com | senha: demo123");
  console.log("Convite 2º usuário (já com casal com 2 membros): o convite de demo está ativo, mas 2 contas já existem.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
