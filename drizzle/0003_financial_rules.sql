ALTER TABLE "couples" ADD COLUMN "financial_cycle_start_type" text DEFAULT 'fixed_day' NOT NULL;
--> statement-breakpoint
ALTER TABLE "couples" ADD COLUMN "financial_cycle_start_day" integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE "couples" ADD COLUMN "financial_cycle_business_day_number" integer DEFAULT 5 NOT NULL;
--> statement-breakpoint
CREATE TABLE "card_invoices" (
	"id" text PRIMARY KEY NOT NULL,
	"card_id" text NOT NULL,
	"couple_id" text NOT NULL,
	"cycle_start_date" text NOT NULL,
	"cycle_end_date" text NOT NULL,
	"closing_date" text NOT NULL,
	"due_date" text NOT NULL,
	"total_amount_cents" integer DEFAULT 0 NOT NULL,
	"paid_amount_cents" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"paid_at" text,
	"payment_method" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "card_invoice_id" text;
--> statement-breakpoint
ALTER TABLE "card_invoices" ADD CONSTRAINT "card_invoices_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "card_invoices" ADD CONSTRAINT "card_invoices_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_card_invoice_id_card_invoices_id_fk" FOREIGN KEY ("card_invoice_id") REFERENCES "public"."card_invoices"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "card_invoices_couple_idx" ON "card_invoices" USING btree ("couple_id");
--> statement-breakpoint
CREATE INDEX "card_invoices_card_idx" ON "card_invoices" USING btree ("card_id");
--> statement-breakpoint
CREATE INDEX "card_invoices_cycle_idx" ON "card_invoices" USING btree ("card_id","cycle_start_date");
