// Applies the ported B2B fallback formula to B2C players that have no B2B record
// (model_version != 'b2b-sios-v2.1'), so every valuation follows B2B methodology.
// Run AFTER sync:b2b-valuations. Run: npm run value:fallback
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/db/types";
import { fallbackValuation, type CoarsePosition } from "../src/lib/valuation/b2b-fallback";

const B2B = "b2b-sios-v2.1";
const FALLBACK = "b2b-sios-v2.1-fallback";

function chunk<T>(a: T[], n: number): T[][] {
  const o: T[][] = [];
  for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n));
  return o;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }
  const db = createClient<Database>(url, key, { auth: { persistSession: false } });

  // 1) Collect every player not sourced from the B2B (anchored) sync.
  const unmatched: string[] = [];
  let from = 0;
  const PAGE = 1000;
  for (;;) {
    const { data, error } = await db
      .from("player_valuations")
      .select("player_id")
      .neq("model_version", B2B)
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    for (const r of data) unmatched.push(r.player_id);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  console.log(`[fallback] ${unmatched.length} players to value via B2B fallback`);

  // 2) Pull inputs, compute, collect upserts.
  const updates: Database["public"]["Tables"]["player_valuations"]["Insert"][] = [];
  for (const batch of chunk(unmatched, 300)) {
    const { data, error } = await db
      .from("players")
      .select("id,position,age,contract_until, clubs(slug, leagues(slug)), player_stats(goals,assists,xg,minutes,apps,season)")
      .in("id", batch);
    if (error) throw new Error(error.message);
    for (const p of data ?? []) {
      const rows = (p as unknown as { player_stats: { goals: number | null; assists: number | null; xg: number | null; minutes: number | null; apps: number | null; season: number }[] }).player_stats ?? [];
      const stat = rows.slice().sort((a, b) => b.season - a.season)[0];
      const clubs = (p as unknown as { clubs: { leagues: { slug: string } | null } | null }).clubs;
      const r = fallbackValuation({
        position: ((p.position as CoarsePosition) ?? "MID"),
        age: p.age,
        leagueSlug: clubs?.leagues?.slug ?? null,
        goals: stat?.goals ?? 0,
        assists: stat?.assists ?? 0,
        xg: stat?.xg ?? 0,
        minutes: stat?.minutes ?? 0,
        matches: stat?.apps ?? 0,
        contractUntil: p.contract_until,
      });
      updates.push({
        player_id: p.id,
        value_eur: r.valueEur,
        band_low: r.bandLow,
        band_high: r.bandHigh,
        confidence_pct: r.confidencePct,
        pillar_scores: {},
        model_version: FALLBACK,
      });
    }
  }

  // 3) Upsert.
  let done = 0;
  for (const c of chunk(updates, 500)) {
    const { error } = await db.from("player_valuations").upsert(c, { onConflict: "player_id" });
    if (error) throw new Error(error.message);
    done += c.length;
  }
  console.log(`[done] wrote ${done} fallback valuations (model ${FALLBACK}).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
