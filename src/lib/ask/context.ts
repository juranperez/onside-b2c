import "server-only";

import { readDb } from "@/lib/db/server";
import { toPlayerListItem, type PlayerListItem, type PlayerRowDB } from "@/lib/queries/map";
import { getTopPlayers, getMovers, getWcFixtures, type WcFixture } from "@/lib/queries";
import { getRumours, getRumoursForPlayer } from "@/lib/queries/rumours";
import { extractShingles, classifyIntent } from "./shingles";

/** A link chip shown under the answer so users can click through to the data. */
export interface AskSource {
  label: string;
  href: string;
}

export interface AskContext {
  block: string; // plaintext data block injected into the system prompt
  sources: AskSource[];
}

interface MatchedPlayer extends PlayerListItem {
  stats: { season: number; apps: number | null; goals: number | null; assists: number | null; rating: number | null; xg: number | null; minutes: number | null } | null;
}

type StatRow = { season: number; apps: number | null; minutes: number | null; goals: number | null; assists: number | null; rating: number | null; xg: number | null };

const PLAYER_ASK_SELECT =
  "id,slug,name,known_as,photo_url,position,detailed_pos,age, clubs(slug,name,short_name, leagues(slug,name)), player_valuations(value_eur), player_stats(season,apps,minutes,goals,assists,rating,xg)";

function ilikeAny(column: string, shingles: string[]): string {
  return shingles.map((s) => `${column}.ilike.%${s}%`).join(",");
}

async function matchPlayers(shingles: string[]): Promise<MatchedPlayer[]> {
  if (!shingles.length) return [];
  const { data, error } = await readDb()
    .from("players")
    .select(PLAYER_ASK_SELECT)
    .or(ilikeAny("name_norm", shingles))
    .limit(12);
  if (error || !data) return [];
  const now = new Date();
  return data
    .map((r) => {
      const row = r as unknown as PlayerRowDB & { player_stats: StatRow[] | null };
      const item = toPlayerListItem(row, now);
      const latest = (row.player_stats ?? []).slice().sort((a, b) => b.season - a.season)[0] ?? null;
      return { ...item, stats: latest };
    })
    .sort((a, b) => b.val - a.val)
    .slice(0, 3);
}

async function matchClubs(shingles: string[]) {
  if (!shingles.length) return [];
  const { data } = await readDb()
    .from("clubs")
    .select("slug,name,short_name,squad_value, leagues(slug,name)")
    .or(ilikeAny("name_norm", shingles))
    .order("squad_value", { ascending: false })
    .limit(2);
  return (data ?? []) as unknown as Array<{ slug: string; name: string; squad_value: number | null; leagues: { name: string } | null }>;
}

async function matchNations(shingles: string[]) {
  if (!shingles.length) return [];
  const { data } = await readDb()
    .from("national_teams")
    .select("slug,name,fifa_rank,group_letter,squad_value")
    .or(`${ilikeAny("slug", shingles)},${ilikeAny("name", shingles)}`)
    .limit(3);
  return (data ?? []) as unknown as Array<{ slug: string; name: string; fifa_rank: number | null; group_letter: string | null; squad_value: number | null }>;
}

const fmtM = (millions: number) => `€${millions >= 100 ? Math.round(millions) : Math.round(millions * 10) / 10}M`;

function playerLine(p: MatchedPlayer): string {
  const s = p.stats;
  const statBits = s
    ? ` | season ${s.season}: ${s.apps ?? "—"} apps, ${s.goals ?? 0}g ${s.assists ?? 0}a` +
      (s.xg != null ? `, xG ${Math.round(s.xg * 10) / 10}` : "") +
      (s.rating != null ? `, rating ${s.rating}` : "")
    : "";
  const week = p.dWeek ? ` (${p.dWeek > 0 ? "+" : ""}${Math.round(p.dWeek * 10) / 10}M this week)` : "";
  return `- ${p.displayName} — ${p.detailedPos ?? p.pos}, ${p.age}, ${p.club} (${p.league}). Onside value ${fmtM(p.val)}${week}.${statBits}`;
}

function fixtureLine(f: WcFixture): string {
  const when = f.kickoff ? new Date(f.kickoff).toISOString().slice(0, 16).replace("T", " ") + " UTC" : "TBD";
  const score = f.status !== "scheduled" && f.scoreHome != null ? ` [${f.status.toUpperCase()} ${f.scoreHome}-${f.scoreAway}]` : "";
  const fc = f.forecast ? ` | Onside Forecast: ${f.home.name} ${f.forecast.home}% / draw ${f.forecast.draw}% / ${f.away.name} ${f.forecast.away}%` : "";
  return `- ${f.home.name} vs ${f.away.name} — ${f.round ?? "World Cup"}, ${when}${f.city ? `, ${f.city}` : ""}${score}${fc}`;
}

/**
 * Deterministic grounding for Ask Onside: match entities in the question via the
 * same folded name_norm search the site uses, then attach exactly the datasets
 * the intent needs. Every section is best-effort — a failed query degrades to
 * an absent section, never a failed request.
 */
export async function buildAskContext(question: string): Promise<AskContext> {
  const shingles = extractShingles(question);
  const intent = classifyIntent(question);
  const sources: AskSource[] = [];
  const sections: string[] = [];

  const safe = async <T>(p: Promise<T>, fallback: T): Promise<T> => {
    try {
      return await p;
    } catch {
      return fallback;
    }
  };

  const [players, clubs, nations] = await Promise.all([
    safe(matchPlayers(shingles), []),
    safe(matchClubs(shingles), []),
    safe(matchNations(shingles), []),
  ]);

  if (players.length) {
    sections.push(`MATCHED PLAYERS:\n${players.map(playerLine).join("\n")}`);
    for (const p of players) sources.push({ label: p.displayName, href: `/players/${p.slug}` });
  }

  if (clubs.length) {
    sections.push(
      `MATCHED CLUBS:\n${clubs
        .map((c) => `- ${c.name}${c.leagues ? ` (${c.leagues.name})` : ""} — squad value ${fmtM(Math.round((c.squad_value ?? 0) / 1e6))}`)
        .join("\n")}`,
    );
    for (const c of clubs) sources.push({ label: c.name, href: `/clubs/${c.slug}` });
  }

  if (nations.length) {
    sections.push(
      `MATCHED NATIONS (WC 2026):\n${nations
        .map((n) => `- ${n.name} — FIFA rank ${n.fifa_rank ?? "—"}, group ${n.group_letter ?? "—"}, squad value ${fmtM(Math.round((n.squad_value ?? 0) / 1e6))}`)
        .join("\n")}`,
    );
    for (const n of nations) sources.push({ label: n.name, href: `/worldcup/teams/${n.slug}` });
  }

  // Generic rumour questions ("any rumours worth believing?") — no player named,
  // so attach the top of the live Wire instead of answering empty-handed.
  if (intent.rumours && !players.length) {
    const top = await safe(getRumours(40), []);
    const lines = top
      .filter((r) => r.status === "rumour")
      .sort((a, b) => b.confidence.pct - a.confidence.pct)
      .slice(0, 6)
      .map(
        (r) =>
          `- ${r.player.name}: ${r.player.fromClub} → ${r.toClub} — ${r.summary.slice(0, 110)} | Onside Confidence ${r.confidence.pct}%${r.reportedFeeM ? ` | reported €${r.reportedFeeM}M vs Onside ${fmtM(r.onsideValueM)}` : ""}`,
      );
    if (lines.length) {
      sections.push(`TOP LIVE TRANSFER RUMOURS (by Onside Confidence %):\n${lines.join("\n")}`);
      sources.push({ label: "The Wire", href: "/transfers" });
    }
  }

  // Rumours for matched players (top 2 players, 2 rumours each).
  if (intent.rumours && players.length) {
    const rumourBlocks = await safe(
      Promise.all(players.slice(0, 2).map((p) => getRumoursForPlayer(p.id))),
      [] as Awaited<ReturnType<typeof getRumoursForPlayer>>[],
    );
    const lines = rumourBlocks
      .flat()
      .slice(0, 4)
      .map(
        (r) =>
          `- ${r.player.name} → ${r.toClub ?? "?"} (${r.status}) — ${r.summary ?? "no summary"} | source: ${r.source ?? "—"} | Onside Confidence ${r.confidence}%${r.reportedFeeM ? ` | reported fee €${r.reportedFeeM}M` : ""}`,
      );
    if (lines.length) sections.push(`TRANSFER RUMOURS (Onside Confidence = our credibility model):\n${lines.join("\n")}`);
  }

  // World Cup fixtures: live now + next upcoming (+ matched nation's games).
  if (intent.worldCup || nations.length) {
    const fixtures = await safe(getWcFixtures(), [] as WcFixture[]);
    const now = Date.now();
    const live = fixtures.filter((f) => f.status === "live");
    const upcoming = fixtures.filter((f) => f.status === "scheduled" && f.kickoff && new Date(f.kickoff).getTime() > now - 3 * 3600_000);
    const nationSlugs = new Set(nations.map((n) => n.slug));
    const nationGames = upcoming.filter((f) => nationSlugs.has(f.home.slug) || nationSlugs.has(f.away.slug)).slice(0, 3);
    const next = upcoming.slice(0, 6);
    const picked = [...live, ...nationGames, ...next.filter((f) => !nationGames.includes(f))].slice(0, 8);
    if (picked.length) {
      sections.push(`WORLD CUP FIXTURES (Onside Forecast = squad-value model, entertainment only, NOT betting advice):\n${picked.map(fixtureLine).join("\n")}`);
      sources.push({ label: "WC Schedule", href: "/worldcup/schedule" });
    }
  }

  if (intent.market) {
    const top = await safe(getTopPlayers(10), [] as PlayerListItem[]);
    if (top.length) {
      sections.push(`TOP 10 BY ONSIDE VALUE:\n${top.map((p, i) => `${i + 1}. ${p.displayName} (${p.detailedPos ?? p.pos}, ${p.club}) — ${fmtM(p.val)}`).join("\n")}`);
      sources.push({ label: "All players", href: "/players" });
    }
  }

  if (intent.movers) {
    const movers = await safe(getMovers(6), [] as PlayerListItem[]);
    if (movers.length) {
      sections.push(
        `BIGGEST MOVERS THIS WEEK:\n${movers.map((p) => `- ${p.displayName} (${p.club}) ${p.dWeek > 0 ? "+" : ""}${Math.round(p.dWeek * 10) / 10}M → ${fmtM(p.val)}`).join("\n")}`,
      );
      sources.push({ label: "Insights", href: "/insights" });
    }
  }

  return {
    block: sections.length ? sections.join("\n\n") : "NO MATCHING DATA — tell the user what you can answer (player values, stats, transfer rumours, World Cup fixtures and forecasts) and suggest naming a player, club, or nation.",
    sources: sources.slice(0, 5),
  };
}
