"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Search, Bell, Menu, X, Sparkles } from "lucide-react";
import { OnsideMark } from "@/components/ui/logo";
import { createClient } from "@/lib/db/supabase-browser";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { CmdK } from "./CmdK";

// Surface the real destinations (Clubs, Leagues) and drop the not-yet-live
// Community dead ends. Watchlist lives on the user avatar.
const NAV_ITEMS: { href: string; label: string; special?: boolean; ai?: boolean }[] = [
  { href: "/discover", label: "Discover" },
  { href: "/players", label: "Players" },
  { href: "/clubs", label: "Clubs" },
  { href: "/leagues", label: "Leagues" },
  { href: "/transfers", label: "Transfers" },
  { href: "/insights", label: "Insights" },
  { href: "/worldcup", label: "World Cup", special: true },
  { href: "/ask", label: "Ask", ai: true },
  { href: "/compare", label: "Compare" },
];

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

export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<{ email: string } | null>(null);

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
    <nav className="sticky top-0 z-50 border-b border-line bg-ink-900/80 backdrop-blur-xl">
      <div className="max-w-[1440px] mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-8">
            <Logo />
            <div className="hidden md:flex items-center gap-1">
              {NAV_ITEMS.map((item) => {
                const active = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
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
                      <span className="text-[9px] font-bold leading-none rounded bg-acc text-ink-950 px-1 py-[3px] num">26</span>
                    )}
                  </Link>
                );
              })}
            </div>
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
            <ThemeToggle />
            <Link
              href="/notifications"
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
              aria-label="Search"
              className="w-full bg-transparent outline-none text-[14px] text-fg placeholder:text-mute-soft"
            />
          </form>
          {NAV_ITEMS.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "block px-3 py-2.5 rounded-lg text-[14px] font-medium transition",
                  active
                    ? "text-fg bg-overlay/5"
                    : "text-mute hover:text-fg"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
}
