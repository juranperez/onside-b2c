// Builds World Cup 2026 national teams from the REAL player pool by nationality.
// Teams + groups are the ACTUAL 2026 draw, sourced from API-Football (licensed).
// Squad values are Onside model estimates over the players we hold by nationality.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/db/types";

type Nation = { name: string; slug: string; code: string; conf: string; rank: number; group: string; nat: string[] };

// Actual 2026 final-draw groups (API-Football league 1, season 2026). `nat` matches
// the nationality strings present in our data.
const NATIONS: Nation[] = [
  // Group A
  { name: "Mexico", slug: "mexico", code: "MEX", conf: "CONCACAF", rank: 14, group: "A", nat: ["Mexico"] },
  { name: "South Africa", slug: "south-africa", code: "RSA", conf: "CAF", rank: 60, group: "A", nat: ["South Africa"] },
  { name: "South Korea", slug: "south-korea", code: "KOR", conf: "AFC", rank: 22, group: "A", nat: ["Korea Republic"] },
  { name: "Czech Republic", slug: "czech-republic", code: "CZE", conf: "UEFA", rank: 43, group: "A", nat: ["Czechia"] },
  // Group B
  { name: "Canada", slug: "canada", code: "CAN", conf: "CONCACAF", rank: 30, group: "B", nat: ["Canada"] },
  { name: "Bosnia & Herzegovina", slug: "bosnia-herzegovina", code: "BIH", conf: "UEFA", rank: 45, group: "B", nat: ["Bosnia and Herzegovina"] },
  { name: "Qatar", slug: "qatar", code: "QAT", conf: "AFC", rank: 52, group: "B", nat: ["Qatar"] },
  { name: "Switzerland", slug: "switzerland", code: "SUI", conf: "UEFA", rank: 19, group: "B", nat: ["Switzerland"] },
  // Group C
  { name: "Brazil", slug: "brazil", code: "BRA", conf: "CONMEBOL", rank: 5, group: "C", nat: ["Brazil"] },
  { name: "Morocco", slug: "morocco", code: "MAR", conf: "CAF", rank: 12, group: "C", nat: ["Morocco"] },
  { name: "Haiti", slug: "haiti", code: "HAI", conf: "CONCACAF", rank: 83, group: "C", nat: ["Haiti"] },
  { name: "Scotland", slug: "scotland", code: "SCO", conf: "UEFA", rank: 39, group: "C", nat: ["Scotland"] },
  // Group D
  { name: "United States", slug: "united-states", code: "USA", conf: "CONCACAF", rank: 16, group: "D", nat: ["USA"] },
  { name: "Paraguay", slug: "paraguay", code: "PAR", conf: "CONMEBOL", rank: 41, group: "D", nat: ["Paraguay"] },
  { name: "Australia", slug: "australia", code: "AUS", conf: "AFC", rank: 24, group: "D", nat: ["Australia"] },
  { name: "Turkey", slug: "turkey", code: "TUR", conf: "UEFA", rank: 27, group: "D", nat: ["Türkiye", "Turkey"] },
  // Group E
  { name: "Germany", slug: "germany", code: "GER", conf: "UEFA", rank: 9, group: "E", nat: ["Germany"] },
  { name: "Curaçao", slug: "curacao", code: "CUW", conf: "CONCACAF", rank: 82, group: "E", nat: ["Curaçao"] },
  { name: "Ivory Coast", slug: "ivory-coast", code: "CIV", conf: "CAF", rank: 41, group: "E", nat: ["Côte d'Ivoire"] },
  { name: "Ecuador", slug: "ecuador", code: "ECU", conf: "CONMEBOL", rank: 23, group: "E", nat: ["Ecuador"] },
  // Group F
  { name: "Netherlands", slug: "netherlands", code: "NED", conf: "UEFA", rank: 7, group: "F", nat: ["Netherlands"] },
  { name: "Japan", slug: "japan", code: "JPN", conf: "AFC", rank: 17, group: "F", nat: ["Japan"] },
  { name: "Sweden", slug: "sweden", code: "SWE", conf: "UEFA", rank: 45, group: "F", nat: ["Sweden"] },
  { name: "Tunisia", slug: "tunisia", code: "TUN", conf: "CAF", rank: 40, group: "F", nat: ["Tunisia"] },
  // Group G
  { name: "Belgium", slug: "belgium", code: "BEL", conf: "UEFA", rank: 8, group: "G", nat: ["Belgium"] },
  { name: "Egypt", slug: "egypt", code: "EGY", conf: "CAF", rank: 35, group: "G", nat: ["Egypt"] },
  { name: "Iran", slug: "iran", code: "IRN", conf: "AFC", rank: 20, group: "G", nat: ["Iran"] },
  { name: "New Zealand", slug: "new-zealand", code: "NZL", conf: "OFC", rank: 89, group: "G", nat: ["New Zealand"] },
  // Group H
  { name: "Spain", slug: "spain", code: "ESP", conf: "UEFA", rank: 2, group: "H", nat: ["Spain"] },
  { name: "Cape Verde", slug: "cape-verde", code: "CPV", conf: "CAF", rank: 70, group: "H", nat: ["Cape Verde"] },
  { name: "Saudi Arabia", slug: "saudi-arabia", code: "KSA", conf: "AFC", rank: 59, group: "H", nat: ["Saudi Arabia"] },
  { name: "Uruguay", slug: "uruguay", code: "URU", conf: "CONMEBOL", rank: 15, group: "H", nat: ["Uruguay"] },
  // Group I
  { name: "France", slug: "france", code: "FRA", conf: "UEFA", rank: 3, group: "I", nat: ["France"] },
  { name: "Senegal", slug: "senegal", code: "SEN", conf: "CAF", rank: 18, group: "I", nat: ["Senegal"] },
  { name: "Iraq", slug: "iraq", code: "IRQ", conf: "AFC", rank: 58, group: "I", nat: ["Iraq"] },
  { name: "Norway", slug: "norway", code: "NOR", conf: "UEFA", rank: 28, group: "I", nat: ["Norway"] },
  // Group J
  { name: "Argentina", slug: "argentina", code: "ARG", conf: "CONMEBOL", rank: 1, group: "J", nat: ["Argentina"] },
  { name: "Algeria", slug: "algeria", code: "ALG", conf: "CAF", rank: 43, group: "J", nat: ["Algeria"] },
  { name: "Austria", slug: "austria", code: "AUT", conf: "UEFA", rank: 25, group: "J", nat: ["Austria"] },
  { name: "Jordan", slug: "jordan", code: "JOR", conf: "AFC", rank: 62, group: "J", nat: ["Jordan"] },
  // Group K
  { name: "Portugal", slug: "portugal", code: "POR", conf: "UEFA", rank: 6, group: "K", nat: ["Portugal"] },
  { name: "DR Congo", slug: "dr-congo", code: "COD", conf: "CAF", rank: 56, group: "K", nat: ["Congo DR"] },
  { name: "Uzbekistan", slug: "uzbekistan", code: "UZB", conf: "AFC", rank: 57, group: "K", nat: ["Uzbekistan"] },
  { name: "Colombia", slug: "colombia", code: "COL", conf: "CONMEBOL", rank: 13, group: "K", nat: ["Colombia"] },
  // Group L
  { name: "England", slug: "england", code: "ENG", conf: "UEFA", rank: 4, group: "L", nat: ["England"] },
  { name: "Croatia", slug: "croatia", code: "CRO", conf: "UEFA", rank: 10, group: "L", nat: ["Croatia"] },
  { name: "Ghana", slug: "ghana", code: "GHA", conf: "CAF", rank: 73, group: "L", nat: ["Ghana"] },
  { name: "Panama", slug: "panama", code: "PAN", conf: "CONCACAF", rank: 40, group: "L", nat: ["Panama"] },
];

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing SUPABASE env");
    process.exit(1);
  }
  const db = createClient<Database>(url, key, { auth: { persistSession: false } });

  // Clear any stale nations from a prior (projected) build, then rebuild from the real draw.
  await db.from("national_team_squads").delete().neq("national_team_id", "");
  await db.from("national_teams").delete().neq("id", "");

  let totalPlayers = 0;
  for (const n of NATIONS) {
    const { data, error } = await db
      .from("player_valuations")
      .select("value_eur, players!inner(id,nationality)")
      .in("players.nationality", n.nat)
      .order("value_eur", { ascending: false })
      .limit(26);
    if (error) {
      console.error(`${n.name}: ${error.message}`);
      continue;
    }
    const rows = (data ?? []) as unknown as { value_eur: number; players: { id: string } }[];
    const squadValue = rows.reduce((s, r) => s + (r.value_eur ?? 0), 0);

    await db.from("national_teams").upsert(
      {
        id: n.slug,
        slug: n.slug,
        name: n.name,
        confederation: n.conf,
        fifa_rank: n.rank,
        group_letter: n.group,
        squad_value: squadValue,
        data_source: "api-football+onside",
      },
      { onConflict: "id" },
    );
    if (rows.length) {
      await db.from("national_team_squads").insert(rows.map((r) => ({ national_team_id: n.slug, player_id: r.players.id })));
    }
    totalPlayers += rows.length;
    console.log(`${n.group} ${n.name}: ${rows.length} players, €${(squadValue / 1e6).toFixed(0)}M`);
  }
  console.log(`\nDone: ${NATIONS.length} nations, ${totalPlayers} squad slots.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
