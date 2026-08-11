/**
 * Identity crosswalk: B2C players.id (= API-Football id) → players.sportmonks_id.
 *
 * Source: the `reep` register (github.com/withqwerty/reep, CC0 public domain),
 * ~488k people mapping 30+ provider IDs onto a stable id. It carries both
 * `key_api_football` and `key_sportmonks`, so the join is a direct lookup.
 * The tail (players reep doesn't carry) is resolved later by Sportmonks name+DOB
 * search in the provider sync — this script just lands the high-confidence bulk.
 *
 * Run: npm run crosswalk:sportmonks
 * reep CSV (~66MB) is cached in .reep/ (gitignored) so re-runs are instant.
 */
import { createReadStream, existsSync, mkdirSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { createInterface } from "node:readline";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/db/types";

const REEP_URL = "https://raw.githubusercontent.com/withqwerty/reep/main/data/people.csv";
const CACHE_DIR = ".reep";
const CACHE_FILE = `${CACHE_DIR}/people.csv`;

// RFC-4180-ish single-line CSV parser (handles quoted fields + escaped quotes).
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; } else inQ = false;
      } else cur += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

async function ensureReep(): Promise<void> {
  if (existsSync(CACHE_FILE)) { console.log("reep cache present, skipping download."); return; }
  mkdirSync(CACHE_DIR, { recursive: true });
  console.log("Downloading reep people.csv (~66MB, CC0)…");
  const res = await fetch(REEP_URL);
  if (!res.ok) throw new Error(`reep download HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(CACHE_FILE, buf);
  console.log(`Saved ${(buf.length / 1e6).toFixed(0)}MB to ${CACHE_FILE}.`);
}

async function main() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing SUPABASE env");
    process.exit(1);
  }
  await ensureReep();

  // Stream reep → map: api_football_id → { sportmonks id, dob, name }
  const rl = createInterface({ input: createReadStream(CACHE_FILE), crlfDelay: Infinity });
  let idx: Record<string, number> | null = null;
  const reep = new Map<string, { sm: string; dob: string; name: string }>();
  for await (const line of rl) {
    if (!idx) {
      idx = {};
      parseCsvLine(line).forEach((c, i) => { idx![c.trim()] = i; });
      for (const need of ["key_api_football", "key_sportmonks", "date_of_birth", "name", "type"]) {
        if (idx[need] === undefined) throw new Error(`reep is missing expected column: ${need}`);
      }
      continue;
    }
    // cheap pre-filter: must reference api-football + sportmonks to be useful
    if (!line.includes(",")) continue;
    const f = parseCsvLine(line);
    if (f[idx.type] !== "player") continue;
    const af = f[idx.key_api_football]?.trim();
    const sm = f[idx.key_sportmonks]?.trim();
    if (!af || !sm) continue;
    reep.set(af, { sm, dob: f[idx.date_of_birth]?.trim() ?? "", name: f[idx.name]?.trim() ?? "" });
  }
  console.log(`reep: ${reep.size} players carry BOTH api_football + sportmonks ids.\n`);

  // Pull all B2C players, match against reep
  const db = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  type Row = { id: string; dob: string | null; sportmonks_id: string | null };
  const updates: { id: string; sm: string }[] = [];
  let scanned = 0, alreadySet = 0, noReep = 0, dobMismatch = 0;

  let from = 0;
  const PAGE = 1000;
  for (;;) {
    const { data, error } = await db.from("players").select("id,dob,sportmonks_id").range(from, from + PAGE - 1);
    if (error) { console.error(error.message); break; }
    if (!data || !data.length) break;
    for (const p of data as Row[]) {
      scanned++;
      if (p.sportmonks_id) { alreadySet++; continue; }
      const hit = reep.get(p.id);
      if (!hit) { noReep++; continue; }
      // DOB cross-check (informational): both present + different → flag but still trust reep's verified map
      if (p.dob && hit.dob && p.dob.slice(0, 10) !== hit.dob.slice(0, 10)) dobMismatch++;
      updates.push({ id: p.id, sm: hit.sm });
    }
    if (data.length < PAGE) break;
    from += PAGE;
  }

  console.log(`B2C: scanned ${scanned} · already set ${alreadySet} · reep-matched ${updates.length} · not in reep ${noReep} · dob-mismatch (still written) ${dobMismatch}\n`);

  // Write in parallel batches
  const now = new Date().toISOString();
  let written = 0;
  const BATCH = 100;
  for (let i = 0; i < updates.length; i += BATCH) {
    const chunk = updates.slice(i, i + BATCH);
    await Promise.all(chunk.map(async (u) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (db.from("players") as any).update({ sportmonks_id: u.sm }).eq("id", u.id);
      if (!error) written++;
    }));
    process.stdout.write(`\r  writing ${Math.min(i + BATCH, updates.length)}/${updates.length} (${written} ok)`);
  }
  console.log(`\n\nDone. Wrote sportmonks_id for ${written} players via reep.`);
  console.log(`Tail (${noReep} not in reep) resolves by Sportmonks name+DOB search during the provider sync.`);
  console.log(`Note: sportmonks_synced_at stays null until the actual stats sync runs (this only sets the id link).`);
}

main().catch((e) => { console.error(e); process.exit(1); });
