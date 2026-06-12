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
  // Anglophone given names — same rule: fine in adjacency, never a sole key.
  "keith", "ronald", "harry", "james", "jamie", "jordan", "mason", "marcus",
  "ashley", "wayne", "scott", "craig", "dean", "ross", "kyle", "ryan", "aaron",
  "jack", "john", "paul", "peter", "simon", "stephen", "steven", "michael",
  "chris", "christian", "martin", "anthony", "joseph", "william", "george",
  "benjamin", "nathaniel", "samuel", "jacob", "joshua", "matthew", "andrew",
]);

// Ordinary words and place/club names that occur inside players' legal names.
// Real failures from the 2026-06-11 queue: "20 million apart" → Million Manhoef;
// "medical team under Flick" → Cengiz Ünder; "Real Madrid" → …Madrid Quezada;
// "French striker" → Harry French; "star power" → …God Power…; "green light" →
// André Jay Green. Never a sole identifying key; full names still match via
// adjacency ("Nathaniel Brown" is fine, a lone "brown" is not).
const GENERIC_TOKEN = new Set([
  "million", "billion", "power", "under", "over", "money", "record", "window",
  "winter", "summer", "green", "white", "black", "brown", "young", "king", "star",
  "law", "god", "french", "german", "english", "spanish", "dutch", "danish",
  "north", "south", "east", "west", "madrid", "monaco", "sevilla", "santiago",
  "milan", "roma", "porto", "leeds", "derby", "chelsea", "arsenal", "everton",
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
  const ordered = tokenize(headline).filter((t) => t.length >= 4 && !NAME_STOP.has(t));
  if (!ordered.length) return null;

  // STRONG: two of one player's name tokens ADJACENT in the headline — how full
  // names actually print ("Elliot Anderson", "Raul Jimenez"). Bag-of-words
  // co-occurrence is not enough: "Keith Wyness claims Benjamin Nygren…" contains
  // both tokens of "Benjamin Keith Davies" without being about him.
  const strongIds = new Set<string>();
  for (let i = 0; i < ordered.length - 1; i++) {
    const a = idx.owners.get(ordered[i]);
    const b = idx.owners.get(ordered[i + 1]);
    if (!a?.length || !b?.length) continue;
    const bSet = new Set(b);
    for (const pid of a) if (bSet.has(pid)) strongIds.add(pid);
  }
  if (strongIds.size === 1) return { playerId: [...strongIds][0], strength: "strong" };
  if (strongIds.size > 1) return null; // two full-name matches → ambiguous

  // UNIQUE: exactly one player owns a distinctive token (len ≥ 5, not a common
  // given name, not an ordinary word/place that hides inside legal names).
  const uniqueDistinct = new Set<string>();
  for (const t of new Set(ordered)) {
    const owners = idx.owners.get(t);
    if (owners?.length === 1 && t.length >= 5 && !COMMON_FIRST.has(t) && !GENERIC_TOKEN.has(t)) {
      uniqueDistinct.add(owners[0]);
    }
  }
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
// Single-owner club tokens that are also ordinary headline words, country names,
// weekdays, or common given names — never a SOLE key. Real failures from the
// 2026-06-12 Wire audit: "England mainstay" → New England Revolution; "Real
// Madrid star" → RED Star FC 93. The same class waits in "heart set on a move"
// (Heart of Midlothian), "Arsenal chiefs" (Kaizer Chiefs), "agreed on Wednesday"
// (Sheffield Wednesday), "Vinícius Júnior" (Junior, Colombia), "youth academy"
// (Qingdao Youth Island). Multi-word club names still match via ADJACENCY
// ("New England Revolution sign…"), exactly like player names.
const CLUB_GENERIC = new Set([
  "england", "austria", "america", "scotland", "wales", "ireland",
  "star", "stars", "fire", "racing", "start", "viking", "rapid", "derby",
  "wednesday", "heart", "hearts", "once", "better", "three", "towns", "youth",
  "island", "golden", "arrows", "eagles", "ahead", "chiefs", "motor", "nice",
  "pulse", "standard", "junior", "juniors", "young", "crew", "boys", "college",
  "salt", "lake", "richards", "vicente", "santa", "clara", "central",
  "leon", "jose", "luis", "louis", "diego", "paulo", "martin", "lorenzo", "austin",
]);
// Common shorthands → a distinctive token of the canonical club name.
const CLUB_ALIAS: Record<string, string> = {
  barca: "barcelona", psg: "germain", spurs: "tottenham", juve: "juventus",
  gunners: "arsenal", bavarians: "bayern", cherries: "bournemouth",
};
// Giants whose name tokens are all stopped or ambiguous ("city", "united",
// "madrid"×2, "inter") are matched as PHRASES and given a synthetic token —
// otherwise Manchester City, Man Utd, Real Madrid, Atlético and Inter can never
// be resolved as destinations (the matcher's biggest recall hole).
const CLUB_PHRASES: [RegExp, string][] = [
  [/\bman(?:chester)?\s+city\b/g, " mancity "],
  [/\bman(?:chester)?\s+(?:utd|united)\b/g, " manutd "],
  [/\breal\s+madrid\b/g, " realmadrid "],
  [/\batletico\s+(?:de\s+)?madrid\b|\batleti\b/g, " atleticomadrid "],
  [/\binter\s+milan\b|\binternazionale\b/g, " internazionale "],
  [/\bd\.?c\.?\s+united\b/g, " dcunited "],
  [/\b(?:los angeles|la)\s+galaxy\b/g, " lagalaxy "],
  [/\bnew york city\b/g, " newyorkcityfc "],
  [/\bst\.?\s+louis\s+city\b/g, " stlouiscity "],
  [/\bsan diego\b/g, " sandiegofc "],
  [/\bsao paulo\b/g, " saopaulofc "],
  [/\bsalt lake\b/g, " realsaltlake "],
  [/\baustin fc\b/g, " austinfc "],
];
// Synthetic token → owning club, keyed by the club's folded name in our DB.
const SYNTH_TOKENS: Record<string, string> = {
  "manchester city": "mancity",
  "manchester united": "manutd",
  "real madrid": "realmadrid",
  "atletico madrid": "atleticomadrid",
  inter: "internazionale",
  "dc united": "dcunited",
  "los angeles galaxy": "lagalaxy",
  "new york city fc": "newyorkcityfc",
  "st. louis city": "stlouiscity",
  "san diego": "sandiegofc",
  "sao paulo": "saopaulofc",
  "real salt lake": "realsaltlake",
  austin: "austinfc",
};

export interface ClubIndex {
  owners: Map<string, string[]>; // token -> club ids
  nameOf: Map<string, string>; // club id -> display name
}

export function buildClubIndex(clubs: { id: string; name: string; name_norm: string | null; short_name: string | null }[]): ClubIndex {
  const owners = new Map<string, string[]>();
  const nameOf = new Map<string, string>();
  const add = (t: string, id: string) => {
    const arr = owners.get(t);
    if (arr) arr.push(id);
    else owners.set(t, [id]);
  };
  for (const c of clubs) {
    nameOf.set(c.id, c.name);
    const toks = new Set<string>([...keyTokensClub(c.name_norm ?? c.name), ...keyTokensClub(c.short_name ?? "")]);
    for (const t of toks) add(t, c.id);
    const synth = SYNTH_TOKENS[fold(c.name_norm ?? c.name)];
    if (synth) add(synth, c.id);
  }
  return { owners, nameOf };
}

function keyTokensClub(s: string): string[] {
  return [...new Set(tokenize(s))].filter((t) => t.length >= 4 && !CLUB_STOP.has(t));
}

/**
 * Best-guess destination club from a headline (excluding the player's current club).
 * Mirrors matchPlayer: STRONG = two of one club's tokens adjacent in the text
 * ("Sheffield Wednesday", "New England Revolution"); UNIQUE = a single-owner
 * distinctive token that is not an ordinary word ("Tottenham", "Barcelona").
 * Exactly one non-current club → confident; anything else → null, never guess.
 */
export function matchDestClub(headline: string, idx: ClubIndex, currentClub: string | null): string | null {
  let text = fold(headline);
  for (const [re, tok] of CLUB_PHRASES) text = text.replace(re, tok);
  for (const [alias, canon] of Object.entries(CLUB_ALIAS)) text = text.replace(new RegExp(`\\b${alias}\\b`, "g"), ` ${canon} `);
  const ordered = tokenize(text).filter((t) => t.length >= 4 && !CLUB_STOP.has(t));

  // Strong (adjacent pair) and unique candidates UNION — the current club often
  // appears as the headline's only multi-word mention ("… for Nottingham Forest
  // midfielder") and is excluded below; it must not shadow the real destination.
  const found = new Set<string>();
  for (let i = 0; i < ordered.length - 1; i++) {
    const a = idx.owners.get(ordered[i]);
    const b = idx.owners.get(ordered[i + 1]);
    if (!a?.length || !b?.length) continue;
    const bSet = new Set(b);
    for (const id of a) if (bSet.has(id)) found.add(id);
  }
  for (const t of new Set(ordered)) {
    if (CLUB_GENERIC.has(t)) continue;
    const owners = idx.owners.get(t);
    if (owners?.length === 1) found.add(owners[0]);
  }
  const cur = currentClub ? fold(currentClub) : "";
  const dests = [...found].map((id) => idx.nameOf.get(id)!).filter((n) => n && fold(n) !== cur);
  return dests.length === 1 ? dests[0] : null;
}
