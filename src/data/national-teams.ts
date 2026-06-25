// World Cup national-team squads rendered by /worldcup/teams/[id].
// Keyed by lowercase FIFA code (the code used in links from the groups page).
//
// South Africa (Bafana Bafana) values are sourced from Transfermarkt market
// values, then given a +50% uplift after the squad reached the Round of 32.
// The raw Transfermarkt baseline (see `marketVal`) sums to €49.25M — matching
// Transfermarkt's reported total squad value — so the uplifted total is €73.9M.

export type Pos = "GK" | "DEF" | "MID" | "FWD";

export interface SquadPlayer {
  shirt: number | null;
  name: string;
  pos: Pos;
  age: number | null;
  club: string;
  clubShort: string;
  clubBg: string;
  clubColor: string;
  /** ONSIDE valuation in € millions (Transfermarkt market value × uplift). */
  val: number;
  /** Raw Transfermarkt market value in € millions, before any uplift. */
  marketVal: number;
}

export interface NationalTeamData {
  /** Lowercase FIFA code — matches the [id] segment in /worldcup/teams/[id]. */
  code: string;
  name: string;
  flag: string;
  confederation: string;
  fifaRanking: number;
  manager: string;
  wcTitles: number;
  /** Group letter, when the team is shown in a drawn group. */
  group?: string;
  /** Knockout stage reached, used when there is no group to show. */
  stage?: string;
  odds?: string;
  /** Short explainer shown in the sidebar (e.g. the valuation uplift). */
  note?: string;
  /** Overrides the computed squad value (€M). Computed from the squad when absent. */
  squadValue?: number;
  /** Overrides the computed average age. Computed from the squad when absent. */
  avgAge?: number;
  squad: SquadPlayer[];
  fixtures?: { vs: string; date: string; venue: string; result?: string | null }[];
  keyStats?: { label: string; val: string }[];
}

// Club crest styling (initials badge + brand colours) used by ClubBadge/Avatar.
const CLUBS: Record<string, { short: string; bg: string; color: string }> = {
  "Mamelodi Sundowns": { short: "SUN", bg: "#F7C600", color: "#0A0A0A" },
  "Orlando Pirates": { short: "PIR", bg: "#0A0A0A", color: "#FFFFFF" },
  "Polokwane City": { short: "POL", bg: "#C8102E", color: "#FFFFFF" },
  "Kaizer Chiefs": { short: "KAI", bg: "#FFB81C", color: "#0A0A0A" },
  Chicago: { short: "CHI", bg: "#0E1E40", color: "#FFFFFF" },
  Molde: { short: "MOL", bg: "#0046AD", color: "#FFFFFF" },
  "Hannover 96": { short: "H96", bg: "#00964B", color: "#FFFFFF" },
  Philadelphia: { short: "PHI", bg: "#0E1B33", color: "#B79A5B" },
  Tondela: { short: "TON", bg: "#008A4B", color: "#FFE100" },
  Burnley: { short: "BUR", bg: "#6C1D45", color: "#9FE5F8" },
  AEL: { short: "AEL", bg: "#00529F", color: "#FFE100" },
  "Real Madrid": { short: "RMA", bg: "#FEBE10", color: "#00529F" },
  Newcastle: { short: "NEW", bg: "#241F20", color: "#FFFFFF" },
  PSG: { short: "PSG", bg: "#004170", color: "#DA291C" },
  Liverpool: { short: "LIV", bg: "#C8102E", color: "#FFFFFF" },
  Barcelona: { short: "BAR", bg: "#A50044", color: "#EDBB00" },
  Arsenal: { short: "ARS", bg: "#EF0107", color: "#FFFFFF" },
};

const round3 = (n: number) => Math.round(n * 1000) / 1000;

// Build a player, applying the post-qualification uplift to the market value.
function mk(
  shirt: number | null,
  name: string,
  pos: Pos,
  age: number | null,
  club: string,
  marketVal: number,
  uplift = 1,
): SquadPlayer {
  const c = CLUBS[club] ?? { short: club.slice(0, 3).toUpperCase(), bg: "#333333", color: "#FFFFFF" };
  return {
    shirt,
    name,
    pos,
    age,
    club,
    clubShort: c.short,
    clubBg: c.bg,
    clubColor: c.color,
    marketVal,
    val: round3(marketVal * uplift),
  };
}

const RSA_UPLIFT = 1.5; // +50% after reaching the Round of 32

const SOUTH_AFRICA: NationalTeamData = {
  code: "rsa",
  name: "South Africa",
  flag: "🇿🇦",
  confederation: "CAF",
  fifaRanking: 56,
  manager: "Hugo Broos",
  wcTitles: 0,
  stage: "Round of 32",
  odds: "+25000",
  note: "Player values reflect Transfermarkt market values with a +50% uplift after Bafana Bafana reached the Round of 32.",
  squad: [
    // Goalkeepers
    mk(1, "Ronwen Williams", "GK", 34, "Mamelodi Sundowns", 0.8, RSA_UPLIFT),
    mk(16, "Sipho Chaine", "GK", 29, "Orlando Pirates", 1.6, RSA_UPLIFT),
    mk(22, "Ricardo Goss", "GK", 32, "Mamelodi Sundowns", 0.35, RSA_UPLIFT),
    // Defenders
    mk(2, "Thabang Matuludi", "DEF", 27, "Polokwane City", 1.2, RSA_UPLIFT),
    mk(3, "Khulumani Ndamane", "DEF", 22, "Mamelodi Sundowns", 1.2, RSA_UPLIFT),
    mk(6, "Aubrey Modiba", "DEF", 30, "Mamelodi Sundowns", 1.8, RSA_UPLIFT),
    mk(14, "Mbekezeli Mbokazi", "DEF", 20, "Chicago", 3.5, RSA_UPLIFT),
    mk(18, "Samukele Kabini", "DEF", 22, "Molde", 2.5, RSA_UPLIFT),
    mk(19, "Nkosinathi Sibisi", "DEF", 30, "Orlando Pirates", 1.6, RSA_UPLIFT),
    mk(20, "Khuliso Mudau", "DEF", 31, "Mamelodi Sundowns", 1.2, RSA_UPLIFT),
    mk(21, "Ime Okon", "DEF", 22, "Hannover 96", 2.0, RSA_UPLIFT),
    mk(24, "Olwethu Makhanya", "DEF", 22, "Philadelphia", 2.0, RSA_UPLIFT),
    mk(26, "Bradley Cross", "DEF", null, "Kaizer Chiefs", 1.0, RSA_UPLIFT),
    // Midfielders
    mk(4, "Teboho Mokoena", "MID", 29, "Mamelodi Sundowns", 2.8, RSA_UPLIFT),
    mk(5, "Thalente Mbatha", "MID", 26, "Orlando Pirates", 2.0, RSA_UPLIFT),
    mk(11, "Themba Zwane", "MID", 36, "Mamelodi Sundowns", 0.25, RSA_UPLIFT),
    mk(13, "Yaya Sithole", "MID", 27, "Tondela", 0.6, RSA_UPLIFT),
    mk(23, "Jayden Adams", "MID", 25, "Mamelodi Sundowns", 1.8, RSA_UPLIFT),
    // Forwards
    mk(7, "Oswin Appollis", "FWD", 24, "Orlando Pirates", 2.5, RSA_UPLIFT),
    mk(8, "Tshepang Moremi", "FWD", 25, "Orlando Pirates", 1.4, RSA_UPLIFT),
    mk(9, "Lyle Foster", "FWD", 25, "Burnley", 8.0, RSA_UPLIFT),
    mk(10, "Relebohile Mofokeng", "FWD", 21, "Orlando Pirates", 3.0, RSA_UPLIFT),
    mk(12, "Thapelo Maseko", "FWD", 22, "AEL", 0.75, RSA_UPLIFT),
    mk(15, "Iqraam Rayners", "FWD", 30, "Mamelodi Sundowns", 2.8, RSA_UPLIFT),
    mk(17, "Evidence Makgopa", "FWD", 26, "Orlando Pirates", 1.4, RSA_UPLIFT),
    mk(25, "Kamogelo Sebelebele", "FWD", 23, "Orlando Pirates", 1.2, RSA_UPLIFT),
  ],
  keyStats: [
    { label: "Base value (Transfermarkt)", val: "€49.3M" },
    { label: "Round-of-32 uplift", val: "+50%" },
    { label: "Most valuable", val: "Lyle Foster" },
    { label: "Captain", val: "Ronwen Williams" },
  ],
};

const BRAZIL: NationalTeamData = {
  code: "bra",
  name: "Brazil",
  flag: "🇧🇷",
  confederation: "CONMEBOL",
  fifaRanking: 5,
  manager: "Dorival Júnior",
  wcTitles: 5,
  group: "G",
  odds: "+800",
  squadValue: 1120,
  avgAge: 26.2,
  squad: [
    mk(1, "Alisson", "GK", 33, "Liverpool", 32.0),
    mk(null, "Marquinhos", "DEF", 31, "PSG", 38.0),
    mk(null, "Bruno Guimarães", "MID", 27, "Newcastle", 88.0),
    mk(null, "Vinícius Jr", "FWD", 25, "Real Madrid", 180.0),
    mk(null, "Rodrygo", "FWD", 25, "Real Madrid", 98.0),
    mk(null, "Endrick", "FWD", 19, "Real Madrid", 72.0),
    mk(null, "Raphinha", "FWD", 29, "Barcelona", 72.0),
    mk(null, "Gabriel Martinelli", "FWD", 24, "Arsenal", 68.0),
  ],
  fixtures: [
    { vs: "Serbia", date: "Jun 12", venue: "MetLife Stadium", result: null },
    { vs: "Switzerland", date: "Jun 17", venue: "AT&T Stadium", result: null },
    { vs: "Cameroon", date: "Jun 22", venue: "Hard Rock Stadium", result: null },
  ],
  keyStats: [
    { label: "Goals in qualifying", val: "22" },
    { label: "Clean sheets", val: "8" },
    { label: "Avg possession", val: "62%" },
    { label: "Top scorer", val: "Vinícius (7)" },
  ],
};

export const NATIONAL_TEAMS: Record<string, NationalTeamData> = {
  rsa: SOUTH_AFRICA,
  bra: BRAZIL,
};

export function getNationalTeam(code: string): NationalTeamData | undefined {
  return NATIONAL_TEAMS[code.toLowerCase()];
}

export function teamSquadValue(t: NationalTeamData): number {
  return t.squadValue ?? round3(t.squad.reduce((sum, p) => sum + p.val, 0));
}

export function teamAvgAge(t: NationalTeamData): number {
  if (t.avgAge != null) return t.avgAge;
  const ages = t.squad.map((p) => p.age).filter((a): a is number => a != null);
  return ages.length ? ages.reduce((sum, a) => sum + a, 0) / ages.length : 0;
}

const POS_GROUPS: { key: Pos; label: string }[] = [
  { key: "GK", label: "Goalkeepers" },
  { key: "DEF", label: "Defenders" },
  { key: "MID", label: "Midfielders" },
  { key: "FWD", label: "Forwards" },
];

export function groupSquad(t: NationalTeamData) {
  return POS_GROUPS.map((g) => ({
    ...g,
    players: t.squad.filter((p) => p.pos === g.key),
  })).filter((g) => g.players.length > 0);
}
