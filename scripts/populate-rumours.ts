// Real transfer rumours + done deals sourced from public reporting (Sky Sports)
// on 2026-06-05 — NOT fabricated. Accurate source attribution. One-off populate so
// the hub launches with live content; curate/replace via /transfers/manage as the
// window evolves. Run: npm run populate:rumours
//
// Deliberately excluded (data-quality, see notes):
//   · Matheus Nunes — surname collides with a Santa Clara journeyman; the elite
//     "Matheus Luiz Nunes" (id 41621) reads as Man City in our squad data, which
//     contradicts the "Atlético-from-Wolves" report. Too muddled to publish.
//   · Julián Álvarez — correct player (id 6009) but his B2B Transfermarkt anchor is
//     stale (€15M), so his Onside value is wrong; would make the fee-vs-value
//     Confidence factor misleading. Re-add once the anchor is refreshed.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/db/types";

const GBP_EUR = 1.18;
const m = (gbpMillions: number) => Math.round(gbpMillions * GBP_EUR * 1e6);

interface RumourSeed {
  id?: string; // pin by player id when the name carries middle names
  match?: string; // else resolve by fuzzy name (highest-value wins)
  to: string;
  fee: number | null;
  source: string;
  tier: number;
  corrob: number;
  status: "rumour" | "confirmed" | "dead";
  daysAgo: number;
  summary: string;
}

const RUMOURS: RumourSeed[] = [
  { id: "138787", to: "Barcelona", fee: m(69.3), source: "Sky Sports", tier: 2, corrob: 3, status: "confirmed", daysAgo: 1, summary: "Completed move from Newcastle to Barcelona for a reported £69.3m." },
  { id: "288006", to: "Napoli", fee: m(38), source: "Sky Sports", tier: 2, corrob: 2, status: "confirmed", daysAgo: 2, summary: "Manchester United striker joins Napoli in a £38m deal." },
  { match: "elliot anderson", to: "Manchester City", fee: null, source: "Sky Sports", tier: 2, corrob: 2, status: "rumour", daysAgo: 1, summary: "Manchester City in pole position for the Nottingham Forest midfielder, ahead of United and Arsenal." },
];

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing SUPABASE env");
    process.exit(1);
  }
  const db = createClient<Database>(url, key, { auth: { persistSession: false } });
  const now = Date.now();
  let added = 0;

  for (const r of RUMOURS) {
    let player: { id: string; name: string } | undefined;
    if (r.id) {
      const { data } = await db.from("players").select("id,name").eq("id", r.id).maybeSingle();
      player = data ?? undefined;
    } else if (r.match) {
      const { data } = await db
        .from("players")
        .select("id,name, player_valuations(value_eur)")
        .ilike("name_norm", `%${r.match}%`);
      const rows = (data ?? []) as unknown as { id: string; name: string; player_valuations: { value_eur: number } | null }[];
      rows.sort((a, b) => (b.player_valuations?.value_eur ?? 0) - (a.player_valuations?.value_eur ?? 0));
      player = rows[0];
    }
    if (!player) {
      console.warn(`· no match: ${r.id ?? r.match}`);
      continue;
    }

    // Dedup: skip if a rumour already links this player to this club.
    const { data: dup } = await db
      .from("rumours")
      .select("id")
      .eq("player_id", player.id)
      .eq("to_club", r.to)
      .maybeSingle();
    if (dup) {
      console.log(`· exists: ${player.name} → ${r.to}`);
      continue;
    }

    const seen = new Date(now - r.daysAgo * 86_400_000).toISOString();
    const { error } = await db.from("rumours").insert({
      player_id: player.id,
      to_club: r.to,
      reported_fee_eur: r.fee,
      status: r.status,
      summary: r.summary,
      primary_source: r.source,
      source_tier: r.tier,
      corroborations: r.corrob,
      first_seen: seen,
      last_update: seen,
    });
    if (error) {
      console.error(`✗ ${player.name}: ${error.message}`);
      continue;
    }
    console.log(`✓ ${player.name} → ${r.to} (${r.status}, ${r.source})`);
    added++;
  }
  console.log(`\nAdded ${added}/${RUMOURS.length} real rumours.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
