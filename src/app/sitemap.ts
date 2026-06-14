import type { MetadataRoute } from "next";
import { getLeagues, getNationalTeams } from "@/lib/queries";
import { getAllPlayerSlugs, getAllClubSlugs, getAllRumourIds } from "@/lib/queries/enumerate";

const BASE_URL = "https://onsidemarket.com";

// Regenerate at most daily — the enumerators walk full tables, so we don't want
// this recomputed per request. (If total entries ever exceed ~50k, shard with
// Next's generateSitemaps instead of a single file.)
export const revalidate = 86400;

/** Static routes, highest-priority surfaces first. */
const STATIC_ROUTES: Array<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
}> = [
  { path: "/", changeFrequency: "daily", priority: 1.0 },
  { path: "/discover", changeFrequency: "daily", priority: 0.85 },
  { path: "/players", changeFrequency: "daily", priority: 0.9 },
  { path: "/clubs", changeFrequency: "daily", priority: 0.8 },
  { path: "/transfers", changeFrequency: "daily", priority: 0.8 },
  { path: "/leagues", changeFrequency: "weekly", priority: 0.7 },
  { path: "/stats", changeFrequency: "daily", priority: 0.7 },
  { path: "/worldcup", changeFrequency: "daily", priority: 0.95 },
  { path: "/worldcup/groups", changeFrequency: "weekly", priority: 0.7 },
  { path: "/worldcup/bracket", changeFrequency: "weekly", priority: 0.7 },
  { path: "/worldcup/schedule", changeFrequency: "hourly", priority: 0.8 },
  { path: "/pricing", changeFrequency: "monthly", priority: 0.5 },
  { path: "/methodology", changeFrequency: "monthly", priority: 0.5 },
  { path: "/data-sources", changeFrequency: "monthly", priority: 0.4 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // Each query is isolated: a failure in one entity type must not blank the sitemap.
  // Players, clubs and rumours are now enumerated in full (not top-N) so every
  // indexable page is exposed to crawlers; leagues/nations already return all rows.
  const [playerSlugs, clubSlugs, leagues, nations, rumours] = await Promise.all([
    getAllPlayerSlugs().catch(() => []),
    getAllClubSlugs().catch(() => []),
    getLeagues().catch(() => []),
    getNationalTeams().catch(() => []),
    getAllRumourIds().catch(() => []),
  ]);

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((r) => ({
    url: `${BASE_URL}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  const playerEntries: MetadataRoute.Sitemap = playerSlugs.map((slug) => ({
    url: `${BASE_URL}/players/${slug}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  const clubEntries: MetadataRoute.Sitemap = clubSlugs.map((slug) => ({
    url: `${BASE_URL}/clubs/${slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  const leagueEntries: MetadataRoute.Sitemap = leagues.map((l) => ({
    url: `${BASE_URL}/leagues/${l.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.5,
  }));

  const nationEntries: MetadataRoute.Sitemap = nations.map((t) => ({
    url: `${BASE_URL}/worldcup/teams/${t.slug}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  // Transfer rumour detail pages — real `lastModified` from each rumour's last update.
  const rumourEntries: MetadataRoute.Sitemap = rumours.map((r) => ({
    url: `${BASE_URL}/transfers/${r.id}`,
    lastModified: r.lastUpdate ? new Date(r.lastUpdate) : now,
    changeFrequency: "daily",
    priority: 0.6,
  }));

  return [
    ...staticEntries,
    ...playerEntries,
    ...clubEntries,
    ...leagueEntries,
    ...nationEntries,
    ...rumourEntries,
  ];
}
