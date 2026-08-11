import { describe, it, expect } from "vitest";
import { toPlayerListItem, toPlayerProfile, RADAR_MIN_MINUTES, type PlayerRowDB, type PlayerProfileRow } from "./map";

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

// ─────────────────────────── Radar minutes-gating ───────────────────────────

const adv = (mins: number): Record<string, number> => ({
  mins,
  xg_p90: 0.5,
  chances_p90: 1,
  dribbles_p90: 1,
  pass_accuracy_pct: 80,
  aerials_won_pct: 50,
  recoveries_p90: 5,
});

const statRow = (season: number, minutes: number, advanced: Record<string, number> | null) => ({
  season,
  apps: 10,
  minutes,
  goals: 5,
  assists: 2,
  rating: 7,
  xg: 4,
  advanced,
});

function profileRow(stats: PlayerProfileRow["player_stats"]): PlayerProfileRow {
  return {
    id: "1",
    slug: "test-player",
    name: "Test Player",
    known_as: "Test Player",
    photo_url: null,
    position: "FWD",
    detailed_pos: "ST",
    age: 24,
    dob: null,
    nationality: "Brazil",
    height_cm: 180,
    foot: "Right",
    shirt_no: 9,
    contract_until: null,
    clubs: { slug: "club", name: "Club", short_name: null, leagues: { slug: "league", name: "League" } },
    player_valuations: { value_eur: 50_000_000, pillar_scores: null, confidence_pct: 80, band_low: 40_000_000, band_high: 60_000_000 },
    player_stats: stats,
  };
}

describe("toPlayerProfile radar minutes-gating", () => {
  const NOW = new Date("2026-06-14"); // currentSeasonYear → 2025

  it("charts the current season when minutes clear the floor", () => {
    const p = toPlayerProfile(profileRow([statRow(2025, RADAR_MIN_MINUTES, adv(RADAR_MIN_MINUTES))]), NOW);
    expect(p.radar).not.toBeNull();
    expect(p.radarSeason).toBe(2025);
    expect(p.radarLowSample).toBe(false);
  });

  it("falls back to the newest qualifying season when the current season is low-sample", () => {
    const p = toPlayerProfile(
      profileRow([
        statRow(2025, 40, adv(40)), // current: too few minutes
        statRow(2024, 2000, adv(2000)), // prior: full season
      ]),
      NOW,
    );
    expect(p.radarSeason).toBe(2024);
    expect(p.radar?.mins).toBe(2000);
    expect(p.radarLowSample).toBe(false);
  });

  it("suppresses the radar and flags low-sample when no season clears the floor", () => {
    const p = toPlayerProfile(profileRow([statRow(2025, 14, adv(14))]), NOW);
    expect(p.radar).toBeNull();
    expect(p.radarSeason).toBeNull();
    expect(p.radarLowSample).toBe(true);
  });

  it("does not flag low-sample when there is no advanced data at all", () => {
    const p = toPlayerProfile(profileRow([statRow(2025, 2000, null)]), NOW);
    expect(p.radar).toBeNull();
    expect(p.radarSeason).toBeNull();
    expect(p.radarLowSample).toBe(false);
  });
});
