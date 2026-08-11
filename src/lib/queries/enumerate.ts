import { readDb } from "@/lib/db/server";

/**
 * Lightweight, fully-paginated slug/id enumerators for the sitemap.
 *
 * Unlike the ranked `getTopPlayers`/`getClubsRanked` (capped at top-N), these walk
 * the entire table in 1000-row pages so every indexable page reaches the crawlers
 * we welcome in robots.ts. Projections are minimal (slug/id only) to stay cheap.
 */

const PAGE = 1000;

async function collectAll<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error || !data || data.length === 0) break;
    out.push(...data);
    if (data.length < PAGE) break; // last page
  }
  return out;
}

type PlayerJoinRow = { players: { slug: string | null } | null };
type SlugRow = { slug: string | null };
type RumourRow = { id: string; last_update: string | null };

const isStr = (s: string | null | undefined): s is string => typeof s === "string" && s.length > 0;
const dedupe = (arr: string[]): string[] => Array.from(new Set(arr));

/** Every player slug that carries a valuation — i.e. a real, content-rich profile page. */
export async function getAllPlayerSlugs(): Promise<string[]> {
  const rows = await collectAll<PlayerJoinRow>(
    (from, to) =>
      readDb()
        .from("player_valuations")
        .select("players!inner(slug)")
        .order("value_eur", { ascending: false, nullsFirst: false })
        .range(from, to) as unknown as PromiseLike<{ data: PlayerJoinRow[] | null; error: unknown }>,
  );
  return dedupe(rows.map((r) => r.players?.slug).filter(isStr));
}

/** Every club slug. */
export async function getAllClubSlugs(): Promise<string[]> {
  const rows = await collectAll<SlugRow>(
    (from, to) =>
      readDb()
        .from("clubs")
        .select("slug")
        .order("slug", { ascending: true })
        .range(from, to) as unknown as PromiseLike<{ data: SlugRow[] | null; error: unknown }>,
  );
  return dedupe(rows.map((r) => r.slug).filter(isStr));
}

/** Every non-candidate transfer rumour id, newest first, with last-update for `lastModified`. */
export async function getAllRumourIds(): Promise<{ id: string; lastUpdate: string | null }[]> {
  const rows = await collectAll<RumourRow>(
    (from, to) =>
      readDb()
        .from("rumours")
        .select("id,last_update")
        .neq("status", "candidate")
        .order("last_update", { ascending: false, nullsFirst: false })
        .range(from, to) as unknown as PromiseLike<{ data: RumourRow[] | null; error: unknown }>,
  );
  return rows.map((r) => ({ id: r.id, lastUpdate: r.last_update }));
}
