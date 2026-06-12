import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../db/types";
import { notifyFollowers } from "../rumours/notify";

/**
 * Official confirmed transfers from Sportmonks (/transfers/latest — entitled on
 * the plan, ~last week of deals). Two writes per deal:
 *  - `transfers` table: the typed system of record (club FKs where we know them).
 *  - `rumours` reflection: matching saga flips to confirmed with the real fee, the
 *    player's competing live rumours die, or a fresh confirmed row appears — so
 *    the Wire's Done Deals tab runs on official data, not scraped headlines.
 * Idempotent via `sm-transfer:{id}` markers in rumour_sources.
 */

const BASE = "https://api.sportmonks.com/v3/football";

interface SmTeamRef {
  name?: string | null;
}
interface SmTransfer {
  id: number;
  player_id: number | null;
  date: string | null;
  completed: boolean | null;
  amount: number | null;
  player?: { display_name?: string | null; name?: string | null } | null;
  fromteam?: SmTeamRef | null;
  toteam?: SmTeamRef | null;
  fromTeam?: SmTeamRef | null;
  toTeam?: SmTeamRef | null;
  type?: { name?: string | null } | null;
}

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export interface OfficialSyncResult {
  fetched: number;
  matchedPlayers: number;
  recordsUpserted: number;
  rumoursConfirmed: number;
  rumoursCreated: number;
  competingKilled: number;
  alreadySeen: number;
  truncatedWindows: number; // windows that still had pages past the cap — never let this be silent
}

export async function syncOfficialTransfers(db: SupabaseClient<Database>): Promise<OfficialSyncResult> {
  const token = process.env.SPORTMONKS_API_TOKEN;
  if (!token) throw new Error("SPORTMONKS_API_TOKEN is not set");

  // Sportmonks dates transfers by EFFECTIVE date and only flips `completed` then —
  // so a deal announced in June with a July 1 start (most of the summer window,
  // e.g. Senesi→Tottenham announced Jun 10, dated Jul 1, completed:false) is
  // invisible to a backwards completed-only query. Look 7 days back AND ~83 days
  // forward, and accept announced-but-not-yet-effective deals when they name a
  // real destination. The /between endpoint rejects ranges over ~31 days (422),
  // so the horizon is fetched in 30-day chunks. "End of loan" rows and "TBC"
  // contract-expiry placeholders are noise, never announcements.
  const day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
  const windows: [string, string][] = [
    [day(-7), day(23)],
    [day(23), day(53)],
    [day(53), day(83)],
  ];
  // July 1 alone carries hundreds of contract-turnover transfers, so a window
  // can easily run past 1,000 rows — page until the API says stop (high ceiling
  // as a runaway guard; ~90 calls worst-case vs the 3000/hr entity budget).
  const PAGE_CAP = 30;
  const byId = new Map<number, SmTransfer>();
  let truncatedWindows = 0;
  for (const [from, to] of windows) {
    let page = 1;
    for (; page <= PAGE_CAP; page++) {
      const res = await fetch(`${BASE}/transfers/between/${from}/${to}?include=player;fromTeam;toTeam;type&per_page=50&page=${page}`, {
        headers: { Authorization: token, Accept: "application/json", "User-Agent": "OnsideBot/1.0 (+https://onsidemarket.com)" },
      });
      if (!res.ok) {
        // Auth/config failures surface on the very first call; a later-window
        // hiccup must not kill the whole sync.
        if (byId.size === 0 && page === 1 && from === windows[0][0]) throw new Error(`sportmonks transfers ${res.status}`);
        break;
      }
      const body = (await res.json()) as { data?: SmTransfer[]; pagination?: { has_more?: boolean } };
      for (const t of body.data ?? []) byId.set(t.id, t);
      if (!body.pagination?.has_more) break;
    }
    if (page > PAGE_CAP) truncatedWindows++;
  }

  // Saga-precision pass: the July-1 contract-turnover wave runs to thousands of
  // rows with no reliable server-side ordering, so the window scan above is
  // best-effort breadth. Players with LIVE rumours are user-visible and must
  // flip deterministically — fetch their transfer records directly (one cheap
  // call per live saga player).
  const { data: liveRows } = await db.from("rumours").select("player_id").eq("status", "rumour");
  const liveIds = [...new Set((liveRows ?? []).map((r) => r.player_id))];
  if (liveIds.length) {
    const { data: livePlayers } = await db
      .from("players")
      .select("sportmonks_id")
      .in("id", liveIds)
      .not("sportmonks_id", "is", null);
    const lo = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
    const hi = new Date(Date.now() + 120 * 86_400_000).toISOString().slice(0, 10);
    for (const p of livePlayers ?? []) {
      const res = await fetch(`${BASE}/transfers/players/${p.sportmonks_id}?include=player;fromTeam;toTeam;type`, {
        headers: { Authorization: token, Accept: "application/json", "User-Agent": "OnsideBot/1.0 (+https://onsidemarket.com)" },
      });
      if (!res.ok) continue;
      const body = (await res.json()) as { data?: SmTransfer[] };
      // The player endpoint returns full career history — keep only the current window.
      for (const t of body.data ?? []) {
        if (t.date && t.date >= lo && t.date <= hi) byId.set(t.id, t);
      }
    }
  }

  const all = [...byId.values()];
  const transfers = all.filter((t) => {
    if (!t.player_id) return false;
    const kind = t.type?.name?.toLowerCase() ?? "";
    if (/end of loan|back from loan/.test(kind)) return false; // scheduled loan return, not a signing
    const toName = (t.toteam ?? t.toTeam)?.name ?? "";
    if (!toName || toName.toUpperCase() === "TBC") return false; // expiry placeholder
    return Boolean(t.completed) || Boolean(t.date); // completed, or announced with an effective date
  });

  const out: OfficialSyncResult = {
    fetched: all.length,
    matchedPlayers: 0,
    recordsUpserted: 0,
    rumoursConfirmed: 0,
    rumoursCreated: 0,
    competingKilled: 0,
    alreadySeen: 0,
    truncatedWindows,
  };
  if (!transfers.length) return out;

  // Idempotency markers from previous runs — chunked: one .in() with 1,500
  // values overruns PostgREST's URL limit and silently returns nothing, which
  // re-processes (and re-bumps) every old record each run.
  const markers = transfers.map((t) => `sm-transfer:${t.id}`);
  const seen = new Set<string>();
  for (let i = 0; i < markers.length; i += 100) {
    const { data: seenRows } = await db.from("rumour_sources").select("url").in("url", markers.slice(i, i + 100));
    for (const r of seenRows ?? []) seen.add(r.url);
  }

  // Our players by Sportmonks id.
  const smIds = [...new Set(transfers.map((t) => String(t.player_id)))];
  const { data: playerRows } = await db.from("players").select("id,name,known_as,sportmonks_id").in("sportmonks_id", smIds);
  const bySmId = new Map((playerRows ?? []).map((p) => [p.sportmonks_id as string, p]));

  // Club lookup for FK linkage and saga matching. Sportmonks names differ from
  // ours ("Tottenham Hotspur" vs "Tottenham", "AFC Bournemouth" vs "Bournemouth"),
  // so exact fold equality silently misses — resolve by exact fold first, then by
  // UNIQUE containment (the refresh-anchors lesson). Falls back to the raw name.
  const { data: clubRows } = await db.from("clubs").select("id,name");
  const clubByFold = new Map((clubRows ?? []).map((c) => [fold(c.name), c]));
  const resolveClub = (name: string | null): { id: string | null; display: string | null } => {
    if (!name) return { id: null, display: null };
    const f = fold(name);
    const exact = clubByFold.get(f);
    if (exact) return { id: exact.id, display: exact.name };
    const hits = (clubRows ?? []).filter((c) => {
      const cf = fold(c.name);
      return cf.length >= 5 && f.length >= 5 && (f.includes(cf) || cf.includes(f));
    });
    return hits.length === 1 ? { id: hits[0].id, display: hits[0].name } : { id: null, display: name };
  };
  const sameClub = (a: string, b: string): boolean => {
    const fa = fold(a);
    const fb = fold(b);
    if (fa === fb) return true;
    return fa.length >= 5 && fb.length >= 5 && (fa.includes(fb) || fb.includes(fa));
  };

  const now = new Date().toISOString();

  for (const t of transfers) {
    const marker = `sm-transfer:${t.id}`;
    if (seen.has(marker)) {
      out.alreadySeen++;
      continue;
    }
    const player = bySmId.get(String(t.player_id));
    if (!player) continue; // outside our covered population
    out.matchedPlayers++;

    const toResolved = resolveClub((t.toteam ?? t.toTeam)?.name ?? null);
    const fromResolved = resolveClub((t.fromteam ?? t.fromTeam)?.name ?? null);
    const toName = toResolved.display ?? "—"; // our club name when known — keeps saga merges aligned
    const fromName = fromResolved.display;
    const kind = t.type?.name?.toLowerCase() ?? "transfer";
    const isLoan = kind.includes("loan");
    const isFree = kind.includes("free");
    // 0 = free transfer (renders "Free"); null = fee unknown/undisclosed.
    const feeEur = isFree ? 0 : t.amount && t.amount > 0 ? Math.round(t.amount) : null;

    // 1) System of record.
    const { error: trErr } = await db.from("transfers").upsert(
      {
        id: `sm-${t.id}`,
        player_id: player.id,
        from_club_id: fromResolved.id,
        to_club_id: toResolved.id,
        fee: feeEur,
        date: t.date,
        type: isLoan ? "loan" : "confirmed",
        status: "confirmed",
        source: "Sportmonks",
        data_source: "sportmonks",
        fetched_at: now,
      },
      { onConflict: "id" },
    );
    if (!trErr) out.recordsUpserted++;

    // 2) Wire reflection.
    const display = player.known_as ?? player.name;
    const future = t.date && t.date > now.slice(0, 10);
    const summary = `OFFICIAL: ${display} ${isLoan ? "joins on loan" : "joins"} ${toName}${isFree ? " on a free transfer" : feeEur ? ` for €${Math.round(feeEur / 1e6)}M` : ""}${fromName ? ` from ${fromName}` : ""}${future ? `, effective ${t.date}` : ""}`;

    const { data: existing } = await db
      .from("rumours")
      .select("id,to_club,status")
      .eq("player_id", player.id);

    const match = (existing ?? []).find((r) => sameClub(r.to_club, toName));
    let rumourId: string | null = null;

    if (match) {
      const { error } = await db
        .from("rumours")
        .update({
          status: "confirmed",
          reported_fee_eur: feeEur,
          summary: summary.slice(0, 280),
          primary_source: "Official record",
          source_tier: 1,
          last_update: now,
          resolved_at: now,
        })
        .eq("id", match.id);
      if (!error) {
        out.rumoursConfirmed++;
        rumourId = match.id;
        await notifyFollowers(db, match.id, summary, { kind: "confirmed" });
      }
    } else {
      const { data: created, error } = await db
        .from("rumours")
        .insert({
          player_id: player.id,
          to_club: toName,
          reported_fee_eur: feeEur,
          status: "confirmed",
          summary: summary.slice(0, 280),
          primary_source: "Official record",
          source_tier: 1,
          corroborations: 1,
          first_seen: t.date ?? now,
          last_update: now,
          resolved_at: now,
        })
        .select("id")
        .single();
      if (!error && created) {
        out.rumoursCreated++;
        rumourId = created.id;
      }
    }

    // The deal is done — competing live rumours for this player are dead.
    const competing = (existing ?? []).filter((r) => r.status === "rumour" && !sameClub(r.to_club, toName));
    for (const c of competing) {
      const { error } = await db.from("rumours").update({ status: "dead", last_update: now, resolved_at: now }).eq("id", c.id);
      if (!error) {
        out.competingKilled++;
        await notifyFollowers(db, c.id, `Saga over — ${display} joined ${toName} instead`, { kind: "dead" });
      }
    }

    if (rumourId) {
      await db.from("rumour_sources").upsert(
        { url: marker, rumour_id: rumourId, source: "Sportmonks official", tier: 1 },
        { onConflict: "url", ignoreDuplicates: true },
      );
    }
  }

  return out;
}
