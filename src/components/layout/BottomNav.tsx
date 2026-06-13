"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Trophy, Home, Users, ArrowLeftRight, Sparkles, type LucideIcon } from "lucide-react";
import { getBottomNavItems } from "@/lib/nav-items";

const ICONS: Record<string, LucideIcon> = {
  "/worldcup": Trophy,
  "/discover": Home,
  "/players": Users,
  "/transfers": ArrowLeftRight,
  "/leagues": Trophy,
  "/ask": Sparkles,
};

/** App-style bottom tab bar — mobile only; desktop keeps the top nav. */
export function BottomNav({ wcActive }: { wcActive: boolean }) {
  const pathname = usePathname();
  const items = getBottomNavItems(wcActive);
  return (
    <nav
      aria-label="Primary"
      className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t border-line bg-ink-900/95 backdrop-blur-xl"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="flex">
        {items.map((item) => {
          const Icon = ICONS[item.href] ?? Home;
          const active = pathname.startsWith(item.href);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 pt-2 pb-1.5 text-[10px] font-medium transition",
                  active ? "text-acc" : "text-mute hover:text-fg"
                )}
              >
                <Icon size={17} strokeWidth={active ? 2.2 : 1.8} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
