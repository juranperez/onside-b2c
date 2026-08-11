import type { RumourItem } from "./rumours";

/** confirmed outranks live, live outranks dead. */
const STATUS_RANK: Record<string, number> = { confirmed: 3, rumour: 2, dead: 1 };

/**
 * Which of two rows best represents the saga? Prefer the furthest-along status,
 * then the most corroborated, then the most credible source, then the freshest.
 */
function better(a: RumourItem, b: RumourItem): RumourItem {
  const byStatus = (STATUS_RANK[b.status] ?? 0) - (STATUS_RANK[a.status] ?? 0);
  if (byStatus !== 0) return byStatus > 0 ? b : a;
  if (b.corroborations !== a.corroborations) return b.corroborations > a.corroborations ? b : a;
  if (b.sourceTier !== a.sourceTier) return b.sourceTier < a.sourceTier ? b : a; // lower tier = more credible
  return new Date(b.lastUpdate) > new Date(a.lastUpdate) ? b : a;
}

/**
 * One card per saga.
 *
 * The Wire is a feed of STORIES, not of articles: a deal covered by nine outlets
 * is still one deal. Ingest can legitimately end up with several rows for the same
 * player+destination (different outlets, a destination that resolved late, an
 * upgrade racing a merge), so the read path collapses them rather than trusting
 * every write path to have been perfect.
 *
 * Rows whose destination never resolved ("—") are dropped when the same player
 * already has a resolved saga on the feed — same story, strictly less information.
 * Corroboration counts are summed so the surviving card reflects the real weight
 * of reporting behind it.
 */
export function dedupeSagas(items: RumourItem[]): RumourItem[] {
  const byPair = new Map<string, RumourItem>();
  const extraCorroborations = new Map<string, number>();

  for (const it of items) {
    const key = `${it.player.id}|${it.toClub}`;
    const seen = byPair.get(key);
    if (!seen) {
      byPair.set(key, it);
      continue;
    }
    // Same saga reported twice — keep the better row, but remember the weight.
    extraCorroborations.set(key, (extraCorroborations.get(key) ?? 0) + it.corroborations);
    byPair.set(key, better(seen, it));
  }

  const resolvedPlayers = new Set(
    [...byPair.values()].filter((r) => r.toClub !== "—").map((r) => r.player.id),
  );

  const out: RumourItem[] = [];
  for (const [key, item] of byPair) {
    if (item.toClub === "—" && resolvedPlayers.has(item.player.id)) continue;
    const extra = extraCorroborations.get(key) ?? 0;
    out.push(extra ? { ...item, corroborations: item.corroborations + extra } : item);
  }
  // Preserve the caller's ordering (newest-first from the query).
  const order = new Map(items.map((it, i) => [it.id, i] as const));
  return out.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}
