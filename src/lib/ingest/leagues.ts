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
  // ── Phase 1 expansion (2026-06-06) ────────────────────────────────────────
  // 14 additional top-flight leagues (~+8,000 players). Many World Cup squads
  // feature players from these leagues. API cost: ~20 calls each.
  // European calendar (season 2025 = 2025/26):
  { apiId: 144, season: 2025, name: "Jupiler Pro League", slug: "jupiler-pro-league", country: "Belgium" },
  { apiId: 179, season: 2025, name: "Scottish Premiership", slug: "scottish-premiership", country: "Scotland" },
  { apiId: 218, season: 2025, name: "Austrian Bundesliga", slug: "austrian-bundesliga", country: "Austria" },
  { apiId: 207, season: 2025, name: "Swiss Super League", slug: "swiss-super-league", country: "Switzerland" },
  { apiId: 119, season: 2025, name: "Danish Superliga", slug: "danish-superliga", country: "Denmark" },
  { apiId: 197, season: 2025, name: "Greek Super League", slug: "greek-super-league", country: "Greece" },
  { apiId: 106, season: 2025, name: "Ekstraklasa", slug: "ekstraklasa", country: "Poland" },
  { apiId: 169, season: 2025, name: "Ukrainian Premier League", slug: "ukrainian-premier-league", country: "Ukraine" },
  // Asia / Americas (calendar-year seasons):
  { apiId: 235, season: 2025, name: "K League 1", slug: "k-league-1", country: "South Korea" },
  { apiId: 98, season: 2026, name: "J1 League", slug: "j1-league", country: "Japan" },
  { apiId: 103, season: 2026, name: "Eliteserien", slug: "eliteserien", country: "Norway" },
  { apiId: 113, season: 2026, name: "Allsvenskan", slug: "allsvenskan", country: "Sweden" },
  { apiId: 288, season: 2025, name: "Liga BetPlay", slug: "liga-betplay", country: "Colombia" },
  { apiId: 239, season: 2025, name: "Chinese Super League", slug: "chinese-super-league", country: "China" },
];

/** Subset synced for the launch. Trim or extend as rate budget allows. */
export const LAUNCH_LEAGUES: LeagueConfig[] = LEAGUES;

export function leagueByApiId(apiId: number): LeagueConfig | undefined {
  return LEAGUES.find((l) => l.apiId === apiId);
}
