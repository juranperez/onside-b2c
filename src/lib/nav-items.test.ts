import { describe, it, expect } from "vitest";
import { getNavItems, getBottomNavItems, getSecondaryItems } from "./nav-items";

describe("getNavItems (desktop)", () => {
  it("leads with World Cup during the window, 7 tabs total", () => {
    const items = getNavItems(true);
    expect(items.map((i) => i.label)).toEqual([
      "World Cup", "Today", "Players", "Clubs", "Competitions", "Transfers", "Ask",
    ]);
    expect(items[0]).toMatchObject({ href: "/worldcup", special: true });
    expect(items[6]).toMatchObject({ href: "/ask", ai: true });
  });
  it("drops World Cup post-final, Today resumes first", () => {
    const items = getNavItems(false);
    expect(items.map((i) => i.label)).toEqual([
      "Today", "Players", "Clubs", "Competitions", "Transfers", "Ask",
    ]);
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
  it("is 5 slots, WC-first during the window", () => {
    expect(getBottomNavItems(true).map((i) => i.label)).toEqual([
      "World Cup", "Today", "Players", "Wire", "Ask",
    ]);
  });
  it("swaps WC for Competitions post-final", () => {
    expect(getBottomNavItems(false).map((i) => i.label)).toEqual([
      "Today", "Players", "Wire", "Competitions", "Ask",
    ]);
  });
});

describe("getSecondaryItems (hamburger)", () => {
  it("includes Competitions only during the window (it moves to the bar after)", () => {
    expect(getSecondaryItems(true).map((i) => i.label)).toContain("Competitions");
    expect(getSecondaryItems(false).map((i) => i.label)).not.toContain("Competitions");
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
