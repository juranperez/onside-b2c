/**
 * Sportmonks sync — fills player_stats.xg + players.detailed_pos from real data.
 *
 * Fixture-driven (xG is per-fixture, not season): for each league season's finished
 * fixtures, aggregate each player's xG + minutes across appearances, capture their
 * detailed position, match to a B2C player (sportmonks_id seed → name+DOB), then write:
 *   player_stats.xg        ← season-total real xG (xa stays null — no true xA in plan)
 *   players.detailed_pos   ← canonical position (LW/RW/CB/... — fixes the filter bug)
 *   players.sportmonks_id  ← backfilled when matched by name+DOB
 *   players.sportmonks_synced_at
 *
 * Usage:
 *   npm run sync:sportmonks -- --league premier-league --limit 25   # fast proof
 *   npm run sync:sportmonks                                          # all 14 leagues
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/db/types";
import { SPORTMONKS_BASE, SPORTMONKS_LEAGUE, STAT, canonicalPosition, fold } from "../src/lib/ingest/sportmonks";

const TOKEN = process.env.SPORTMONKS_API_TOKEN;

const args = process.argv.slice(2);
const argVal = (k: string) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : undefined; };
const ONLY_LEAGUE = argVal("league");
const FIXTURE_LIMIT = argVal("limit") ? parseInt(argVal("limit")!, 10) : Infinity;
// Sportmonks rate limit is 3000/hour per entity → ~1.2s/call sustained. Default safe;
// override with --delay 40 for small samples.
const DELAY = argVal("delay") ? parseInt(argVal("delay")!, 10) : 1200;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function sm<T = unknown>(path: string): Promise<T> {
  const url = `${SPORTMONKS_BASE}${path}${path.includes("?") ? "&" : "?"}api_token=${TOKEN}`;
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, { headers: { "user-agent": "OnsideBot/1.0" } });
    if (res.status === 429) { await sleep(2000 * (attempt + 1)); continue; }
    if (!res.ok) throw new Error(`Sportmonks ${res.status} on ${path.split("?")[0]}`);
    return (await res.json()) as T;
  }
  throw new Error(`Sportmonks rate-limited repeatedly on ${path}`);
}

interface Agg { xg: number; mins: number; pos: Map<number, number>; apps: number }

async function main() {
  if (!TOKEN) { console.error("Missing SPORTMONKS_API_TOKEN in .env.local"); process.exit(1); }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) { console.error("Missing SUPABASE env"); process.exit(1); }
  const db = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  // --- Build B2C match index -------------------------------------------------
  console.log("Loading B2C players for matching…");
  const bySm = new Map<string, string>();
  const byNameDob = new Map<string, string>();
  const byName = new Map<string, string[]>();
  const b2cToSm = new Map<string, string>(); // b2c id → sportmonks id (for write-back)
  let from = 0;
  for (;;) {
    const { data } = await db.from("players").select("id,name,known_as,dob,sportmonks_id").range(from, from + 999);
    if (!data?.length) break;
    for (const p of data as { id: string; name: string; known_as: string | null; dob: string | null; sportmonks_id: string | null }[]) {
      if (p.sportmonks_id) bySm.set(p.sportmonks_id, p.id);
      const dob = p.dob?.slice(0, 10) ?? "";
      for (const nm of new Set([fold(p.name), p.known_as ? fold(p.known_as) : ""].filter(Boolean))) {
        (byName.get(nm) ?? byName.set(nm, []).get(nm)!).push(p.id);
        if (dob) byNameDob.set(`${nm}|${dob}`, p.id);
      }
    }
    if (data.length < 1000) break;
    from += 1000;
  }
  console.log(`  ${bySm.size} pre-linked sportmonks_ids, ${byName.size} name keys.\n`);

  const matchPlayer = (smId: number, name: string, dob: string | null): string | null => {
    let r: string | null = bySm.get(String(smId)) ?? null;
    if (!r) {
      const nm = fold(name);
      const d = dob?.slice(0, 10);
      if (d) r = byNameDob.get(`${nm}|${d}`) ?? null;
      if (!r) { const cands = byName.get(nm); if (cands && cands.length === 1) r = cands[0]; }
      if (r) bySm.set(String(smId), r);
    }
    if (r) b2cToSm.set(r, String(smId));
    return r;
  };

  // --- Walk leagues ----------------------------------------------------------
  const leagues = ONLY_LEAGUE ? [ONLY_LEAGUE] : Object.keys(SPORTMONKS_LEAGUE);
  const agg = new Map<string, Agg>();
  let totalFixtures = 0, totalLineupPlayers = 0, matched = 0, unmatched = 0;

  for (const slug of leagues) {
    const leagueId = SPORTMONKS_LEAGUE[slug];
    if (!leagueId) { console.warn(`  no Sportmonks id for ${slug}, skipping`); continue; }
    // current season
    const lg = await sm<{ data: { currentseason?: { id: number }; current_season_id?: number } }>(`/leagues/${leagueId}?include=currentSeason`);
    const seasonId = lg.data.currentseason?.id ?? lg.data.current_season_id;
    if (!seasonId) { console.warn(`  no current season for ${slug}`); continue; }
    const seasonRes = await sm<{ data: { fixtures?: { id: number; state_id: number }[] } }>(`/seasons/${seasonId}?include=fixtures`);
    const finished = (seasonRes.data.fixtures ?? []).filter((f) => f.state_id === 5);
    const take = finished.slice(0, Math.min(finished.length, FIXTURE_LIMIT === Infinity ? finished.length : FIXTURE_LIMIT));
    console.log(`${slug} (SM league ${leagueId}, season ${seasonId}): ${finished.length} finished fixtures, processing ${take.length}`);

    for (let i = 0; i < take.length; i++) {
      const fx = take[i];
      let detail;
      try {
        detail = await sm<{ data: { lineups?: LineupPlayer[] } }>(`/fixtures/${fx.id}?include=lineups.details.type;lineups.player`);
      } catch (e) { console.warn(`   fixture ${fx.id}: ${(e as Error).message}`); continue; }
      totalFixtures++;
      for (const lp of detail.data.lineups ?? []) {
        totalLineupPlayers++;
        const b2c = matchPlayer(lp.player_id, lp.player_name ?? lp.player?.name ?? "", lp.player?.date_of_birth ?? null);
        if (!b2c) { unmatched++; continue; }
        matched++;
        const a = agg.get(b2c) ?? { xg: 0, mins: 0, pos: new Map(), apps: 0 };
        const detailMap = new Map((lp.details ?? []).map((d) => [d.type_id, d.data?.value]));
        const xg = Number(detailMap.get(STAT.XG) ?? 0);
        const mins = Number(detailMap.get(STAT.MINUTES) ?? 0);
        a.xg += isFinite(xg) ? xg : 0;
        a.mins += isFinite(mins) ? mins : 0;
        if (mins > 0) a.apps += 1;
        const pid = lp.player?.detailed_position_id ?? lp.detailed_position_id ?? lp.position_id;
        if (pid != null) a.pos.set(pid, (a.pos.get(pid) ?? 0) + 1);
        agg.set(b2c, a);
      }
      if (i % 25 === 24) process.stdout.write(`\r   ${i + 1}/${take.length} fixtures…`);
      await sleep(DELAY); // stay under 3000/hr (per-entity)
    }
    process.stdout.write("\n");
  }

  console.log(`\nProcessed ${totalFixtures} fixtures, ${totalLineupPlayers} lineup slots → matched ${matched}, unmatched ${unmatched}, distinct players ${agg.size}.\n`);

  // --- Write -----------------------------------------------------------------
  const now = new Date().toISOString();
  let wroteXg = 0, wrotePos = 0;
  const entries = [...agg.entries()];
  for (let i = 0; i < entries.length; i += 80) {
    const chunk = entries.slice(i, i + 80);
    await Promise.all(chunk.map(async ([b2cId, a]) => {
      // dominant detailed position
      let bestPos: number | null = null, bestN = -1;
      for (const [pid, n] of a.pos) if (n > bestN) { bestN = n; bestPos = pid; }
      const { detailed } = canonicalPosition(bestPos, null);
      const xgRounded = Math.round(a.xg * 100) / 100;

      // player_stats.xg (B2C has one row per player — current season)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: sErr, count } = await (db.from("player_stats") as any).update({ xg: xgRounded }, { count: "exact" }).eq("player_id", b2cId);
      if (!sErr && (count ?? 0) > 0) wroteXg++;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const upd: any = { sportmonks_id: b2cToSm.get(b2cId) ?? null, sportmonks_synced_at: now };
      if (detailed) { upd.detailed_pos = detailed; wrotePos++; }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (db.from("players") as any).update(upd).eq("id", b2cId);
    }));
    process.stdout.write(`\r  writing ${Math.min(i + 80, entries.length)}/${entries.length}`);
  }
  console.log(`\n\nDone. xG written: ${wroteXg}, detailed_pos written: ${wrotePos}.`);
  console.log(`xa left null (no true Expected Assists in this Sportmonks plan — honest, no floor-as-data).`);
}

interface LineupPlayer {
  player_id: number;
  player_name?: string;
  position_id?: number | null;
  detailed_position_id?: number | null;
  player?: { name?: string; date_of_birth?: string | null; detailed_position_id?: number | null; position_id?: number | null };
  details?: { type_id: number; data?: { value?: number } }[];
}

main().catch((e) => { console.error(e); process.exit(1); });
