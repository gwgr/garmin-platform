"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { cn } from "../lib/ui";

type AppShellProps = {
  children: ReactNode;
};

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/activities", label: "Activities" },
  { href: "/status/sync", label: "Sync Status" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-[color:var(--line)] bg-[rgba(249,244,236,0.86)] backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-1">
              <Link
                className="text-[1.1rem] font-semibold tracking-[-0.02em] text-[var(--text)] no-underline"
                href="/"
              >
                Garmin Platform
              </Link>
              <p className="m-0 text-sm leading-6 text-[var(--muted)]">
                Local-first Garmin analytics with real synced activity history.
              </p>
            </div>

            <nav aria-label="Primary" className="flex flex-wrap gap-2">
              {navItems.map((item) => {
                const active = isActive(pathname, item.href);

                return (
                  <Link
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "inline-flex min-h-10 items-center justify-center rounded-full border px-4 text-sm font-semibold transition",
                      active
                        ? "border-transparent bg-[var(--accent)] text-[#f7f7f2]"
                        : "border-[color:var(--line)] bg-white/45 text-[var(--text)] hover:bg-white/65",
                    )}
                    href={item.href}
                    key={item.href}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1180px] px-4 pb-16 pt-8 sm:px-6 lg:px-8">{children}</div>
    </div>
  );
}
