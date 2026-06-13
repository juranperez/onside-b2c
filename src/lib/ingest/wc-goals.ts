// src/lib/ingest/wc-goals.ts

/** Shape of an API-Football fixture event (only the fields we use). */
export interface FixtureEvent {
  type: string; // "Goal" | "Card" | "subst" | "Var"
  detail: string; // "Normal Goal" | "Penalty" | "Own Goal" | "Goal Disallowed - offside" | ...
  player: { id: number | null; name: string };
  team: { id: number; name: string };
  time: { elapsed: number };
}

export interface ParsedGoal {
  scorerId: string; // == players.id (the API-Football player id, as string)
  scorerName: string;
  teamId: number;
  minute: number;
}

/** Real, credited goals only: type "Goal" excluding own goals; must have a scorer. */
export function extractGoals(events: FixtureEvent[]): ParsedGoal[] {
  const out: ParsedGoal[] = [];
  for (const e of events) {
    if (e.type !== "Goal") continue;
    if (e.detail === "Own Goal") continue;
    if (e.player.id == null) continue;
    out.push({ scorerId: String(e.player.id), scorerName: e.player.name, teamId: e.team.id, minute: e.time.elapsed });
  }
  return out;
}

/** Dedup key for a pushed goal: fixture + scorer + minute. */
export function goalSignature(fixtureId: string, scorerId: string, minute: number): string {
  return `${fixtureId}:${scorerId}:${minute}`;
}

// ---------------------------------------------------------------------------
// Orchestrator — requires server-only DB clients; not imported in tests
// ---------------------------------------------------------------------------

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";
import { fetchFixtureEvents } from "./api-football";
import { goalPushCopy } from "@/lib/push/goal-copy";
import { broadcast } from "@/lib/push/send";

export interface GoalPushResult { live: number; goals: number; pushed: number; }

/** One detection pass: for each LIVE WC fixture, find NEW credited goals (dedup via
 *  pushed_goals), map scorer→player page, and broadcast. Never throws. */
export async function detectAndPushGoals(db: SupabaseClient<Database>): Promise<GoalPushResult> {
  const res: GoalPushResult = { live: 0, goals: 0, pushed: 0 };
  const { data: liveFx } = await db.from("fixtures")
    .select("id,home_id,away_id,score_home,score_away")
    .eq("competition", "World Cup 2026").eq("status", "live");
  if (!liveFx?.length) return res;
  res.live = liveFx.length;

  const { data: nts } = await db.from("national_teams").select("slug,name");
  const nameBySlug = new Map((nts ?? []).map((n) => [n.slug, n.name] as const));

  for (const fx of liveFx) {
    const rawId = fx.id.replace(/^wc2026-/, "");
    let events;
    try { events = (await fetchFixtureEvents(rawId)).response; } catch { continue; }
    const goals = extractGoals(events);
    res.goals += goals.length;
    if (goals.length === 0) continue;

    const ids = [...new Set(goals.map((g) => g.scorerId))];
    const { data: players } = await db.from("players").select("id,slug,known_as,name").in("id", ids);
    const playerById = new Map((players ?? []).map((p) => [p.id, p] as const));

    for (const g of goals) {
      const player = playerById.get(g.scorerId);
      if (!player) continue; // no player page → skip (no dead-link push)
      const sig = goalSignature(fx.id, g.scorerId, g.minute);
      // Dedup: insert the signature; PK conflict ⇒ already pushed ⇒ skip.
      const { error: dupe } = await db.from("pushed_goals").insert({ signature: sig });
      if (dupe) continue;
      const copy = goalPushCopy({
        scorerName: player.known_as || player.name || g.scorerName,
        scorerSlug: player.slug,
        home: nameBySlug.get(fx.home_id ?? "") ?? "Home",
        away: nameBySlug.get(fx.away_id ?? "") ?? "Away",
        scoreHome: fx.score_home ?? 0,
        scoreAway: fx.score_away ?? 0,
      });
      res.pushed += await broadcast(db, copy);
    }
  }
  return res;
}
