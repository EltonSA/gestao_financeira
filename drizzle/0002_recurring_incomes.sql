CREATE TABLE "recurring_incomes" (
	"id" text PRIMARY KEY NOT NULL,
	"couple_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"amount_cents" integer NOT NULL,
	"day_of_month" integer NOT NULL,
	"card_id" text,
	"responsible" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_generated_year_month" text,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "incomes" ADD COLUMN "income_type" text DEFAULT 'single' NOT NULL;
--> statement-breakpoint
ALTER TABLE "incomes" ADD COLUMN "recurrence" text DEFAULT 'none' NOT NULL;
--> statement-breakpoint
ALTER TABLE "incomes" ADD COLUMN "recurring_template_id" text;
--> statement-breakpoint
ALTER TABLE "incomes" ADD COLUMN "installment_index" integer;
--> statement-breakpoint
ALTER TABLE "incomes" ADD COLUMN "installment_total" integer;
--> statement-breakpoint
ALTER TABLE "incomes" ADD COLUMN "installment_group_id" text;
--> statement-breakpoint
ALTER TABLE "recurring_incomes" ADD CONSTRAINT "recurring_incomes_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "recurring_incomes" ADD CONSTRAINT "recurring_incomes_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "recurring_incomes" ADD CONSTRAINT "recurring_incomes_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "incomes" ADD CONSTRAINT "incomes_recurring_template_id_recurring_incomes_id_fk" FOREIGN KEY ("recurring_template_id") REFERENCES "public"."recurring_incomes"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "recurring_incomes_couple_idx" ON "recurring_incomes" USING btree ("couple_id");
