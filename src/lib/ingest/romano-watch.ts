import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";
import { fetchAuthorPosts, type BskyPost } from "./bluesky";
import { breakText } from "./here-we-go";
import { decideRomanoBreak, type SagaStatus } from "./romano-break";
import { matchPlayer, matchDestClub, buildPlayerIndex, buildClubIndex } from "./match";
import { loadAllPlayers } from "./rumour-ingest";
import { extractFeeEur, isFreeTransfer } from "./fee";
import { JOURNALISTS, isTransferBreak, tierForBreak, type Journalist } from "./journalists";
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

/**
 * The Wire summary line for a break.
 *
 * Deliberately carries NO borrowed catchphrase: Onside attributes breaks by the
 * reporter's name and keeps its own voice for its own language. The destination
 * already lives in the structured `to_club` field, so the reporter's own words
 * stand on their own. Pure.
 */
export function breakSummary(_club: string, postText: string): string {
  return postText.trim();
}

/** Entity indexes, built once and shared across every journalist in a pass. */
interface MatchContext {
  pIdx: ReturnType<typeof buildPlayerIndex>;
  cIdx: ReturnType<typeof buildClubIndex>;
  nameById: Map<string, string>;
  clubByPlayerId: Map<string, string | null>;
}

/**
 * One watch pass across every tracked journalist: fetch recent posts, act on any
 * NEW transfer break not already ingested (idempotent on the Bluesky post URI),
 * and auto-retract a recently-published break whose source post has vanished.
 * Never throws — the cron stays green.
 */
export async function watchBreaks(db: SupabaseClient<Database>): Promise<RomanoWatchResult> {
  const res: RomanoWatchResult = { scanned: 0, published: 0, upgraded: 0, held: 0, retracted: 0, skipped: 0 };

  // Build the match indexes ONCE — they are the expensive part of a pass and are
  // identical for every journalist.
  const players = await loadAllPlayers(db);
  const { data: clubRows } = await db.from("clubs").select("id,name,name_norm,short_name");
  const ctx: MatchContext = {
    pIdx: buildPlayerIndex(players),
    cIdx: buildClubIndex((clubRows ?? []) as { id: string; name: string; name_norm: string | null; short_name: string | null }[]),
    nameById: new Map(players.map((p) => [p.id, p.known_as || p.name_norm || p.id] as const)),
    // Exclude the player's current (selling) club from destination matching. A break
    // always names the seller too ("€55m fee to PSV", "from Benfica"); with nothing
    // excluded that second club makes matchDestClub ambiguous and it collapses to
    // "—", stranding the break in the review queue.
    clubByPlayerId: new Map(players.map((p) => [p.id, p.clubs?.name ?? null])),
  };

  for (const j of JOURNALISTS) {
    try {
      await watchJournalist(db, j, ctx, res);
    } catch {
      // One reporter's feed failing must not take the others down.
    }
  }
  return res;
}

async function watchJournalist(
  db: SupabaseClient<Database>,
  j: Journalist,
  ctx: MatchContext,
  res: RomanoWatchResult,
): Promise<void> {
  let posts: BskyPost[];
  try {
    posts = await fetchAuthorPosts(j.handle, 25); // wide window so recent breaks stay visible for auto-retract
  } catch {
    return;
  }
  res.scanned += posts.length;
  const uris = posts.map((p) => p.uri);
  if (!uris.length) return;

  // Idempotency: which post URIs have we already ingested? Check BOTH
  // rumour_sources.url AND rumours.url — so a partial write (rumours insert
  // succeeded but the rumour_sources upsert blipped) can't produce a duplicate
  // saga on the next pass.
  const [{ data: seenSrc }, { data: seenRum }] = await Promise.all([
    db.from("rumour_sources").select("url").in("url", uris),
    db.from("rumours").select("url").in("url", uris),
  ]);
  const seen = new Set([...(seenSrc ?? []), ...(seenRum ?? [])].map((r) => r.url).filter(Boolean));

  // Auto-retract: a LIVE break whose source post VANISHED → dead. Only RECENT ones
  // (last_update < 15 min) — an older break's URI naturally falls off the fetch
  // window without being deleted, and retracting those is a false positive. The
  // at:// guard keeps this scoped to posts from these lanes.
  const liveUris = new Set(uris);
  const cutoff = new Date(Date.now() - 15 * 60_000).toISOString();
  const { data: liveBreaks } = await db
    .from("rumours")
    .select("id,url,last_update")
    .eq("primary_source", j.name)
    .eq("status", "rumour")
    .gte("last_update", cutoff);
  for (const b of liveBreaks ?? []) {
    if (b.url && b.url.startsWith("at://") && !liveUris.has(b.url)) {
      await db.from("rumours").update({ status: "dead", last_update: new Date().toISOString() }).eq("id", b.id);
      res.retracted++;
    }
  }

  for (const post of posts) {
    if (seen.has(post.uri)) {
      res.skipped++;
      continue;
    }
    // These feeds also carry injuries, contract renewals and general club news —
    // none of which belong on a transfer Wire.
    if (!isTransferBreak(post)) {
      res.skipped++;
      continue;
    }

    const tier = tierForBreak(j, post);
    const text = breakText(post);
    const pm = matchPlayer(text, ctx.pIdx);
    const club = matchDestClub(text, ctx.cIdx, pm ? ctx.clubByPlayerId.get(pm.playerId) ?? null : null) ?? "—";
    const existing = pm
      ? (((await db.from("rumours").select("id,status,to_club").eq("player_id", pm.playerId)).data ?? []) as {
          id: string;
          status: SagaStatus;
          to_club: string;
        }[])
      : [];
    const decision = decideRomanoBreak({
      playerId: pm?.playerId ?? null,
      toClub: club,
      strength: pm?.strength ?? null,
      existingForPlayer: existing,
    });
    const now = new Date().toISOString();
    const summary = breakSummary(club, post.text).slice(0, 280);
    const pName = pm ? (ctx.nameById.get(pm.playerId) ?? "player") : "player";

    // Breaks routinely carry the fee ("€25m release clause", "£40m club record").
    // Without this the whole break lane stored a null fee, which silently stripped
    // the fee-vs-value verdict — our core differentiator — from every break.
    const breakFee = isFreeTransfer(post.text) ? 0 : extractFeeEur(post.text);

    if (decision.kind === "publish-break" && pm) {
      const { data: ins } = await db
        .from("rumours")
        .insert({
          player_id: pm.playerId, to_club: club, summary, reported_fee_eur: breakFee,
          primary_source: j.name, source_tier: tier, status: "rumour",
          corroborations: 1, url: post.uri, first_seen: now, last_update: now,
        })
        .select("id")
        .single();
      if (ins) {
        await db.from("rumour_sources").upsert(
          { url: post.uri, rumour_id: ins.id, source: j.name, tier },
          { onConflict: "url", ignoreDuplicates: true },
        );
        await sendBreakAlert({ player: pName, club, rumourId: ins.id, source: j.name });
        res.published++;
      }
    } else if (decision.kind === "upgrade-break" && pm) {
      // status: "rumour" PROMOTES a candidate to live — a break that cleared the
      // strong clean-parse gate is auto-publish-eligible, so it must not stay stuck
      // in the review queue (off the Wire) after the upgrade.
      await db
        .from("rumours")
        .update({
          source_tier: tier, primary_source: j.name, to_club: club, summary, url: post.uri,
          last_update: now, status: "rumour",
          // Only when the break actually names a fee — never clobber a known fee with null.
          ...(breakFee != null ? { reported_fee_eur: breakFee } : {}),
        })
        .eq("id", decision.targetId);
      await db.from("rumour_sources").upsert(
        { url: post.uri, rumour_id: decision.targetId, source: j.name, tier },
        { onConflict: "url", ignoreDuplicates: true },
      );
      await notifyFollowers(db, decision.targetId, summary, { kind: "here_we_go" });
      await sendBreakAlert({ player: pName, club, rumourId: decision.targetId, source: j.name });
      res.upgraded++;
    } else if (decision.kind === "hold" && pm) {
      // A real player but an ambiguous/unstrong parse → review candidate + alert.
      const { data: ins } = await db
        .from("rumours")
        .insert({
          player_id: pm.playerId, to_club: club, summary, reported_fee_eur: breakFee,
          primary_source: j.name, source_tier: tier, status: "candidate",
          corroborations: 1, url: post.uri, first_seen: now, last_update: now,
        })
        .select("id")
        .single();
      if (ins) {
        await db.from("rumour_sources").upsert(
          { url: post.uri, rumour_id: ins.id, source: j.name, tier },
          { onConflict: "url", ignoreDuplicates: true },
        );
        await sendBreakAlert({ player: pName, club: club === "—" ? "club TBC" : club, rumourId: ins.id, source: j.name }, "held");
        res.held++;
      }
    } else {
      res.skipped++; // hold with no player at all, or skip
    }
  }
}
