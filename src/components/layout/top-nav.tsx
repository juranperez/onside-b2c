"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Search,
  Bell,
  User,
  Menu,
  X,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/players", label: "Players" },
  { href: "/clubs", label: "Clubs" },
  { href: "/leagues", label: "Leagues" },
  { href: "/transfers", label: "Transfers" },
  { href: "/worldcup", label: "World Cup" },
  { href: "/community", label: "Community" },
];

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 group">
      <svg width={20} height={20} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M3 12c0-5 4-9 9-9s9 4 9 9-4 9-9 9"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <circle cx="12" cy="12" r="2.4" fill="currentColor" />
        <path
          d="M12 21c-2.5 0-4.5-2-4.5-4.5"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>
      <span className="text-[15px] font-bold tracking-[-0.03em] group-hover:text-acc transition">
        ONSIDE
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

          <div className="flex items-center gap-2">
            <Link
              href="/search"
              className="p-2 rounded-lg text-mute hover:text-white hover:bg-white/5 transition"
            >
              <Search size={16} />
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
              className="hidden md:flex items-center gap-2 h-8 px-3 rounded-lg bg-white/5 hover:bg-white/10 border border-line text-[13px] font-medium text-mute hover:text-white transition"
            >
              <User size={14} />
              <span>Sign in</span>
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
