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
