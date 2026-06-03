// Builds World Cup 2026 national teams from the REAL player pool by nationality.
// 48 nations, 12 groups, top ~26 players each by Onside valuation. No new API calls.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/db/types";

type Nation = { name: string; slug: string; code: string; conf: string; rank: number; group: string; nat: string[] };

// Projected 2026 field (draw not finalised — groups are projected). `nat` matches the
// nationality strings present in our data.
const NATIONS: Nation[] = [
  { name: "Mexico", slug: "mexico", code: "MEX", conf: "CONCACAF", rank: 14, group: "A", nat: ["Mexico"] },
  { name: "Croatia", slug: "croatia", code: "CRO", conf: "UEFA", rank: 10, group: "A", nat: ["Croatia"] },
  { name: "Ecuador", slug: "ecuador", code: "ECU", conf: "CONMEBOL", rank: 23, group: "A", nat: ["Ecuador"] },
  { name: "Norway", slug: "norway", code: "NOR", conf: "UEFA", rank: 28, group: "A", nat: ["Norway"] },
  { name: "Canada", slug: "canada", code: "CAN", conf: "CONCACAF", rank: 30, group: "B", nat: ["Canada"] },
  { name: "Belgium", slug: "belgium", code: "BEL", conf: "UEFA", rank: 8, group: "B", nat: ["Belgium"] },
  { name: "Morocco", slug: "morocco", code: "MAR", conf: "CAF", rank: 12, group: "B", nat: ["Morocco"] },
  { name: "Japan", slug: "japan", code: "JPN", conf: "AFC", rank: 17, group: "B", nat: ["Japan"] },
  { name: "United States", slug: "united-states", code: "USA", conf: "CONCACAF", rank: 16, group: "C", nat: ["USA"] },
  { name: "Netherlands", slug: "netherlands", code: "NED", conf: "UEFA", rank: 6, group: "C", nat: ["Netherlands"] },
  { name: "Paraguay", slug: "paraguay", code: "PAR", conf: "CONMEBOL", rank: 41, group: "C", nat: ["Paraguay"] },
  { name: "Ghana", slug: "ghana", code: "GHA", conf: "CAF", rank: 73, group: "C", nat: ["Ghana"] },
  { name: "Argentina", slug: "argentina", code: "ARG", conf: "CONMEBOL", rank: 1, group: "D", nat: ["Argentina"] },
  { name: "Australia", slug: "australia", code: "AUS", conf: "AFC", rank: 24, group: "D", nat: ["Australia"] },
  { name: "Poland", slug: "poland", code: "POL", conf: "UEFA", rank: 31, group: "D", nat: ["Poland"] },
  { name: "Senegal", slug: "senegal", code: "SEN", conf: "CAF", rank: 18, group: "D", nat: ["Senegal"] },
  { name: "France", slug: "france", code: "FRA", conf: "UEFA", rank: 2, group: "E", nat: ["France"] },
  { name: "Switzerland", slug: "switzerland", code: "SUI", conf: "UEFA", rank: 19, group: "E", nat: ["Switzerland"] },
  { name: "Nigeria", slug: "nigeria", code: "NGA", conf: "CAF", rank: 44, group: "E", nat: ["Nigeria"] },
  { name: "Saudi Arabia", slug: "saudi-arabia", code: "KSA", conf: "AFC", rank: 59, group: "E", nat: ["Saudi Arabia"] },
  { name: "Brazil", slug: "brazil", code: "BRA", conf: "CONMEBOL", rank: 5, group: "F", nat: ["Brazil"] },
  { name: "Denmark", slug: "denmark", code: "DEN", conf: "UEFA", rank: 21, group: "F", nat: ["Denmark"] },
  { name: "Ivory Coast", slug: "ivory-coast", code: "CIV", conf: "CAF", rank: 40, group: "F", nat: ["Côte d'Ivoire"] },
  { name: "South Korea", slug: "south-korea", code: "KOR", conf: "AFC", rank: 22, group: "F", nat: ["Korea Republic"] },
  { name: "England", slug: "england", code: "ENG", conf: "UEFA", rank: 4, group: "G", nat: ["England"] },
  { name: "Austria", slug: "austria", code: "AUT", conf: "UEFA", rank: 25, group: "G", nat: ["Austria"] },
  { name: "Egypt", slug: "egypt", code: "EGY", conf: "CAF", rank: 33, group: "G", nat: ["Egypt"] },
  { name: "Panama", slug: "panama", code: "PAN", conf: "CONCACAF", rank: 39, group: "G", nat: ["Panama"] },
  { name: "Spain", slug: "spain", code: "ESP", conf: "UEFA", rank: 3, group: "H", nat: ["Spain"] },
  { name: "Sweden", slug: "sweden", code: "SWE", conf: "UEFA", rank: 38, group: "H", nat: ["Sweden"] },
  { name: "Cameroon", slug: "cameroon", code: "CMR", conf: "CAF", rank: 53, group: "H", nat: ["Cameroon"] },
  { name: "Uruguay", slug: "uruguay", code: "URU", conf: "CONMEBOL", rank: 15, group: "H", nat: ["Uruguay"] },
  { name: "Portugal", slug: "portugal", code: "POR", conf: "UEFA", rank: 7, group: "I", nat: ["Portugal"] },
  { name: "Serbia", slug: "serbia", code: "SRB", conf: "UEFA", rank: 32, group: "I", nat: ["Serbia"] },
  { name: "Algeria", slug: "algeria", code: "ALG", conf: "CAF", rank: 43, group: "I", nat: ["Algeria"] },
  { name: "Costa Rica", slug: "costa-rica", code: "CRC", conf: "CONCACAF", rank: 54, group: "I", nat: ["Costa Rica"] },
  { name: "Germany", slug: "germany", code: "GER", conf: "UEFA", rank: 9, group: "J", nat: ["Germany"] },
  { name: "Scotland", slug: "scotland", code: "SCO", conf: "UEFA", rank: 37, group: "J", nat: ["Scotland"] },
  { name: "Tunisia", slug: "tunisia", code: "TUN", conf: "CAF", rank: 50, group: "J", nat: ["Tunisia"] },
  { name: "Chile", slug: "chile", code: "CHI", conf: "CONMEBOL", rank: 51, group: "J", nat: ["Chile"] },
  { name: "Italy", slug: "italy", code: "ITA", conf: "UEFA", rank: 11, group: "K", nat: ["Italy"] },
  { name: "Wales", slug: "wales", code: "WAL", conf: "UEFA", rank: 29, group: "K", nat: ["Wales"] },
  { name: "Mali", slug: "mali", code: "MLI", conf: "CAF", rank: 52, group: "K", nat: ["Mali"] },
  { name: "Venezuela", slug: "venezuela", code: "VEN", conf: "CONMEBOL", rank: 48, group: "K", nat: ["Venezuela"] },
  { name: "Colombia", slug: "colombia", code: "COL", conf: "CONMEBOL", rank: 13, group: "L", nat: ["Colombia"] },
  { name: "Turkey", slug: "turkey", code: "TUR", conf: "UEFA", rank: 26, group: "L", nat: ["Türkiye", "Turkey"] },
  { name: "Greece", slug: "greece", code: "GRE", conf: "UEFA", rank: 47, group: "L", nat: ["Greece"] },
  { name: "Peru", slug: "peru", code: "PER", conf: "CONMEBOL", rank: 49, group: "L", nat: ["Peru"] },
];

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing SUPABASE env");
    process.exit(1);
  }
  const db = createClient<Database>(url, key, { auth: { persistSession: false } });

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
        data_source: "onside-derived",
      },
      { onConflict: "id" },
    );
    // Reset + insert squad members.
    await db.from("national_team_squads").delete().eq("national_team_id", n.slug);
    if (rows.length) {
      await db.from("national_team_squads").insert(rows.map((r) => ({ national_team_id: n.slug, player_id: r.players.id })));
    }
    totalPlayers += rows.length;
    console.log(`${n.name} (${n.group}): ${rows.length} players, €${(squadValue / 1e6).toFixed(0)}M`);
  }
  console.log(`\nDone: ${NATIONS.length} nations, ${totalPlayers} squad slots.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
