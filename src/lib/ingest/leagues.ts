/** League configuration for ingestion. apiId = API-Football league id. */
export interface LeagueConfig {
  apiId: number;
  season: number;
  name: string;
  slug: string;
  country: string;
}

export const LEAGUES: LeagueConfig[] = [
  // Top 5 European (2025/26 season just completed)
  { apiId: 39, season: 2025, name: "Premier League", slug: "premier-league", country: "England" },
  { apiId: 140, season: 2025, name: "La Liga", slug: "la-liga", country: "Spain" },
  { apiId: 78, season: 2025, name: "Bundesliga", slug: "bundesliga", country: "Germany" },
  { apiId: 135, season: 2025, name: "Serie A", slug: "serie-a", country: "Italy" },
  { apiId: 61, season: 2025, name: "Ligue 1", slug: "ligue-1", country: "France" },
  // Strong secondary leagues + global (feed World Cup squads)
  { apiId: 88, season: 2025, name: "Eredivisie", slug: "eredivisie", country: "Netherlands" },
  { apiId: 94, season: 2025, name: "Primeira Liga", slug: "primeira-liga", country: "Portugal" },
  { apiId: 40, season: 2025, name: "Championship", slug: "championship", country: "England" },
  { apiId: 203, season: 2025, name: "Super Lig", slug: "super-lig", country: "Turkey" },
  { apiId: 307, season: 2025, name: "Saudi Pro League", slug: "saudi-pro-league", country: "Saudi Arabia" },
  { apiId: 128, season: 2025, name: "Primera Division", slug: "primera-division-arg", country: "Argentina" },
  { apiId: 262, season: 2025, name: "Liga MX", slug: "liga-mx", country: "Mexico" },
  // Calendar-year leagues (mid-2026 season in progress)
  { apiId: 253, season: 2026, name: "MLS", slug: "mls", country: "USA" },
  { apiId: 71, season: 2026, name: "Brasileirao", slug: "brasileirao", country: "Brazil" },
];

/** Subset synced for the launch. Trim or extend as rate budget allows. */
export const LAUNCH_LEAGUES: LeagueConfig[] = LEAGUES;

export function leagueByApiId(apiId: number): LeagueConfig | undefined {
  return LEAGUES.find((l) => l.apiId === apiId);
}
