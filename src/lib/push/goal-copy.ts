// src/lib/push/goal-copy.ts
export interface GoalCopyInput {
  scorerName: string;
  scorerSlug: string;
  home: string;
  away: string;
  scoreHome: number;
  scoreAway: number;
}

/** Push payload copy for a goal. Factual, no FIFA marks. */
export function goalPushCopy(g: GoalCopyInput): { title: string; body: string; url: string } {
  return {
    title: `⚽ ${g.scorerName} scores!`,
    body: `${g.home} ${g.scoreHome}–${g.scoreAway} ${g.away}`,
    url: `/players/${g.scorerSlug}`,
  };
}
