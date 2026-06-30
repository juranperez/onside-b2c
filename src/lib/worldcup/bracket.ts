// WC2026 knockout bracket — a static slot tree populated from the live `fixtures`
// table. WC2026-specific by design (the Round-of-32 ordering is this tournament's
// official bracket). R32 is real now; later rounds are TBD and auto-fill as the
// fixture sync adds them — no redeploy needed round to round.

import { onsideForecast, type Forecast } from "@/lib/forecast/onside-forecast";

// Official WC2026 R32 order: left half top→bottom, then right half. Adjacent pairs
// feed the next round (slots 0&1 → R16 slot 0, 2&3 → R16 slot 1, …). Each tie is keyed
// by its two team slugs (order-independent) so it maps to the live fixture whichever
// way round home/away fall.
export const R32_ORDER: readonly (readonly [string, string])[] = [
  ["germany", "paraguay"], ["france", "sweden"], ["south-africa", "canada"], ["netherlands", "morocco"],
  ["portugal", "croatia"], ["spain", "austria"], ["united-states", "bosnia-herzegovina"], ["belgium", "senegal"],
  ["brazil", "japan"], ["ivory-coast", "norway"], ["mexico", "ecuador"], ["england", "dr-congo"],
  ["argentina", "cape-verde"], ["australia", "egypt"], ["switzerland", "algeria"], ["colombia", "ghana"],
];

export const ROUNDS = ["Round of 32", "Round of 16", "Quarter-finals", "Semi-finals", "Final"] as const;
export type RoundName = (typeof ROUNDS)[number];

const ROUND_SIZE: Record<RoundName, number> = {
  "Round of 32": 16, "Round of 16": 8, "Quarter-finals": 4, "Semi-finals": 2, "Final": 1,
};

export interface BracketTeam {
  slug: string;
  name: string;
  valueM: number; // squad value in millions (the Onside flair)
}

export interface BracketSlot {
  round: RoundName;
  index: number; // position within its round, top→bottom
  home: BracketTeam | null;
  away: BracketTeam | null;
  scoreHome: number | null;
  scoreAway: number | null;
  status: "scheduled" | "live" | "finished" | null; // null = TBD (slot not yet drawn)
  kickoff: string | null;
  forecast: Forecast | null; // pre-match Onside read, while both teams are set and unplayed
}

export interface Bracket {
  rounds: { name: RoundName; slots: BracketSlot[] }[];
}

export interface BracketFixture {
  round: string;
  home_id: string | null;
  away_id: string | null;
  score_home: number | null;
  score_away: number | null;
  status: string;
  kickoff: string | null;
}

export type BracketTeamMeta = Map<string, { name: string; valueEur: number; rank: number | null }>;

const TBD = (round: RoundName, index: number): BracketSlot => ({
  round, index, home: null, away: null, scoreHome: null, scoreAway: null, status: null, kickoff: null, forecast: null,
});

/** Build the full knockout tree, populating each slot from the live fixtures. Pure. */
export function buildBracket(fixtures: BracketFixture[], teams: BracketTeamMeta): Bracket {
  const team = (slug: string | null): BracketTeam | null => {
    if (!slug) return null;
    const m = teams.get(slug);
    return { slug, name: m?.name ?? slug, valueM: Math.round((m?.valueEur ?? 0) / 1e6) };
  };
  const forecastFor = (h: string, a: string): Forecast | null => {
    const hm = teams.get(h);
    const am = teams.get(a);
    if (!hm || !am) return null;
    return onsideForecast({ homeValueEur: hm.valueEur, awayValueEur: am.valueEur, homeRank: hm.rank, awayRank: am.rank, neutral: true });
  };
  const slotOf = (round: RoundName, index: number, f: BracketFixture | null): BracketSlot => {
    if (!f || !f.home_id || !f.away_id) return TBD(round, index);
    const status = (f.status as BracketSlot["status"]) ?? "scheduled";
    return {
      round, index,
      home: team(f.home_id), away: team(f.away_id),
      scoreHome: f.score_home, scoreAway: f.score_away, status, kickoff: f.kickoff,
      forecast: status !== "finished" ? forecastFor(f.home_id, f.away_id) : null,
    };
  };

  const byRound = new Map<string, BracketFixture[]>();
  for (const f of fixtures) (byRound.get(f.round) ?? byRound.set(f.round, []).get(f.round)!).push(f);

  // R32 — map each ordered slot to its fixture by the (unordered) team pair.
  const r32Fix = byRound.get("Round of 32") ?? [];
  const findTie = (a: string, b: string) =>
    r32Fix.find((f) => (f.home_id === a && f.away_id === b) || (f.home_id === b && f.away_id === a)) ?? null;
  const r32 = R32_ORDER.map(([a, b], i) => slotOf("Round of 32", i, findTie(a, b)));

  // Later rounds — place each real fixture into the slot whose sub-tree can contain
  // both its teams (robust to penalty-shootout results we don't store). TBD until drawn.
  const rounds: Bracket["rounds"] = [{ name: "Round of 32", slots: r32 }];
  let childTeams: Set<string>[] = r32.map((s) => new Set([s.home?.slug, s.away?.slug].filter(Boolean) as string[]));
  for (const round of ["Round of 16", "Quarter-finals", "Semi-finals", "Final"] as RoundName[]) {
    const fix = byRound.get(round) ?? [];
    const used = new Set<BracketFixture>();
    const possible: Set<string>[] = [];
    const slots: BracketSlot[] = [];
    for (let i = 0; i < ROUND_SIZE[round]; i++) {
      const poss = new Set([...childTeams[2 * i], ...childTeams[2 * i + 1]]);
      possible.push(poss);
      const f = fix.find((x) => !used.has(x) && x.home_id && x.away_id && poss.has(x.home_id) && poss.has(x.away_id)) ?? null;
      if (f) used.add(f);
      slots.push(slotOf(round, i, f));
    }
    rounds.push({ name: round, slots });
    childTeams = possible;
  }

  return { rounds };
}
