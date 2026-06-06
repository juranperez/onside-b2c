import { describe, it, expect } from "vitest";
import { toPlayerListItem, type PlayerRowDB } from "./map";

const row: PlayerRowDB = {
  id: "247",
  slug: "cody-mathes-gakpo",
  name: "Cody Mathès Gakpo",
  known_as: "Cody Gakpo", photo_url: null,   // fan name: firstname + last meaningful surname token
  position: "MID",
  detailed_pos: "LW",
  age: 26,
  clubs: { slug: "liverpool", name: "Liverpool", short_name: null, leagues: { slug: "premier-league", name: "Premier League" } },
  player_valuations: { value_eur: 72_000_000 },
};

describe("toPlayerListItem", () => {
  it("maps DB fields and derives a live value in millions", () => {
    const item = toPlayerListItem(row, new Date("2026-06-03"));
    expect(item.name).toBe("Cody Mathès Gakpo");        // full legal name preserved
    expect(item.displayName).toBe("Cody Gakpo");         // fan name from known_as
    expect(item.detailedPos).toBe("LW");                 // Sportmonks detailed position
    expect(item.pos).toBe("MID");
    expect(item.club).toBe("Liverpool");
    expect(item.league).toBe("Premier League");
    expect(item.clubBg).toMatch(/^#/);
    // live value sits within the Pulse band of the 72M anchor (0.7..1.4x -> 50..101M)
    expect(item.val).toBeGreaterThan(50);
    expect(item.val).toBeLessThan(101);
    expect(typeof item.dWeek).toBe("number");
  });

  it("falls back gracefully when club/valuation are missing", () => {
    const orphan: PlayerRowDB = { id: "9", slug: "x", name: "Trialist", known_as: null, photo_url: null, position: null, detailed_pos: null, age: null, clubs: null, player_valuations: null };
    const item = toPlayerListItem(orphan, new Date("2026-06-03"));
    expect(item.club).toBe("Free agent");
    expect(item.clubShort).toBe("FC");
    expect(item.val).toBe(0);
    expect(item.pos).toBe("—");
  });
});
