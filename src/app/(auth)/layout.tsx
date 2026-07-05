import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AuthLayout({
  children,
}: { children: React.ReactNode }) {
  const s = await getSession();
  if (s) redirect("/");
  return (
    <div className="relative min-h-screen flex flex-col">
      {/* Backdrop com gradiente sutil */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 50% at 20% 0%, rgba(99,102,241,0.10), transparent 70%), radial-gradient(50% 40% at 90% 10%, rgba(168,85,247,0.08), transparent 70%), var(--background)",
        }}
      />
      <header className="px-6 lg:px-10 pt-8">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-grad-indigo text-white shadow-[var(--shadow-md)]">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--foreground-subtle)] font-medium">Casal · Finanças</p>
            <p className="text-sm font-semibold tracking-tight text-[var(--foreground)]">Central do casal</p>
          </div>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-[420px] animate-slide-up">{children}</div>
      </main>
      <footer className="px-6 pb-6 text-center">
        <p className="text-[11px] text-[var(--foreground-subtle)]">
          Clareza, controle e leveza nas finanças do casal.
        </p>
      </footer>
    </div>
  );
}
