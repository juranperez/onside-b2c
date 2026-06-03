import { fetchPlayersPage } from "../src/lib/ingest/api-football";
import { normalizePlayer } from "../src/lib/ingest/normalize";

async function main() {
  const { response, paging } = await fetchPlayersPage(39, 2025, 1);
  console.log("PL page 1 — paging:", paging, "players:", response.length);
  for (const r of response.slice(0, 5)) {
    const n = normalizePlayer(r, 39);
    if (!n) continue;
    console.log(
      `${n.player.name} | ${n.player.position} | ${n.club.name} | g:${n.stat.goals} a:${n.stat.assists} min:${n.stat.minutes} rating:${n.stat.rating}`,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
