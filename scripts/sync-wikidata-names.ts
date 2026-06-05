/**
 * Wikidata known-name sync (CC0 — zero legal restrictions).
 *
 * Join path: B2C player.id = B2B api_football_id → B2B transfermarkt_id → Wikidata P2446
 * Wikidata rdfs:label (English) = the canonical fan-facing name
 * e.g. "Kylian Mbappé" (not "Kylian Mbappé Lottin")
 *      "Erling Haaland" (not "Erling Braut Haaland")
 *      "Vinícius Júnior" (not "Vinícius José Paixão de Oliveira Júnior")
 *
 * Also captures Wikimedia Commons image URLs for notable players.
 * Coverage: ~1,641 players who exist in both B2B and Wikidata (the notable ones).
 * The remaining players fall back to the heuristic known_as set in the migration.
 *
 * Run: npm run sync:wikidata-names
 *
 * Recommended full-sync order:
 *   1. npm run sync:b2b-valuations   → market-anchored SIOS values
 *   2. npm run value:fallback         → fallback for unmatched players
 *   3. npm run refresh:anchors        → correct 21 stale TM anchors
 *   4. npm run sync:player-photos     → API-Football headshots via B2B
 *   5. npm run sync:wikidata-names    → authoritative known names + CC0 photos
 */
import { Client as PgClient } from "pg";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/db/types";

const WIKIDATA_ENDPOINT = "https://query.wikidata.org/sparql";
const UA = "OnsideBot/1.0 (https://onsidemarket.com; juranperez@gmail.com)";
const BATCH = 60; // TM IDs per SPARQL VALUES clause (keep query short + fast)
const DELAY_MS = 1200; // respect Wikidata 1 req/sec limit

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function wikidataQuery(tmIds: string[]): Promise<Map<string, { label: string; image: string | null }>> {
  // Use VALUES (not FILTER IN) — correct SPARQL multi-value lookup, shorter URL, no parse issues
  const values = tmIds.map((id) => `"${id.trim()}"`).join(" ");
  const sparql = `SELECT DISTINCT ?transfermarktId ?playerLabel ?image WHERE {
  VALUES ?transfermarktId { ${values} }
  ?player wdt:P2446 ?transfermarktId .
  OPTIONAL { ?player wdt:P18 ?image }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
}`;

  const res = await fetch(`${WIKIDATA_ENDPOINT}?query=${encodeURIComponent(sparql)}`, {
    headers: { Accept: "application/json", "User-Agent": UA },
  });

  if (!res.ok) {
    console.warn(`  Wikidata HTTP ${res.status} — skipping batch`);
    return new Map();
  }

  const json = (await res.json()) as { results: { bindings: Record<string, { value: string }>[] } };
  const out = new Map<string, { label: string; image: string | null }>();

  for (const row of json.results?.bindings ?? []) {
    const tm = row.transfermarktId?.value;
    const label = row.playerLabel?.value;
    const image = row.image?.value ?? null;
    if (!tm || !label || label.startsWith("Q")) continue; // skip bare Q-IDs
    const existing = out.get(tm);
    // Prefer the entry with an image; otherwise keep the first
    if (!existing || (!existing.image && image)) out.set(tm, { label, image });
  }

  return out;
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const b2bUrl = process.env.B2B_DATABASE_URL;
  if (!supabaseUrl || !supabaseKey) { console.error("Missing SUPABASE env"); process.exit(1); }
  if (!b2bUrl) { console.error("Missing B2B_DATABASE_URL"); process.exit(1); }

  const db = createClient<Database>(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
  const pg = new PgClient({ connectionString: b2bUrl, ssl: { rejectUnauthorized: false } });
  await pg.connect();

  // Step 1: Build api_football_id → transfermarkt_id map from B2B
  console.log("Reading B2B api_football_id → transfermarkt_id mappings…");
  const { rows: b2bRows } = await pg.query<{ api_football_id: string; transfermarkt_id: string }>(
    `SELECT api_football_id, transfermarkt_id
     FROM players
     WHERE deleted_at IS NULL
       AND api_football_id IS NOT NULL
       AND transfermarkt_id IS NOT NULL`
  );
  await pg.end();

  const afToTm = new Map(b2bRows.map((r) => [r.api_football_id, r.transfermarkt_id]));
  console.log(`Found ${afToTm.size} players with both api_football_id + transfermarkt_id in B2B.`);

  // Step 2: Get the matching B2C players — batch the .in() to avoid PostgREST GET URL limit
  const afIds = [...afToTm.keys()];
  const LOOKUP_BATCH = 400; // stay well under the URL limit
  const allB2cPlayers: { id: string; name: string; known_as: string | null }[] = [];
  for (let i = 0; i < afIds.length; i += LOOKUP_BATCH) {
    const { data } = await db
      .from("players")
      .select("id, name, known_as")
      .in("id", afIds.slice(i, i + LOOKUP_BATCH));
    allB2cPlayers.push(...(data ?? []));
  }

  const players = allB2cPlayers.filter((p) => afToTm.has(p.id));
  console.log(`${players.length} B2C players matched to B2B TM IDs — querying Wikidata…`);

  let updatedNames = 0;
  let updatedPhotos = 0;
  let batches = 0;

  for (let i = 0; i < players.length; i += BATCH) {
    const chunk = players.slice(i, i + BATCH);
    const tmIds = chunk.map((p) => afToTm.get(p.id)!).filter(Boolean);
    batches++;

    const wdMap = await wikidataQuery(tmIds);

    for (const p of chunk) {
      const tm = afToTm.get(p.id);
      if (!tm) continue;
      const wd = wdMap.get(tm);
      if (!wd) continue;

      const updates: Record<string, string> = {};
      if (wd.label && wd.label !== p.known_as) updates.known_as = wd.label;
      if (wd.image) updates.photo_url = wd.image;

      if (!Object.keys(updates).length) continue;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (db.from("players") as any).update(updates).eq("id", p.id);
      if (!error) {
        if (updates.known_as) {
          updatedNames++;
          if (process.env.VERBOSE) console.log(`  ✓ ${p.name} → "${wd.label}"`);
        }
        if (updates.photo_url) updatedPhotos++;
      }
    }

    const done = Math.min(i + BATCH, players.length);
    process.stdout.write(`\r  Batch ${batches}: ${done}/${players.length} (${Math.round(done/players.length*100)}%) — ${updatedNames} names, ${updatedPhotos} photos updated`);
    if (i + BATCH < players.length) await sleep(DELAY_MS);
  }

  console.log(`\n\nDone.`);
  console.log(`  Updated ${updatedNames} known_as names from Wikidata (CC0)`);
  console.log(`  Updated ${updatedPhotos} photo URLs from Wikimedia Commons`);
  console.log(`  ${players.length - updatedNames} players already had correct names or no Wikidata match`);
}

main().catch((e) => { console.error(e); process.exit(1); });
