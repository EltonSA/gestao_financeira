import { relations } from "drizzle-orm";
import { boolean, index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

const ts = () =>
  timestamp("created_at", { withTimezone: true })
    .notNull()
    .$defaultFn(() => new Date());

const tsUpdated = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .$defaultFn(() => new Date());

export const couples = pgTable("couples", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  person1Label: text("person1_label").notNull().default("Pessoa 1"),
  person2Label: text("person2_label").notNull().default("Pessoa 2"),
  createdAt: ts(),
});

export const users = pgTable(
  "users",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    name: text("name").notNull(),
    coupleId: text("couple_id")
      .notNull()
      .references(() => couples.id, { onDelete: "cascade" }),
    roleInCouple: text("role_in_couple").notNull(),
    /** Quando preenchido, usuário é conta de filho(a) vinculada a `couple_children`. */
    linkedChildId: text("linked_child_id"),
    createdAt: ts(),
  },
  (t) => [
    index("users_couple_idx").on(t.coupleId),
    index("users_linked_child_idx").on(t.linkedChildId),
  ]
);

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const coupleInvites = pgTable("couple_invites", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  coupleId: text("couple_id")
    .notNull()
    .references(() => couples.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
});

/** Filhos do casal; responsável nas despesas usa `child:` + id. Conta de login opcional via convite. */
export const coupleChildren = pgTable(
  "couple_children",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    coupleId: text("couple_id")
      .notNull()
      .references(() => couples.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: ts(),
  },
  (t) => [index("couple_children_couple_idx").on(t.coupleId)]
);

/** Convite para o filho criar e-mail + senha (um token por cadastro). */
export const childInvites = pgTable(
  "child_invites",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    coupleId: text("couple_id")
      .notNull()
      .references(() => couples.id, { onDelete: "cascade" }),
    childId: text("child_id")
      .notNull()
      .references(() => coupleChildren.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
  },
  (t) => [
    index("child_invites_couple_idx").on(t.coupleId),
    index("child_invites_child_idx").on(t.childId),
  ]
);

export const cards = pgTable(
  "cards",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    coupleId: text("couple_id")
      .notNull()
      .references(() => couples.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    institution: text("institution").notNull(),
    owner: text("owner").notNull(),
    limitTotalCents: integer("limit_total_cents").notNull(),
    closingDay: integer("closing_day").notNull(),
    dueDay: integer("due_day").notNull(),
    /** credit | debit | both — define quais lançamentos podem usar o cartão. */
    cardKind: text("card_kind").notNull().default("credit"),
    color: text("color").notNull().default("#6366f1"),
    isActive: boolean("is_active").notNull().default(true),
    createdByUserId: text("created_by_user_id").references(() => users.id),
    updatedByUserId: text("updated_by_user_id").references(() => users.id),
    createdAt: ts(),
    updatedAt: tsUpdated(),
  },
  (t) => [index("cards_couple_idx").on(t.coupleId)]
);

export const categories = pgTable("categories", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  coupleId: text("couple_id").references(() => couples.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  isSystem: boolean("is_system").notNull().default(false),
});

export const recurringExpenses = pgTable(
  "recurring_expenses",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    coupleId: text("couple_id")
      .notNull()
      .references(() => couples.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    amountCents: integer("amount_cents").notNull(),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id),
    dayOfMonth: integer("day_of_month").notNull(),
    paymentMethod: text("payment_method").notNull(),
    cardId: text("card_id").references(() => cards.id, { onDelete: "set null" }),
    responsible: text("responsible").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    lastGeneratedYearMonth: text("last_generated_year_month"),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => users.id),
    createdAt: ts(),
  },
  (t) => [index("recurring_couple_idx").on(t.coupleId)]
);

/** Modelos de entrada mensal (salário, aluguel recebido, etc.). */
export const recurringIncomes = pgTable(
  "recurring_incomes",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    coupleId: text("couple_id")
      .notNull()
      .references(() => couples.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    amountCents: integer("amount_cents").notNull(),
    dayOfMonth: integer("day_of_month").notNull(),
    cardId: text("card_id").references(() => cards.id, { onDelete: "set null" }),
    responsible: text("responsible").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    lastGeneratedYearMonth: text("last_generated_year_month"),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => users.id),
    createdAt: ts(),
  },
  (t) => [index("recurring_incomes_couple_idx").on(t.coupleId)]
);

export const expenses = pgTable(
  "expenses",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    coupleId: text("couple_id")
      .notNull()
      .references(() => couples.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id),
    amountCents: integer("amount_cents").notNull(),
    dueDate: text("due_date").notNull(),
    paidAt: text("paid_at"),
    paymentMethod: text("payment_method").notNull(),
    cardId: text("card_id").references(() => cards.id, { onDelete: "set null" }),
    responsible: text("responsible").notNull(),
    expenseType: text("expense_type").notNull(),
    status: text("status").notNull(),
    recurrence: text("recurrence").notNull().default("none"),
    recurringTemplateId: text("recurring_template_id").references(
      () => recurringExpenses.id,
      { onDelete: "set null" }
    ),
    installmentIndex: integer("installment_index"),
    installmentTotal: integer("installment_total"),
    installmentGroupId: text("installment_group_id"),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => users.id),
    updatedByUserId: text("updated_by_user_id").references(() => users.id),
    createdAt: ts(),
    updatedAt: tsUpdated(),
  },
  (t) => [index("expenses_couple_due_idx").on(t.coupleId, t.dueDate)]
);

export const incomes = pgTable(
  "incomes",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    coupleId: text("couple_id")
      .notNull()
      .references(() => couples.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    amountCents: integer("amount_cents").notNull(),
    receivedDate: text("received_date").notNull(),
    cardId: text("card_id").references(() => cards.id, { onDelete: "set null" }),
    responsible: text("responsible").notNull(),
    /** single | recurring | installment */
    incomeType: text("income_type").notNull().default("single"),
    recurrence: text("recurrence").notNull().default("none"),
    recurringTemplateId: text("recurring_template_id").references(
      () => recurringIncomes.id,
      { onDelete: "set null" }
    ),
    installmentIndex: integer("installment_index"),
    installmentTotal: integer("installment_total"),
    installmentGroupId: text("installment_group_id"),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => users.id),
    updatedByUserId: text("updated_by_user_id").references(() => users.id),
    createdAt: ts(),
    updatedAt: tsUpdated(),
  },
  (t) => [index("incomes_couple_received_idx").on(t.coupleId, t.receivedDate)]
);

export const goals = pgTable(
  "goals",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    coupleId: text("couple_id")
      .notNull()
      .references(() => couples.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    targetCents: integer("target_cents").notNull(),
    currentCents: integer("current_cents").notNull().default(0),
    dueDate: text("due_date"),
    responsible: text("responsible").notNull(),
    goalCategory: text("goal_category").notNull(),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => users.id),
    createdAt: ts(),
  },
  (t) => [index("goals_couple_idx").on(t.coupleId)]
);

export const goalContributions = pgTable("goal_contributions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  goalId: text("goal_id")
    .notNull()
    .references(() => goals.id, { onDelete: "cascade" }),
  amountCents: integer("amount_cents").notNull(),
  date: text("date").notNull(),
  note: text("note"),
  createdByUserId: text("created_by_user_id")
    .notNull()
    .references(() => users.id),
  createdAt: ts(),
});

/* Relations (optional, for query helpers) */
export const usersRelations = relations(users, ({ one, many }) => ({
  couple: one(couples, { fields: [users.coupleId], references: [couples.id] }),
  sessions: many(sessions),
}));

export const expensesRelations = relations(expenses, ({ one }) => ({
  category: one(categories, { fields: [expenses.categoryId], references: [categories.id] }),
  card: one(cards, { fields: [expenses.cardId], references: [cards.id] }),
}));

export type User = typeof users.$inferSelect;
export type Couple = typeof couples.$inferSelect;
export type Card = typeof cards.$inferSelect;
export type Expense = typeof expenses.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type RecurringExpense = typeof recurringExpenses.$inferSelect;
export type RecurringIncome = typeof recurringIncomes.$inferSelect;
export type Income = typeof incomes.$inferSelect;
export type Goal = typeof goals.$inferSelect;
export type CoupleChild = typeof coupleChildren.$inferSelect;
