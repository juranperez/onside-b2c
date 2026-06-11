import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  normalizePosition,
  pickLeagueStat,
  per90,
  fullName,
  knownAs,
  normalizePlayer,
  type RawPlayer,
} from "./normalize";

const here = dirname(fileURLToPath(import.meta.url));
const sample = JSON.parse(
  readFileSync(join(here, "__fixtures__/players-sample.json"), "utf8"),
) as RawPlayer[];
const [gakpo, alisson, bench] = sample;

describe("normalizePosition", () => {
  it("maps API positions to GK/DEF/MID/FWD", () => {
    expect(normalizePosition("Goalkeeper")).toBe("GK");
    expect(normalizePosition("Defender")).toBe("DEF");
    expect(normalizePosition("Midfielder")).toBe("MID");
    expect(normalizePosition("Attacker")).toBe("FWD");
  });
  it("defaults unknown/null to MID", () => {
    expect(normalizePosition(null)).toBe("MID");
    expect(normalizePosition("Coach")).toBe("MID");
  });
});

describe("per90", () => {
  it("computes a rounded rate", () => {
    expect(per90(7, 2765)).toBe(0.23);
  });
  it("returns null on zero minutes", () => {
    expect(per90(3, 0)).toBeNull();
    expect(per90(0, 900)).toBeNull();
  });
});

describe("fullName", () => {
  it("prefers firstname + lastname over the abbreviated name", () => {
    expect(fullName(gakpo.player)).toBe("Cody Mathès Gakpo");
  });
});

describe("knownAs", () => {
  it("expands the API short name against the firstname (the authoritative display form)", () => {
    // name="C. Gakpo", firstname="Cody Mathès" → "Cody Gakpo"
    expect(knownAs(gakpo.player)).toBe("Cody Gakpo");
  });

  it("keeps an already-full API name as-is (mononyms like Alisson, Pedri)", () => {
    // name="Alisson" carries no initial — it IS the display name
    expect(knownAs(alisson.player)).toBe("Alisson");
  });

  it("survives surname-mid-name conventions via the short name", () => {
    // The regression class: lastname="Braut Haaland" puts the surname LAST,
    // "Mbappé Lottin" puts it FIRST — only the short name disambiguates.
    expect(knownAs({ id: 3, name: "E. Haaland", firstname: "Erling", lastname: "Braut Haaland" })).toBe("Erling Haaland");
  });

  it("skips particles in lastname", () => {
    const mbappe = {
      id: 1, name: "K. Mbappé",
      firstname: "Kylian", lastname: "Mbappé Lottin",
    };
    expect(knownAs(mbappe)).toBe("Kylian Mbappé");
  });

  it("skips leading particles (van, de, etc.) in lastname", () => {
    const player = { id: 2, name: "L. de Ligt", firstname: "Matthijs", lastname: "de Ligt" };
    // "de" is a particle → takes "Ligt" as the meaningful token
    expect(knownAs(player)).toBe("Matthijs Ligt");
  });
});

describe("pickLeagueStat", () => {
  it("picks the entry matching the swept league, not the highest-minute competition", () => {
    const picked = pickLeagueStat(alisson.statistics, 39);
    expect(picked?.league.id).toBe(39);
    expect(picked?.games.minutes).toBe(2520);
  });
});

describe("normalizePlayer", () => {
  it("maps an outfield player correctly", () => {
    const n = normalizePlayer(gakpo, 39)!;
    expect(n.player).toMatchObject({
      id: "247",
      slug: "cody-mathes-gakpo-247",
      name: "Cody Mathès Gakpo",
      position: "MID",
      age: 26,
      dob: "1999-05-07",
      nationality: "Netherlands",
      club_id: "40",
      height_cm: 193,
      shirt_no: 18,
      data_source: "api-football",
    });
    expect(n.club).toMatchObject({ id: "40", slug: "liverpool-40", name: "Liverpool", league_id: "39" });
    expect(n.stat).toMatchObject({
      player_id: "247",
      season: 2025,
      minutes: 2765,
      goals: 7,
      assists: 5,
      goals_p90: 0.23,
      assists_p90: 0.16,
      rating: 6.89,
    });
  });

  it("picks the league entry for a multi-competition player (GK)", () => {
    const n = normalizePlayer(alisson, 39)!;
    expect(n.player.position).toBe("GK");
    expect(n.stat.minutes).toBe(2520);
    expect(n.stat.goals).toBe(0);
    expect(n.player.club_id).toBe("40");
  });

  it("handles a zero-minute player with null stats safely", () => {
    const n = normalizePlayer(bench, 39)!;
    expect(n.stat.minutes).toBe(0);
    expect(n.stat.goals).toBe(0);
    expect(n.stat.goals_p90).toBeNull();
    expect(n.stat.rating).toBeNull();
    expect(n.player.height_cm).toBeNull();
  });

  it("skips a player with no usable name", () => {
    const nameless = { player: { id: 1, name: "", firstname: null, lastname: null }, statistics: gakpo.statistics };
    expect(normalizePlayer(nameless as unknown as RawPlayer, 39)).toBeNull();
  });

  it("skips a player with no valid club", () => {
    const noClub = { player: gakpo.player, statistics: [{ ...gakpo.statistics[0], team: { id: null, name: null } }] };
    expect(normalizePlayer(noClub as unknown as RawPlayer, 39)).toBeNull();
  });
});
