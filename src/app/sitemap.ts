import type { MetadataRoute } from "next";
import { getTopPlayers, getClubsRanked, getLeagues, getNationalTeams } from "@/lib/queries";

const BASE_URL = "https://onsidemarket.com";

/** Static routes, highest-priority surfaces first. */
const STATIC_ROUTES: Array<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
}> = [
  { path: "/", changeFrequency: "daily", priority: 1.0 },
  { path: "/players", changeFrequency: "daily", priority: 0.9 },
  { path: "/clubs", changeFrequency: "daily", priority: 0.8 },
  { path: "/leagues", changeFrequency: "weekly", priority: 0.7 },
  { path: "/stats", changeFrequency: "daily", priority: 0.7 },
  { path: "/worldcup", changeFrequency: "daily", priority: 0.9 },
  { path: "/worldcup/groups", changeFrequency: "weekly", priority: 0.7 },
  { path: "/worldcup/bracket", changeFrequency: "weekly", priority: 0.7 },
  { path: "/pricing", changeFrequency: "monthly", priority: 0.5 },
  { path: "/methodology", changeFrequency: "monthly", priority: 0.5 },
  { path: "/data-sources", changeFrequency: "monthly", priority: 0.4 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // Each query is isolated: a failure in one entity type must not blank the sitemap.
  const [players, clubs, leagues, nations] = await Promise.all([
    getTopPlayers(200).catch(() => []),
    getClubsRanked(300).catch(() => []),
    getLeagues().catch(() => []),
    getNationalTeams().catch(() => []),
  ]);

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((r) => ({
    url: `${BASE_URL}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  const playerEntries: MetadataRoute.Sitemap = players.map((p) => ({
    url: `${BASE_URL}/players/${p.slug}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  const clubEntries: MetadataRoute.Sitemap = clubs.map((c) => ({
    url: `${BASE_URL}/clubs/${c.slug}`,
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

  return [...staticEntries, ...playerEntries, ...clubEntries, ...leagueEntries, ...nationEntries];
}
