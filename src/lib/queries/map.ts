import { clubStyle, monogram } from "../club-style";
import { liveValue, valueOnDay, dayIndexFor } from "../valuation/pulse";

const DAY = 86_400_000;

// ─────────────────────────── Player listing ───────────────────────────

export interface PlayerListItem {
  id: string;
  slug: string;
  name: string;        // full legal name (for search/SEO)
  displayName: string; // fan-facing: "Kylian Mbappé" not "Kylian Mbappé Lottin"
  photoUrl: string | null;
  pos: string;        // coarse: GK/DEF/MID/FWD (API-Football)
  detailedPos: string | null; // LW/RW/CB/CDM/... (Sportmonks, null if not yet synced)
  age: number;
  club: string;
  clubSlug: string;
  clubShort: string;
  clubBg: string;
  clubColor: string;
  league: string;
  leagueSlug: string;
  val: number; // millions
  dWeek: number; // millions
  spark: number[]; // recent weekly values (millions) for the trend sparkline
}

export interface PlayerRowDB {
  id: string;
  slug: string;
  name: string;
  known_as: string | null;
  photo_url: string | null;
  position: string | null;
  detailed_pos: string | null;
  age: number | null;
  clubs: {
    slug: string;
    name: string;
    short_name: string | null;
    leagues: { slug: string; name: string } | null;
  } | null;
  player_valuations: { value_eur: number } | null;
}

export function toPlayerListItem(r: PlayerRowDB, now: Date = new Date()): PlayerListItem {
  const anchor = r.player_valuations?.value_eur ?? 0;
  const style = clubStyle(r.clubs?.slug ?? r.id);
  const valNow = liveValue(anchor, r.id, now);
  const valWeekAgo = liveValue(anchor, r.id, new Date(now.getTime() - 7 * DAY));
  const spark: number[] = [];
  for (let k = 7; k >= 0; k--) {
    spark.push(Math.round((liveValue(anchor, r.id, new Date(now.getTime() - k * 7 * DAY)) / 1e6) * 10) / 10);
  }
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    displayName: r.known_as ?? r.name,
    photoUrl: r.photo_url ?? null,
    pos: r.position ?? "—",
    detailedPos: r.detailed_pos ?? null,
    age: r.age ?? 0,
    club: r.clubs?.name ?? "Free agent",
    clubSlug: r.clubs?.slug ?? "",
    clubShort: r.clubs?.short_name ?? monogram(r.clubs?.name ?? "FC"),
    clubBg: style.bg,
    clubColor: style.color,
    league: r.clubs?.leagues?.name ?? "—",
    leagueSlug: r.clubs?.leagues?.slug ?? "",
    val: Math.round((valNow / 1e6) * 10) / 10,
    dWeek: Math.round(((valNow - valWeekAgo) / 1e6) * 10) / 10,
    spark,
  };
}

// ─────────────────────────── Player profile ───────────────────────────

export interface PlayerProfile {
  id: string;
  slug: string;
  name: string;        // full legal name (search/SEO/meta)
  displayName: string; // fan-facing display: "Kylian Mbappé"
  photoUrl: string | null;
  firstName: string;
  lastName: string;
  position: string;
  detailedPos: string | null; // LW/RW/CB/... (Sportmonks)
  age: number | null;
  nationality: string | null;
  heightCm: number | null;
  foot: string | null;
  shirtNo: number | null;
  contractUntil: number | null;
  club: { name: string; slug: string } | null;
  league: { name: string; slug: string } | null;
  clubBg: string;
  clubColor: string;
  clubShort: string;
  value: number; // eur, live
  dWeek: number; // eur
  dMonth: number; // eur
  confidence: number;
  bandLow: number;
  bandHigh: number;
  pillars: { label: string; value: number }[];
  stats: { season: number; apps: number; minutes: number; goals: number; assists: number; rating: number | null; xg: number | null } | null;
  series: { label: string; v: number }[]; // millions, ~12 monthly points
}

export interface PlayerProfileRow {
  id: string;
  slug: string;
  name: string;
  known_as: string | null;
  photo_url: string | null;
  position: string | null;
  detailed_pos: string | null;
  age: number | null;
  dob: string | null;
  nationality: string | null;
  height_cm: number | null;
  foot: string | null;
  shirt_no: number | null;
  contract_until: number | null;
  clubs: { slug: string; name: string; short_name: string | null; leagues: { slug: string; name: string } | null } | null;
  player_valuations: {
    value_eur: number;
    pillar_scores: Record<string, number> | null;
    confidence_pct: number;
    band_low: number;
    band_high: number;
  } | null;
  player_stats: { season: number; apps: number | null; minutes: number | null; goals: number | null; assists: number | null; rating: number | null; xg: number | null }[];
}

const PILLAR_LABELS: Record<string, string> = {
  performance: "On-field",
  output: "Output",
  involvement: "Minutes",
  prestige: "League",
  age: "Age curve",
};

export function toPlayerProfile(r: PlayerProfileRow, now: Date = new Date()): PlayerProfile {
  const anchor = r.player_valuations?.value_eur ?? 0;
  const value = liveValue(anchor, r.id, now);
  const dWeek = value - liveValue(anchor, r.id, new Date(now.getTime() - 7 * DAY));
  const dMonth = value - liveValue(anchor, r.id, new Date(now.getTime() - 30 * DAY));
  const style = clubStyle(r.clubs?.slug ?? r.id);

  const displayName = r.known_as ?? r.name;
  const words = displayName.trim().split(/\s+/);
  const lastName = words.length > 1 ? words[words.length - 1] : displayName;
  const firstName = words.length > 1 ? words.slice(0, -1).join(" ") : "";

  const scores = r.player_valuations?.pillar_scores ?? {};
  const pillars = Object.entries(PILLAR_LABELS)
    .filter(([k]) => typeof scores[k] === "number")
    .map(([k, label]) => ({ label, value: Math.round(scores[k]) }));

  const stat = (r.player_stats ?? []).slice().sort((a, b) => b.season - a.season)[0] ?? null;

  // 12 monthly history points from the deterministic Pulse, anchored to the model value.
  const series: { label: string; v: number }[] = [];
  for (let k = 11; k >= 0; k--) {
    const d = new Date(now.getFullYear(), now.getMonth() - k, 1);
    const v = valueOnDay(anchor, r.id, dayIndexFor(d));
    series.push({ label: d.toLocaleString("en-US", { month: "short" }), v: Math.round((v / 1e6) * 10) / 10 });
  }

  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    displayName,
    photoUrl: r.photo_url ?? null,
    firstName,
    lastName,
    position: r.position ?? "—",
    detailedPos: r.detailed_pos ?? null,
    age: r.age,
    nationality: r.nationality,
    heightCm: r.height_cm,
    foot: r.foot,
    shirtNo: r.shirt_no,
    contractUntil: r.contract_until,
    club: r.clubs ? { name: r.clubs.name, slug: r.clubs.slug } : null,
    league: r.clubs?.leagues ? { name: r.clubs.leagues.name, slug: r.clubs.leagues.slug } : null,
    clubBg: style.bg,
    clubColor: style.color,
    clubShort: r.clubs?.short_name ?? monogram(r.clubs?.name ?? "FC"),
    value,
    dWeek,
    dMonth,
    confidence: r.player_valuations?.confidence_pct ?? 0,
    bandLow: r.player_valuations?.band_low ?? 0,
    bandHigh: r.player_valuations?.band_high ?? 0,
    pillars,
    stats: stat
      ? {
          season: stat.season,
          apps: stat.apps ?? 0,
          minutes: stat.minutes ?? 0,
          goals: stat.goals ?? 0,
          assists: stat.assists ?? 0,
          rating: stat.rating,
          xg: stat.xg,
        }
      : null,
    series,
  };
}
