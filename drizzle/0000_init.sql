CREATE TABLE "couples" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"person1_label" text DEFAULT 'Pessoa 1' NOT NULL,
	"person2_label" text DEFAULT 'Pessoa 2' NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" text PRIMARY KEY NOT NULL,
	"couple_id" text,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"couple_id" text NOT NULL,
	"role_in_couple" text NOT NULL,
	"linked_child_id" text,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "couple_invites" (
	"id" text PRIMARY KEY NOT NULL,
	"couple_id" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	CONSTRAINT "couple_invites_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "couple_children" (
	"id" text PRIMARY KEY NOT NULL,
	"couple_id" text NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "child_invites" (
	"id" text PRIMARY KEY NOT NULL,
	"couple_id" text NOT NULL,
	"child_id" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	CONSTRAINT "child_invites_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "cards" (
	"id" text PRIMARY KEY NOT NULL,
	"couple_id" text NOT NULL,
	"name" text NOT NULL,
	"institution" text NOT NULL,
	"owner" text NOT NULL,
	"limit_total_cents" integer NOT NULL,
	"closing_day" integer NOT NULL,
	"due_day" integer NOT NULL,
	"card_kind" text DEFAULT 'credit' NOT NULL,
	"color" text DEFAULT '#6366f1' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by_user_id" text,
	"updated_by_user_id" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recurring_expenses" (
	"id" text PRIMARY KEY NOT NULL,
	"couple_id" text NOT NULL,
	"name" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"category_id" text NOT NULL,
	"day_of_month" integer NOT NULL,
	"payment_method" text NOT NULL,
	"card_id" text,
	"responsible" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_generated_year_month" text,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" text PRIMARY KEY NOT NULL,
	"couple_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"category_id" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"due_date" text NOT NULL,
	"paid_at" text,
	"payment_method" text NOT NULL,
	"card_id" text,
	"responsible" text NOT NULL,
	"expense_type" text NOT NULL,
	"status" text NOT NULL,
	"recurrence" text DEFAULT 'none' NOT NULL,
	"recurring_template_id" text,
	"installment_index" integer,
	"installment_total" integer,
	"installment_group_id" text,
	"created_by_user_id" text NOT NULL,
	"updated_by_user_id" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "incomes" (
	"id" text PRIMARY KEY NOT NULL,
	"couple_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"amount_cents" integer NOT NULL,
	"received_date" text NOT NULL,
	"card_id" text,
	"responsible" text NOT NULL,
	"created_by_user_id" text NOT NULL,
	"updated_by_user_id" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goals" (
	"id" text PRIMARY KEY NOT NULL,
	"couple_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"target_cents" integer NOT NULL,
	"current_cents" integer DEFAULT 0 NOT NULL,
	"due_date" text,
	"responsible" text NOT NULL,
	"goal_category" text NOT NULL,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goal_contributions" (
	"id" text PRIMARY KEY NOT NULL,
	"goal_id" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"date" text NOT NULL,
	"note" text,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "couple_invites" ADD CONSTRAINT "couple_invites_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "couple_children" ADD CONSTRAINT "couple_children_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "child_invites" ADD CONSTRAINT "child_invites_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "child_invites" ADD CONSTRAINT "child_invites_child_id_couple_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."couple_children"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "cards" ADD CONSTRAINT "cards_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "cards" ADD CONSTRAINT "cards_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "cards" ADD CONSTRAINT "cards_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "recurring_expenses" ADD CONSTRAINT "recurring_expenses_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "recurring_expenses" ADD CONSTRAINT "recurring_expenses_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "recurring_expenses" ADD CONSTRAINT "recurring_expenses_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "recurring_expenses" ADD CONSTRAINT "recurring_expenses_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_recurring_template_id_recurring_expenses_id_fk" FOREIGN KEY ("recurring_template_id") REFERENCES "public"."recurring_expenses"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "incomes" ADD CONSTRAINT "incomes_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "incomes" ADD CONSTRAINT "incomes_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "incomes" ADD CONSTRAINT "incomes_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "incomes" ADD CONSTRAINT "incomes_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "goal_contributions" ADD CONSTRAINT "goal_contributions_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "goal_contributions" ADD CONSTRAINT "goal_contributions_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "users_couple_idx" ON "users" USING btree ("couple_id");
--> statement-breakpoint
CREATE INDEX "users_linked_child_idx" ON "users" USING btree ("linked_child_id");
--> statement-breakpoint
CREATE INDEX "couple_children_couple_idx" ON "couple_children" USING btree ("couple_id");
--> statement-breakpoint
CREATE INDEX "child_invites_couple_idx" ON "child_invites" USING btree ("couple_id");
--> statement-breakpoint
CREATE INDEX "child_invites_child_idx" ON "child_invites" USING btree ("child_id");
--> statement-breakpoint
CREATE INDEX "cards_couple_idx" ON "cards" USING btree ("couple_id");
--> statement-breakpoint
CREATE INDEX "recurring_couple_idx" ON "recurring_expenses" USING btree ("couple_id");
--> statement-breakpoint
CREATE INDEX "expenses_couple_due_idx" ON "expenses" USING btree ("couple_id","due_date");
--> statement-breakpoint
CREATE INDEX "incomes_couple_received_idx" ON "incomes" USING btree ("couple_id","received_date");
--> statement-breakpoint
CREATE INDEX "goals_couple_idx" ON "goals" USING btree ("couple_id");
