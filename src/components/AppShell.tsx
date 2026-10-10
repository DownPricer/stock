"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { SiteReadyCredit } from "@/components/brand/SiteReadyMark";
import {
  IconMoon,
  IconPackage,
  IconPlus,
  IconSun,
  IconUsers,
} from "@/components/icons";
import { useTheme } from "@/components/ThemeProvider";

function NavLinks({
  onDark,
  vertical,
}: {
  onDark?: boolean;
  vertical?: boolean;
}) {
  const pathname = usePathname();
  const items = [
    { path: "/", label: "Stock", icon: IconPackage },
    { path: "/bags/new", label: "Nouveau", icon: IconPlus },
    { path: "/accounts", label: "Comptes", icon: IconUsers },
  ] as const;

  return (
    <ul className={vertical ? "flex flex-col gap-1" : "flex w-full"}>
      {items.map((item) => {
        const active =
          item.path === "/"
            ? pathname === "/"
            : pathname === item.path || pathname.startsWith(`${item.path}/`);
        const Icon = item.icon;
        const cls = vertical
          ? `focus-ring flex min-h-[var(--sr-tap)] items-center gap-3 rounded-[var(--sr-radius-control)] px-3 text-sm font-semibold transition-colors ${
              active
                ? "bg-brand text-brand-fg"
                : onDark
                  ? "text-sidebar-muted hover:bg-cream/5 hover:text-sidebar-fg"
                  : "text-muted hover:bg-surface hover:text-foreground"
            }`
          : `focus-ring flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[0.7rem] font-semibold ${
              active ? "text-accent" : "text-muted"
            }`;

        return (
          <li key={item.path} className={vertical ? undefined : "flex-1"}>
            <Link href={item.path} className={cls}>
              <Icon size={vertical ? 20 : 18} />
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();
  const isAuthPage = pathname === "/login";

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="lg:flex lg:min-h-dvh">
        <aside className="sticky top-0 hidden h-dvh w-[var(--sr-sidebar-w)] shrink-0 flex-col bg-sidebar text-sidebar-fg lg:flex">
          <div className="flex items-center justify-between px-5 py-6">
            <Link href="/" className="focus-ring rounded-lg">
              <span className="font-display text-lg font-black tracking-tight text-sidebar-fg">
                Stock
              </span>
            </Link>
            <button
              type="button"
              onClick={toggle}
              className="focus-ring flex h-10 w-10 items-center justify-center rounded-full text-sidebar-muted hover:bg-cream/5 hover:text-sidebar-fg"
              aria-label={theme === "dark" ? "Mode clair" : "Mode sombre"}
            >
              {theme === "dark" ? <IconSun size={18} /> : <IconMoon size={18} />}
            </button>
          </div>
          <nav className="flex-1 px-3 pt-2">
            <NavLinks onDark vertical />
          </nav>
          <div className="border-t border-cream/10 px-4 py-4">
            <SiteReadyCredit tone="onDark" />
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-border bg-surface/80 px-4 py-3 backdrop-blur lg:hidden">
            <Link href="/" className="focus-ring rounded-lg">
              <span className="font-display text-lg font-black tracking-tight">
                Stock
              </span>
            </Link>
            <button
              type="button"
              onClick={toggle}
              className="focus-ring flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface"
              aria-label={theme === "dark" ? "Mode clair" : "Mode sombre"}
            >
              {theme === "dark" ? <IconSun size={18} /> : <IconMoon size={18} />}
            </button>
          </header>

          <main className="mx-auto w-full max-w-[var(--sr-content-max)] flex-1 px-4 py-5 pb-28 sm:px-6 lg:px-10 lg:py-8 lg:pb-10">
            {children}
          </main>

          <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
            <NavLinks />
          </nav>
        </div>
      </div>
    </div>
  );
}
