import { getSession } from "@/lib/auth/session";
import { syncOverdueForCouple } from "@/lib/syncOverdue";
import { syncRecurringForCouple } from "@/lib/services/recurringSync";
import { syncRecurringIncomesForCouple } from "@/lib/services/recurringIncomeSync";
import { syncCardInvoicesForCouple } from "@/lib/services/cardInvoice";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { isChildAccount } from "@/lib/auth/member";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: { children: React.ReactNode }) {
  const s = await getSession();
  if (!s) redirect("/login");
  await syncOverdueForCouple(s.user.coupleId);
  if (!isChildAccount(s.user)) {
    await syncRecurringForCouple(s.user.coupleId);
    await syncRecurringIncomesForCouple(s.user.coupleId);
    await syncCardInvoicesForCouple(s.user.coupleId);
  }
  let childAccountLabel: string | null = null;
  if (isChildAccount(s.user) && s.user.linkedChildId) {
    const [row] = await db
      .select({ name: schema.coupleChildren.name })
      .from(schema.coupleChildren)
      .where(eq(schema.coupleChildren.id, s.user.linkedChildId))
      .limit(1);
    childAccountLabel = row?.name ?? null;
  }
  return (
    <AppShell
      userName={s.user.name}
      coupleName={s.user.couple.name}
      person1Label={s.user.couple.person1Label}
      person2Label={s.user.couple.person2Label}
      childAccountLabel={childAccountLabel}
    >
      {children}
    </AppShell>
  );
}
