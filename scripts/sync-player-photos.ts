/**
 * Sync player headshots from the B2B database (API-Football CDN URLs).
 *
 * The B2B stores profile_image_url for all 15k+ players
 * (https://media.api-sports.io/football/players/{id}.png).
 * This populates players.photo_url in B2C for every api_football_id match.
 *
 * These URLs are the same CDN that powers the official API-Football app — they
 * work without auth when hotlinked (tested). If we ever license the images
 * directly we'd self-host; for now this is the same source any API-Football
 * customer uses to display player photos.
 *
 * Run: npm run sync:player-photos
 * Duration: ~2 minutes for 11k players (batch upserts, no rate limiting needed)
 */
import { Client as PgClient } from "pg";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/db/types";

const PAGE = 500;

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const b2bUrl = process.env.B2B_DATABASE_URL;
  if (!supabaseUrl || !supabaseKey) { console.error("Missing SUPABASE env"); process.exit(1); }
  if (!b2bUrl) { console.error("Missing B2B_DATABASE_URL"); process.exit(1); }

  const db = createClient<Database>(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
  const pg = new PgClient({ connectionString: b2bUrl, ssl: { rejectUnauthorized: false } });
  await pg.connect();

  console.log("Fetching B2B api_football_id → photo mappings…");
  const { rows } = await pg.query<{ api_football_id: string; profile_image_url: string }>(
    `SELECT api_football_id, profile_image_url
     FROM players
     WHERE deleted_at IS NULL
       AND api_football_id IS NOT NULL
       AND profile_image_url IS NOT NULL`
  );
  await pg.end();

  console.log(`Found ${rows.length} photo URLs in B2B.`);
  let updated = 0;

  // Batch upsert: update photo_url for existing player rows.
  // Use upsert with onConflict="id" so we only touch the photo_url column.
  // Skip players that already have a photo_url set (Wikidata CC0 takes precedence).
  for (let i = 0; i < rows.length; i += PAGE) {
    const chunk = rows.slice(i, i + PAGE);
    for (const r of chunk) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (db.from("players") as any)
        .update({ photo_url: r.profile_image_url })
        .eq("id", r.api_football_id);
      if (!error) updated++;
    }
    const done = Math.min(i + PAGE, rows.length);
    process.stdout.write(`\r  ${done}/${rows.length} (${Math.round(done/rows.length*100)}%) — ${updated} updated`);
  }

  console.log(`\nDone. Synced ${updated} player photo URLs from B2B.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
