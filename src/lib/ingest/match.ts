// Entity resolution for rumour ingestion: map a free-text headline to a player
// (and a destination club) with PRECISION over recall. A wrong match (e.g. a
// "Júnior" suffix routing to Vinícius) is worse than a miss, because the output
// feeds a human review queue — noise erodes trust faster than gaps.
//
// Strategy:
//  - Index every distinctive name token (len ≥ 4), excluding suffixes/particles
//    that are never a distinguishing surname ("junior", "da", "van", …).
//  - A headline matches a player only if EITHER two of that player's tokens
//    co-occur (first + last name) and it's the clear winner, OR exactly one
//    uniquely-distinctive token (owned by a single player, len ≥ 5) is present.
//  - Ambiguous headlines (two equally-strong players) resolve to null — never guess.

export const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// Tokens that are never a distinguishing surname — suffixes, generational markers,
// and nobiliary/patronymic particles. Excluded from being match keys.
const NAME_STOP = new Set([
  "junior", "senior", "filho", "neto", "sobrinho", "jr",
  "dos", "das", "de", "da", "do", "van", "von", "der", "den", "del", "della",
  "di", "le", "la", "el", "al", "bin", "ibn", "dit", "ter",
]);

// Common given names — allowed in co-occurrence (e.g. "Bruno Fernandes") but never
// a SOLE uniquely-identifying key, since headlines about "Paulo Dybala" must not
// resolve to a player whose legal name merely contains "…de Paulo".
const COMMON_FIRST = new Set([
  "paulo", "bruno", "diogo", "joao", "pedro", "carlos", "luis", "luiz", "jose",
  "marco", "rafael", "lucas", "matheus", "thiago", "tiago", "felipe", "filipe",
  "eduardo", "fernando", "sergio", "diego", "andre", "antonio", "miguel", "gabriel",
  "victor", "vitor", "mario", "fabio", "ricardo", "roberto", "juan", "javier",
  "pablo", "hugo", "mateo", "daniel", "david", "angel", "alex", "kevin", "leon",
]);

export function tokenize(s: string): string[] {
  return fold(s).replace(/[^a-z\s]/g, " ").split(/\s+/).filter(Boolean);
}

// Famous transfer journalists whose names appear as bylines or attributions in
// headlines. Their FULL names are stripped before player matching so a byline
// can never resolve to a player who shares a name token ("Fabrizio Romano
// confirms…" must not match Romano Schmid). Full phrases only — a bare surname
// stays, because it can be a legitimate player token ("Romano Schmid agrees…").
const JOURNALISTS = [
  "fabrizio romano", "david ornstein", "matteo moretto", "florian plettenberg",
  "gianluca di marzio", "di marzio", "santi aouna", "ben jacobs", "sami mokbel",
  "rudy galetti", "alfredo pedulla", "nicolo schira", "ekrem konur",
  "mohamed bouhafsi", "cesar luis merlo", "john percy", "craig hope",
  "luke edwards", "paul joyce", "james pearce", "dean jones", "graeme bailey",
  "keith downie", "andrea losapio", "mark ogden", "melissa reddy",
];

/** Folded headline with journalist full names removed — feed THIS to the matchers. */
export function stripJournalists(s: string): string {
  let out = fold(s);
  for (const j of JOURNALISTS) out = out.split(j).join(" ");
  return out;
}

function keyTokens(nameNorm: string): string[] {
  return [...new Set(tokenize(nameNorm))].filter((t) => t.length >= 4 && !NAME_STOP.has(t));
}

export interface PlayerIndex {
  owners: Map<string, string[]>; // token -> player ids that have it
}

export function buildPlayerIndex(players: { id: string; name_norm: string | null }[]): PlayerIndex {
  const owners = new Map<string, string[]>();
  for (const p of players) {
    if (!p.name_norm) continue;
    for (const t of keyTokens(p.name_norm)) {
      const arr = owners.get(t);
      if (arr) arr.push(p.id);
      else owners.set(t, [p.id]);
    }
  }
  return { owners };
}

export type MatchStrength = "strong" | "unique";

/** Resolve a headline to a single player id, or null if absent/ambiguous. */
export function matchPlayer(headline: string, idx: PlayerIndex): { playerId: string; strength: MatchStrength } | null {
  const toks = [...new Set(tokenize(headline))].filter((t) => t.length >= 4 && !NAME_STOP.has(t));
  if (!toks.length) return null;

  const hits = new Map<string, number>(); // playerId -> # of distinct tokens matched
  const uniqueDistinct = new Set<string>(); // players matched by a sole-owner token (len >= 5)
  for (const t of toks) {
    const owners = idx.owners.get(t);
    if (!owners?.length) continue;
    if (owners.length === 1 && t.length >= 5 && !COMMON_FIRST.has(t)) uniqueDistinct.add(owners[0]);
    for (const pid of owners) hits.set(pid, (hits.get(pid) ?? 0) + 1);
  }
  if (!hits.size) return null;

  const ranked = [...hits.entries()].sort((a, b) => b[1] - a[1]);
  const [topPid, topN] = ranked[0];
  const runnerN = ranked[1]?.[1] ?? 0;

  // Clear multi-token winner (first + last name co-occur, beats everyone else).
  if (topN >= 2 && topN > runnerN) return { playerId: topPid, strength: "strong" };
  if (topN >= 2) return null; // two players tied on ≥2 tokens → ambiguous

  // Single-token hits only: accept iff exactly one uniquely-distinctive player.
  if (uniqueDistinct.size === 1) return { playerId: [...uniqueDistinct][0], strength: "unique" };
  return null;
}

// ---- Destination club extraction -------------------------------------------

// Generic club-name tokens that collide across many clubs — never a key on their own.
const CLUB_STOP = new Set([
  "football", "club", "futbol", "calcio", "sport", "sporting", "real", "atletico",
  "athletic", "city", "united", "inter", "county", "town", "rovers", "albion",
  "fc", "cf", "afc", "ac", "ss", "us", "sv", "sc", "rc", "cd", "ud", "real madrid",
]);
// Common shorthands → a distinctive token of the canonical club name.
const CLUB_ALIAS: Record<string, string> = {
  barca: "barcelona", psg: "paris", spurs: "tottenham", juve: "juventus",
  gunners: "arsenal", reds: "liverpool", bavarians: "bayern",
};

export interface ClubIndex {
  owners: Map<string, string[]>; // token -> club ids
  nameOf: Map<string, string>; // club id -> display name
}

export function buildClubIndex(clubs: { id: string; name: string; name_norm: string | null; short_name: string | null }[]): ClubIndex {
  const owners = new Map<string, string[]>();
  const nameOf = new Map<string, string>();
  for (const c of clubs) {
    nameOf.set(c.id, c.name);
    const toks = new Set<string>([...keyTokensClub(c.name_norm ?? c.name), ...keyTokensClub(c.short_name ?? "")]);
    for (const t of toks) {
      const arr = owners.get(t);
      if (arr) arr.push(c.id);
      else owners.set(t, [c.id]);
    }
  }
  return { owners, nameOf };
}

function keyTokensClub(s: string): string[] {
  return [...new Set(tokenize(s))].filter((t) => t.length >= 4 && !CLUB_STOP.has(t));
}

/** Best-guess destination club from a headline (excluding the player's current club). */
export function matchDestClub(headline: string, idx: ClubIndex, currentClub: string | null): string | null {
  const toks = new Set(tokenize(headline));
  for (const [alias, canon] of Object.entries(CLUB_ALIAS)) if (toks.has(alias)) toks.add(canon);
  const found = new Set<string>();
  for (const t of toks) {
    if (t.length < 4 || CLUB_STOP.has(t)) continue;
    const owners = idx.owners.get(t);
    if (owners?.length === 1) found.add(owners[0]); // only unambiguous clubs
  }
  const cur = currentClub ? fold(currentClub) : "";
  const dests = [...found].map((id) => idx.nameOf.get(id)!).filter((n) => n && fold(n) !== cur);
  return dests.length === 1 ? dests[0] : null; // exactly one non-current club → confident
}
