"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Search, Bell, Menu, X, Sparkles, Scale } from "lucide-react";
import { OnsideMark } from "@/components/ui/logo";
import { createClient } from "@/lib/db/supabase-browser";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { CmdK } from "./CmdK";
import { getNavItems, getSecondaryItems } from "@/lib/nav-items";
import { REPORTS } from "@/lib/reports";

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 group">
      <OnsideMark size={20} />
      <span className="text-[15px] font-bold tracking-[-0.03em] group-hover:text-acc transition">
        Onside<span className="text-up">.</span>
      </span>
    </Link>
  );
}

export function TopNav({ wcActive }: { wcActive: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<{ email: string } | null>(null);

  const navItems = getNavItems(wcActive);
  const secondaryItems = getSecondaryItems(wcActive);

  useEffect(() => {
    const sb = createClient();
    sb.auth.getUser().then(({ data }) => setUser(data.user ? { email: data.user.email ?? "" } : null));
    const { data: sub } = sb.auth.onAuthStateChange((_e, session) =>
      setUser(session?.user ? { email: session.user.email ?? "" } : null),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleSignOut() {
    const sb = createClient();
    await sb.auth.signOut();
    setUser(null);
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-ink-900/80 backdrop-blur-xl">
      <div className="max-w-[1440px] mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-8">
            <Logo />
            {/* hidden on the nav itself, not the ul — keeps the landmark out of the a11y tree on mobile (BottomNav takes over there) */}
            <nav aria-label="Primary" className="hidden md:block">
              <ul className="flex items-center gap-1">
                {navItems.map((item) => {
                  const active = pathname.startsWith(item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-[13px] font-medium transition inline-flex items-center gap-1.5",
                          item.special || item.ai
                            ? active
                              ? "text-acc bg-acc/10"
                              : "text-acc hover:bg-acc/10"
                            : active
                              ? "text-fg bg-overlay/5"
                              : "text-mute hover:text-fg hover:bg-overlay/[0.03]"
                        )}
                      >
                        {item.ai && <Sparkles size={12} className="shrink-0" />}
                        {item.label}
                        {item.special && (
                          <span className="text-[9px] font-bold leading-none rounded bg-acc text-ink-950 px-1 py-[3px] num">
                            LIVE
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <form
              action="/search"
              className="hidden md:flex items-center gap-2 h-8 px-3 rounded-lg bg-overlay/5 border border-line focus-within:border-mute transition min-w-[200px]"
            >
              <Search size={13} className="text-mute-soft shrink-0" />
              <input
                type="text"
                name="q"
                placeholder="Search players, clubs…"
                autoComplete="off"
                aria-label="Search players, clubs and leagues"
                className="w-full bg-transparent outline-none text-[12px] text-fg placeholder:text-mute-soft"
              />
              <kbd className="text-[9px] num text-mute-soft border border-line rounded px-1 py-0.5 shrink-0">⌘K</kbd>
            </form>
            <CmdK />
            <Link
              href="/compare"
              title="Compare players"
              aria-label="Compare players"
              className="hidden md:block p-2 rounded-lg text-mute hover:text-fg hover:bg-overlay/5 transition"
            >
              <Scale size={16} />
            </Link>
            <ThemeToggle />
            <Link
              href="/notifications"
              aria-label="Notifications"
              className="p-2 rounded-lg text-mute hover:text-fg hover:bg-overlay/5 transition relative"
            >
              <Bell size={16} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-acc" />
            </Link>
            {user ? (
              <div className="hidden md:flex items-center gap-2">
                <Link
                  href="/watchlist"
                  title={user.email}
                  aria-label={`Watchlist — signed in as ${user.email}`}
                  className="w-8 h-8 rounded-full bg-acc/20 text-acc grid place-items-center text-[12px] font-bold uppercase"
                >
                  {user.email.slice(0, 1) || "U"}
                </Link>
                <button
                  onClick={handleSignOut}
                  className="text-[12px] text-mute hover:text-fg transition cursor-pointer"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="hidden md:flex items-center h-8 px-3.5 rounded-lg bg-acc text-ink-950 text-[12px] font-semibold hover:bg-acc/90 transition"
              >
                Sign in
              </Link>
            )}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              className="md:hidden p-2 rounded-lg text-mute hover:text-fg hover:bg-overlay/5 transition"
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-line bg-ink-900 px-4 py-3 space-y-1 fade-in">
          <form
            action="/search"
            onSubmit={() => setMobileOpen(false)}
            className="flex items-center gap-2 h-10 px-3 mb-2 rounded-lg bg-overlay/5 border border-line focus-within:border-mute transition"
          >
            <Search size={15} className="text-mute-soft shrink-0" />
            <input
              type="text"
              name="q"
              placeholder="Search players, clubs…"
              autoComplete="off"
              aria-label="Search players, clubs and leagues"
              className="w-full bg-transparent outline-none text-[14px] text-fg placeholder:text-mute-soft"
            />
          </form>
          {secondaryItems.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "block px-3 py-2.5 rounded-lg text-[14px] font-medium transition",
                  active ? "text-fg bg-overlay/5" : "text-mute hover:text-fg"
                )}
              >
                {item.label}
              </Link>
            );
          })}
          <div className="px-3 pt-3 pb-1 text-[10px] uppercase tracking-[0.14em] text-mute-soft num">Reports</div>
          {REPORTS.map((r) => (
            <Link
              key={r.href}
              href={r.href}
              onClick={() => setMobileOpen(false)}
              className="block px-3 py-2.5 rounded-lg text-[14px] font-medium text-mute hover:text-fg transition"
            >
              {r.title}
            </Link>
          ))}
          <div className="border-t border-line pt-2 mt-2">
            {user ? (
              <button
                onClick={() => {
                  setMobileOpen(false);
                  void handleSignOut();
                }}
                className="block w-full text-left px-3 py-2.5 rounded-lg text-[14px] font-medium text-mute hover:text-fg transition cursor-pointer"
              >
                Sign out
              </button>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2.5 rounded-lg text-[14px] font-semibold text-acc"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
