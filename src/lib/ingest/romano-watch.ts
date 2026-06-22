import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";
import { fetchRomanoPosts } from "./bluesky";
import { isHereWeGo, breakText } from "./here-we-go";
import { decideRomanoBreak, type SagaStatus } from "./romano-break";
import { matchPlayer, matchDestClub, buildPlayerIndex, buildClubIndex } from "./match";
import { loadAllPlayers } from "./rumour-ingest";
import { notifyFollowers } from "@/lib/rumours/notify";
import { sendBreakAlert } from "@/lib/rumours/admin-alert";

export interface RomanoWatchResult {
  scanned: number;
  published: number;
  upgraded: number;
  held: number;
  retracted: number;
  skipped: number;
}

/** The Wire summary line for a break. Pure. */
export function breakSummary(club: string, postText: string): string {
  return `Here We Go — ${club}. ${postText}`;
}

/**
 * One watch pass: fetch Romano's recent posts (via the X-mirror), act on any NEW
 * "Here We Go" not already ingested (idempotent on the Bluesky post URI stored in
 * rumour_sources), and auto-retract a recently-published break whose source post
 * has vanished. Never throws — the cron stays green.
 */
export async function watchRomano(db: SupabaseClient<Database>): Promise<RomanoWatchResult> {
  const res: RomanoWatchResult = { scanned: 0, published: 0, upgraded: 0, held: 0, retracted: 0, skipped: 0 };
  let posts;
  try {
    posts = await fetchRomanoPosts(undefined, 25); // wide window so recent breaks stay visible for auto-retract
  } catch {
    return res;
  }
  res.scanned = posts.length;
  const uris = posts.map((p) => p.uri);

  // Idempotency: which post URIs have we already ingested? Check BOTH
  // rumour_sources.url AND rumours.url (tier 0) — so a partial write (rumours
  // insert succeeded but the rumour_sources upsert blipped) can't produce a
  // duplicate saga on the next pass.
  const [{ data: seenSrc }, { data: seenRum }] = await Promise.all([
    db.from("rumour_sources").select("url").in("url", uris),
    db.from("rumours").select("url").eq("source_tier", 0).in("url", uris),
  ]);
  const seen = new Set([...(seenSrc ?? []), ...(seenRum ?? [])].map((r) => r.url).filter(Boolean));

  // Auto-retract: a LIVE tier-0 break whose source post VANISHED → dead. Only
  // RECENT breaks (last_update < 15 min) — an older break's URI naturally falls
  // off the fetch window without being deleted; retracting those is a false positive.
  const liveUris = new Set(uris);
  const cutoff = new Date(Date.now() - 15 * 60_000).toISOString();
  const { data: liveBreaks } = await db
    .from("rumours").select("id,url,last_update").eq("source_tier", 0).eq("status", "rumour").gte("last_update", cutoff);
  for (const b of liveBreaks ?? []) {
    if (b.url && b.url.startsWith("at://") && !liveUris.has(b.url)) {
      await db.from("rumours").update({ status: "dead", last_update: new Date().toISOString() }).eq("id", b.id);
      res.retracted++;
    }
  }

  // Build the match indexes once (reuse the helpers ingestRumours uses).
  const players = await loadAllPlayers(db);
  const pIdx = buildPlayerIndex(players);
  const { data: clubRows } = await db.from("clubs").select("id,name,name_norm,short_name");
  const cIdx = buildClubIndex((clubRows ?? []) as { id: string; name: string; name_norm: string | null; short_name: string | null }[]);
  const nameById = new Map(players.map((p) => [p.id, p.known_as || p.name_norm || p.id] as const));
  // Exclude the player's current (selling) club from destination matching. A Here
  // We Go always names the seller too ("€55m fee to PSV", "from Benfica", "Lyon
  // receive €32m"); with nothing excluded that second club makes matchDestClub
  // ambiguous and it collapses to "—", stranding the break in the review queue.
  // Mirrors ingestRumours, which already passes the seller via currentClub.
  const clubByPlayerId = new Map(players.map((p) => [p.id, p.clubs?.name ?? null]));

  for (const post of posts) {
    if (seen.has(post.uri)) { res.skipped++; continue; }
    if (!isHereWeGo(post)) { res.skipped++; continue; }
    const text = breakText(post);
    const pm = matchPlayer(text, pIdx);
    const club = matchDestClub(text, cIdx, pm ? clubByPlayerId.get(pm.playerId) ?? null : null) ?? "—";
    const existing = pm
      ? (((await db.from("rumours").select("id,status,to_club").eq("player_id", pm.playerId)).data ?? []) as { id: string; status: SagaStatus; to_club: string }[])
      : [];
    const decision = decideRomanoBreak({
      playerId: pm?.playerId ?? null,
      toClub: club,
      strength: pm?.strength ?? null,
      existingForPlayer: existing,
    });
    const now = new Date().toISOString();
    const summary = breakSummary(club, post.text).slice(0, 280);
    const pName = pm ? (nameById.get(pm.playerId) ?? "player") : "player";

    if (decision.kind === "publish-break" && pm) {
      const { data: ins } = await db.from("rumours").insert({
        player_id: pm.playerId, to_club: club, summary,
        primary_source: "Fabrizio Romano", source_tier: 0, status: "rumour",
        corroborations: 1, url: post.uri, first_seen: now, last_update: now,
      }).select("id").single();
      if (ins) {
        await db.from("rumour_sources").upsert(
          { url: post.uri, rumour_id: ins.id, source: "Fabrizio Romano", tier: 0 },
          { onConflict: "url", ignoreDuplicates: true },
        );
        await sendBreakAlert({ player: pName, club, rumourId: ins.id });
        res.published++;
      }
    } else if (decision.kind === "upgrade-break" && pm) {
      // status: "rumour" PROMOTES a candidate to live — a Romano break that
      // cleared the strong clean-parse gate is auto-publish-eligible, so it must
      // not stay stuck in the review queue (off the Wire) after the upgrade.
      await db.from("rumours").update({
        source_tier: 0, primary_source: "Fabrizio Romano", to_club: club, summary, url: post.uri, last_update: now, status: "rumour",
      }).eq("id", decision.targetId);
      await db.from("rumour_sources").upsert(
        { url: post.uri, rumour_id: decision.targetId, source: "Fabrizio Romano", tier: 0 },
        { onConflict: "url", ignoreDuplicates: true },
      );
      await notifyFollowers(db, decision.targetId, summary, { kind: "here_we_go" });
      await sendBreakAlert({ player: pName, club, rumourId: decision.targetId });
      res.upgraded++;
    } else if (decision.kind === "hold" && pm) {
      // A real player but an ambiguous/unstrong parse → BREAKING review candidate + alert.
      const { data: ins } = await db.from("rumours").insert({
        player_id: pm.playerId, to_club: club, summary,
        primary_source: "Fabrizio Romano", source_tier: 0, status: "candidate",
        corroborations: 1, url: post.uri, first_seen: now, last_update: now,
      }).select("id").single();
      if (ins) {
        await db.from("rumour_sources").upsert(
          { url: post.uri, rumour_id: ins.id, source: "Fabrizio Romano", tier: 0 },
          { onConflict: "url", ignoreDuplicates: true },
        );
        await sendBreakAlert({ player: pName, club: club === "—" ? "club TBC" : club, rumourId: ins.id });
        res.held++;
      }
    } else {
      res.skipped++; // hold with no player at all, or skip
    }
  }
  return res;
}
