import { clubStyle, monogram } from "../club-style";
import { liveValue } from "../valuation/pulse";

const WEEK_MS = 7 * 86_400_000;

/** UI shape consumed by the player listing/grid (val + dWeek are in millions). */
export interface PlayerListItem {
  id: string;
  slug: string;
  name: string;
  pos: string;
  age: number;
  club: string;
  clubSlug: string;
  clubShort: string;
  clubBg: string;
  clubColor: string;
  league: string;
  leagueSlug: string;
  val: number;
  dWeek: number;
}

/** DB row shape from the players + club + league + valuation join. */
export interface PlayerRowDB {
  id: string;
  slug: string;
  name: string;
  position: string | null;
  age: number | null;
  clubs: {
    slug: string;
    name: string;
    short_name: string | null;
    leagues: { slug: string; name: string } | null;
  } | null;
  player_valuations: { value_eur: number } | null;
}

/** Map a DB player row to the listing item, deriving the live Pulse value + weekly delta. */
export function toPlayerListItem(r: PlayerRowDB, now: Date = new Date()): PlayerListItem {
  const anchor = r.player_valuations?.value_eur ?? 0;
  const style = clubStyle(r.clubs?.slug ?? r.id);
  const valNow = liveValue(anchor, r.id, now);
  const valWeekAgo = liveValue(anchor, r.id, new Date(now.getTime() - WEEK_MS));
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    pos: r.position ?? "—",
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
  };
}
