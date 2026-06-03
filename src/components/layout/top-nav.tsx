"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Search, Bell, Menu, X } from "lucide-react";
import { OnsideMark } from "@/components/ui/logo";

const NAV_ITEMS = [
  { href: "/discover", label: "Discover" },
  { href: "/players", label: "Players" },
  { href: "/compare", label: "Compare" },
  { href: "/community", label: "Community" },
  { href: "/coach", label: "AI Coach" },
  { href: "/watchlist", label: "Watchlist" },
];

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 group">
      <OnsideMark size={20} />
      <span className="text-[15px] font-bold tracking-[-0.03em] group-hover:text-acc transition">
        ON<span className="text-mute">/</span>SIDE
      </span>
    </Link>
  );
}

export function TopNav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

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
                      "px-3 py-1.5 rounded-lg text-[13px] font-medium transition",
                      active
                        ? "text-white bg-white/5"
                        : "text-mute hover:text-white hover:bg-white/[0.03]"
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/search"
              className="hidden md:flex items-center gap-2 h-8 px-3 rounded-lg bg-white/5 border border-line text-[12px] text-mute-soft hover:text-mute hover:bg-white/8 transition min-w-[180px]"
            >
              <Search size={13} />
              <span>Search players, leagues...</span>
            </Link>
            <Link
              href="/notifications"
              className="p-2 rounded-lg text-mute hover:text-white hover:bg-white/5 transition relative"
            >
              <Bell size={16} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-acc" />
            </Link>
            <Link
              href="/watchlist"
              className="hidden md:flex w-8 h-8 rounded-full bg-acc/20 text-acc items-center justify-center text-[11px] font-bold"
            >
              M
            </Link>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 rounded-lg text-mute hover:text-white hover:bg-white/5 transition"
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-line bg-ink-900 px-4 py-3 space-y-1 fade-in">
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
                    ? "text-white bg-white/5"
                    : "text-mute hover:text-white"
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
