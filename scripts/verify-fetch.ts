import { fetchPlayersPage } from "../src/lib/ingest/api-football";
import { normalizePlayer } from "../src/lib/ingest/normalize";
import { leagueByApiId } from "../src/lib/ingest/leagues";
import { valuePlayer, type Position } from "../src/lib/valuation/model";

async function main() {
  const league = leagueByApiId(39)!; // Premier League
  const { response, paging } = await fetchPlayersPage(39, 2025, 1);
  console.log(`PL page 1 — paging:`, paging, "players:", response.length, "\n");
  for (const r of response.slice(0, 10)) {
    const n = normalizePlayer(r, 39);
    if (!n) continue;
    const v = valuePlayer({
      position: (n.player.position as Position) ?? "MID",
      age: n.player.age ?? null,
      leagueSlug: league.slug,
      minutes: n.stat.minutes ?? 0,
      goals: n.stat.goals ?? 0,
      assists: n.stat.assists ?? 0,
      rating: n.stat.rating ?? null,
    });
    const name = (n.player.name ?? "").padEnd(26);
    console.log(
      `${name} ${n.player.position}  €${(v.value / 1e6).toFixed(1)}M  conf ${v.confidence}%  band [${(v.bandLow / 1e6).toFixed(0)}-${(v.bandHigh / 1e6).toFixed(0)}M]  score ${v.score}`,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
