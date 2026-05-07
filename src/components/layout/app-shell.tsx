"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  CreditCard,
  HandCoins,
  Home,
  LayoutList,
  LineChart,
  LogOut,
  Menu,
  PiggyBank,
  Plus,
  Settings,
  Sparkles,
  User,
  X,
} from "lucide-react";
import { logoutAction } from "@/actions/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: React.ElementType; group?: string };

const NAV_PRIMARY: NavItem[] = [
  { href: "/", label: "Visão geral", icon: Home },
  { href: "/despesas", label: "Despesas", icon: LayoutList },
  { href: "/gastos-fixos", label: "Gastos fixos", icon: HandCoins },
  { href: "/cartoes", label: "Cartões", icon: CreditCard },
  { href: "/cofrinhos", label: "Cofrinhos", icon: PiggyBank },
];
const NAV_SECONDARY: NavItem[] = [
  { href: "/calendario", label: "Calendário", icon: CalendarDays },
  { href: "/relatorios", label: "Relatórios", icon: LineChart },
];
const NAV_SETTINGS: NavItem[] = [
  { href: "/configuracoes", label: "Configurações", icon: Settings },
  { href: "/perfil", label: "Perfil", icon: User },
];

const MOBILE_TABS = [
  { href: "/", label: "Início", icon: Home },
  { href: "/despesas", label: "Despesas", icon: LayoutList },
  { href: "/cartoes", label: "Cartões", icon: CreditCard },
  { href: "/cofrinhos", label: "Cofrinhos", icon: PiggyBank },
] as const;

function NavLink({ item, active, onClick }: { item: NavItem; active: boolean; onClick?: () => void }) {
  const I = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-150",
        active
          ? "bg-[var(--primary-soft)] text-[var(--primary)]"
          : "text-[var(--foreground-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
      )}
    >
      <I className={cn("h-[18px] w-[18px] shrink-0 transition-transform", active && "scale-105")} />
      <span className="truncate">{item.label}</span>
      {active && (
        <span className="absolute right-2 h-1.5 w-1.5 rounded-full bg-[var(--primary)]" aria-hidden />
      )}
    </Link>
  );
}

function NavSection({
  label,
  items,
  pathname,
  onItem,
}: { label?: string; items: NavItem[]; pathname: string; onItem?: () => void }) {
  return (
    <div className="space-y-1">
      {label && (
        <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--foreground-subtle)]">
          {label}
        </p>
      )}
      {items.map((it) => (
        <NavLink
          key={it.href}
          item={it}
          active={it.href === "/" ? pathname === "/" : pathname.startsWith(it.href)}
          onClick={onItem}
        />
      ))}
    </div>
  );
}

export function AppShell({
  children,
  userName,
  coupleName,
  person1Label,
  person2Label,
  childAccountLabel,
}: {
  children: React.ReactNode;
  userName: string;
  coupleName: string;
  person1Label: string;
  person2Label: string;
  /** Nome do perfil em `couple_children` quando o usuário logado é conta de filho(a). */
  childAccountLabel?: string | null;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const sidebarContent = (onItem?: () => void) => (
    <div className="flex h-full flex-col">
      <div className="px-3 pt-1.5 pb-4">
        <Link href="/" onClick={onItem} className="flex items-center gap-3 rounded-xl p-2 hover:bg-[var(--surface-muted)] transition">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-grad-indigo text-white shadow-[var(--shadow-sm)]">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.1em] text-[var(--foreground-subtle)] font-medium">Família · Finanças</p>
            <p className="text-sm font-semibold tracking-tight text-[var(--foreground)] truncate">{coupleName}</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-2 pb-4">
        <NavSection items={NAV_PRIMARY} pathname={pathname} onItem={onItem} />
        <div className="h-px bg-[var(--border-subtle)] mx-2" />
        <NavSection label="Análises" items={NAV_SECONDARY} pathname={pathname} onItem={onItem} />
        <NavSection label="Conta" items={NAV_SETTINGS} pathname={pathname} onItem={onItem} />
      </nav>

      <div className="px-2 pb-3">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[var(--shadow-xs)]">
          <div className="flex items-center gap-2.5">
            <div className="flex -space-x-2">
              <Avatar name={person1Label} size="sm" />
              <Avatar name={person2Label} size="sm" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold tracking-tight text-[var(--foreground)]">
                {userName}
              </p>
              <p className="truncate text-[11px] text-[var(--foreground-muted)]">
                {childAccountLabel
                  ? `Conta filho(a): ${childAccountLabel}`
                  : `${person1Label} & ${person2Label}`}
              </p>
            </div>
            <form action={logoutAction}>
              <button
                type="submit"
                title="Sair"
                className="grid h-8 w-8 place-items-center rounded-lg text-[var(--foreground-muted)] hover:bg-[var(--danger-soft)] hover:text-[var(--danger)] transition"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[var(--background)]">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-[260px] shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface)] sticky top-0 h-screen">
        {sidebarContent()}
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden animate-fade-in"
          aria-hidden
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        className={cn(
          "lg:hidden fixed inset-y-0 left-0 z-50 w-[280px] border-r border-[var(--border)] bg-[var(--surface)] transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-end p-3">
          <button
            onClick={() => setOpen(false)}
            className="grid h-9 w-9 place-items-center rounded-xl text-[var(--foreground-muted)] hover:bg-[var(--surface-muted)]"
            aria-label="Fechar menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {sidebarContent(() => setOpen(false))}
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 glass border-b border-[var(--border-subtle)]">
          <div className="flex h-14 items-center gap-2 px-4 lg:px-8">
            <button
              type="button"
              className="lg:hidden grid h-9 w-9 place-items-center rounded-xl text-[var(--foreground)] hover:bg-[var(--surface-muted)] transition"
              onClick={() => setOpen(true)}
              aria-label="Abrir menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <p className="text-sm font-medium text-[var(--foreground-muted)] hidden lg:block">{coupleName}</p>
            <div className="ml-auto flex items-center gap-2">
              <Button asChild variant="primary" size="sm" className="hidden sm:inline-flex" leftIcon={<Plus className="h-4 w-4" />}>
                <Link href="/despesas/nova">Nova despesa</Link>
              </Button>
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 pt-6 pb-28 lg:px-8 lg:pb-12">
          <div className="mx-auto w-full max-w-6xl animate-fade-in">{children}</div>
        </main>

        {/* Mobile bottom tab bar com FAB central */}
        <nav
          className="lg:hidden fixed bottom-0 inset-x-0 z-30 safe-bottom border-t border-[var(--border)] bg-[var(--surface)]/90 glass"
          aria-label="Navegação inferior"
        >
          <div className="relative grid grid-cols-5 items-center px-2 pt-2 pb-1.5">
            {MOBILE_TABS.slice(0, 2).map((t) => {
              const active = t.href === "/" ? pathname === "/" : pathname.startsWith(t.href);
              const I = t.icon;
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  className={cn(
                    "flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition",
                    active ? "text-[var(--primary)]" : "text-[var(--foreground-muted)]"
                  )}
                >
                  <I className="h-[20px] w-[20px]" />
                  <span className="text-[10px] font-medium">{t.label}</span>
                </Link>
              );
            })}
            <div className="flex justify-center">
              <Link
                href="/despesas/nova"
                aria-label="Nova despesa"
                className="grid h-12 w-12 place-items-center rounded-2xl bg-grad-indigo text-white shadow-[var(--shadow-lg)] -mt-6 active:scale-95 transition"
              >
                <Plus className="h-5 w-5" />
              </Link>
            </div>
            {MOBILE_TABS.slice(2).map((t) => {
              const active = pathname.startsWith(t.href);
              const I = t.icon;
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  className={cn(
                    "flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition",
                    active ? "text-[var(--primary)]" : "text-[var(--foreground-muted)]"
                  )}
                >
                  <I className="h-[20px] w-[20px]" />
                  <span className="text-[10px] font-medium">{t.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
