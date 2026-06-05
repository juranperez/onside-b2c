// Pulls the real SIOS valuations from the ONSIDE B2B platform (Railway Postgres)
// and writes them into the B2C, joined by api_football_id == B2C player id.
// The B2C's from-scratch model is replaced by the B2B's market-anchored numbers.
// Run: npm run sync:b2b-valuations
import { Client } from "pg";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/db/types";

const B2B_MODEL_VERSION = "b2b-sios-v2.1";

function chunk<T>(a: T[], n: number): T[][] {
  const o: T[][] = [];
  for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n));
  return o;
}

async function main() {
  const b2bUrl = process.env.B2B_DATABASE_URL;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!b2bUrl) {
    console.error("Missing B2B_DATABASE_URL in .env.local");
    process.exit(1);
  }
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  // 1) Pull B2B valuations — one row per api_football_id (highest SIOS value if dup'd across orgs).
  const pg = new Client({ connectionString: b2bUrl, ssl: { rejectUnauthorized: false } });
  await pg.connect();
  const { rows } = await pg.query(
    `select distinct on (api_football_id)
        api_football_id, sios_valuation_eur, valuation_confidence, market_value_eur
     from players
     where api_football_id is not null and sios_valuation_eur is not null
     order by api_football_id, sios_valuation_eur desc`,
  );
  await pg.end();

  const byId = new Map<string, { val: number; conf: number | null; mv: number | null }>();
  for (const r of rows) {
    byId.set(String(r.api_football_id), {
      val: Number(r.sios_valuation_eur),
      conf: r.valuation_confidence != null ? Number(r.valuation_confidence) : null,
      mv: r.market_value_eur != null ? Number(r.market_value_eur) : null,
    });
  }
  console.log(`[b2b] pulled ${rows.length} rows, ${byId.size} distinct api_football_ids`);

  // 2) Walk the B2C player set; build a valuation row for every match.
  const db = createClient<Database>(url, key, { auth: { persistSession: false } });
  const updates: Database["public"]["Tables"]["player_valuations"]["Insert"][] = [];
  let from = 0;
  const PAGE = 1000;
  let total = 0;
  const unmatched: string[] = [];

  for (;;) {
    const { data, error } = await db.from("players").select("id,name").range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    total += data.length;
    for (const p of data) {
      const b = byId.get(p.id);
      if (!b) {
        unmatched.push(p.name);
        continue;
      }
      const conf = b.conf ?? 0.6;
      const margin = (1 - conf) * 0.3; // mirrors the B2B range derivation
      updates.push({
        player_id: p.id,
        value_eur: b.val,
        band_low: Math.round(b.val * (1 - margin)),
        band_high: Math.round(b.val * (1 + margin)),
        confidence_pct: Math.round(conf * 100),
        pillar_scores: b.mv != null ? { market_value_eur: b.mv } : {},
        model_version: B2B_MODEL_VERSION,
      });
    }
    from += PAGE;
  }
  console.log(`[b2c] ${total} players, matched ${updates.length}, unmatched ${unmatched.length}`);
  if (unmatched.length) console.log(`  unmatched sample: ${unmatched.slice(0, 10).join(", ")}`);

  // 3) Upsert.
  let done = 0;
  for (const c of chunk(updates, 500)) {
    const { error } = await db.from("player_valuations").upsert(c, { onConflict: "player_id" });
    if (error) throw new Error(error.message);
    done += c.length;
  }
  console.log(`[done] wrote ${done} B2B valuations into player_valuations (model ${B2B_MODEL_VERSION}).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
