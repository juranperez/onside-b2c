/**
 * Single source of truth for global navigation. Pure data — no React, no
 * dates. Callers pass wcActive (computed server-side from isWcWindow).
 * Labels are display-only renames; routes never change (SEO).
 */
export interface NavItem {
  href: string;
  label: string;
  special?: boolean; // accent + LIVE badge (World Cup during the window)
  ai?: boolean; // accent + sparkles (Ask)
}

const WORLD_CUP: NavItem = { href: "/worldcup", label: "World Cup", special: true };
const ASK: NavItem = { href: "/ask", label: "Ask", ai: true };

/** Primary desktop tabs, in render order. WC leads while the tournament runs. */
export function getNavItems(wcActive: boolean): NavItem[] {
  const core: NavItem[] = [
    { href: "/news", label: "News" },
    { href: "/discover", label: "Today" },
    { href: "/players", label: "Players" },
    { href: "/clubs", label: "Clubs" },
    { href: "/leagues", label: "Competitions" },
    { href: "/transfers", label: "Transfers" },
    { href: "/community", label: "Community" },
  ];
  return wcActive ? [WORLD_CUP, ...core, ASK] : [...core, ASK];
}

/** Mobile bottom tab bar — exactly 5 slots. */
export function getBottomNavItems(wcActive: boolean): NavItem[] {
  return wcActive
    ? [
        WORLD_CUP,
        { href: "/discover", label: "Today" },
        { href: "/players", label: "Players" },
        { href: "/transfers", label: "Wire" },
        ASK,
      ]
    : [
        { href: "/news", label: "News" },
        { href: "/discover", label: "Today" },
        { href: "/players", label: "Players" },
        { href: "/transfers", label: "Wire" },
        ASK,
      ];
}

/** Hamburger (mobile) secondary destinations. */
export function getSecondaryItems(_wcActive: boolean): NavItem[] {
  // Competitions lives here in every window: the mobile tab bar has exactly five
  // slots and News now holds one, so /leagues is always a secondary destination.
  const items: NavItem[] = [
    { href: "/clubs", label: "Clubs" },
    { href: "/leagues", label: "Competitions" },
    { href: "/compare", label: "Compare" },
    { href: "/watchlist", label: "Watchlist" },
    { href: "/notifications", label: "Notifications" },
  ];
  return items;
}
