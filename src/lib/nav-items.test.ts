import { describe, it, expect } from "vitest";
import { getNavItems, getBottomNavItems, getSecondaryItems } from "./nav-items";

describe("getNavItems (desktop)", () => {
  it("leads with World Cup during the window, News next, 8 tabs total", () => {
    const items = getNavItems(true);
    expect(items.map((i) => i.label)).toEqual([
      "World Cup", "News", "Today", "Players", "Clubs", "Competitions", "Transfers", "Ask",
    ]);
    expect(items[0]).toMatchObject({ href: "/worldcup", special: true });
    expect(items[7]).toMatchObject({ href: "/ask", ai: true });
  });
  it("drops World Cup post-final, News leads", () => {
    const items = getNavItems(false);
    expect(items.map((i) => i.label)).toEqual([
      "News", "Today", "Players", "Clubs", "Competitions", "Transfers", "Ask",
    ]);
    expect(items[0]).toMatchObject({ href: "/news" });
  });
  it("keeps label-only renames on existing routes", () => {
    const items = getNavItems(false);
    expect(items.find((i) => i.label === "Today")?.href).toBe("/discover");
    expect(items.find((i) => i.label === "Competitions")?.href).toBe("/leagues");
  });
  it("never links retired tabs", () => {
    for (const active of [true, false]) {
      const hrefs = getNavItems(active).map((i) => i.href);
      expect(hrefs).not.toContain("/insights");
      expect(hrefs).not.toContain("/compare");
    }
  });
});

describe("getBottomNavItems (mobile)", () => {
  it("is exactly 5 slots in both windows", () => {
    expect(getBottomNavItems(true)).toHaveLength(5);
    expect(getBottomNavItems(false)).toHaveLength(5);
  });
  it("is WC-first during the window", () => {
    expect(getBottomNavItems(true).map((i) => i.label)).toEqual([
      "World Cup", "Today", "Players", "Wire", "Ask",
    ]);
  });
  it("swaps WC for News post-final (News takes the fifth slot, not Competitions)", () => {
    expect(getBottomNavItems(false).map((i) => i.label)).toEqual([
      "News", "Today", "Players", "Wire", "Ask",
    ]);
  });
});

describe("getSecondaryItems (hamburger)", () => {
  it("always carries Competitions — News holds the tab-bar slot it used to occupy", () => {
    for (const active of [true, false]) {
      expect(getSecondaryItems(active).map((i) => i.label)).toContain("Competitions");
    }
  });
  it("always carries Clubs, Compare, Watchlist, Notifications", () => {
    for (const active of [true, false]) {
      const labels = getSecondaryItems(active).map((i) => i.label);
      for (const l of ["Clubs", "Compare", "Watchlist", "Notifications"]) {
        expect(labels).toContain(l);
      }
    }
  });
});
