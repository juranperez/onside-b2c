import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../db/types";

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
}

export async function syncOfficialTransfers(db: SupabaseClient<Database>): Promise<OfficialSyncResult> {
  const token = process.env.SPORTMONKS_API_TOKEN;
  if (!token) throw new Error("SPORTMONKS_API_TOKEN is not set");

  // /transfers/latest is dominated by future-dated "end of loan" placeholders;
  // the COMPLETED deals live on the date-range endpoint. Daily cron + 7-day
  // window = self-healing overlap.
  const to = new Date().toISOString().slice(0, 10);
  const from = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
  const all: SmTransfer[] = [];
  for (let page = 1; page <= 4; page++) {
    const res = await fetch(`${BASE}/transfers/between/${from}/${to}?include=player;fromTeam;toTeam;type&per_page=50&page=${page}`, {
      headers: { Authorization: token, Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`sportmonks transfers ${res.status}`);
    const body = (await res.json()) as { data?: SmTransfer[]; pagination?: { has_more?: boolean } };
    all.push(...(body.data ?? []));
    if (!body.pagination?.has_more) break;
  }
  const transfers = all.filter((t) => t.completed && t.player_id);

  const out: OfficialSyncResult = {
    fetched: all.length,
    matchedPlayers: 0,
    recordsUpserted: 0,
    rumoursConfirmed: 0,
    rumoursCreated: 0,
    competingKilled: 0,
    alreadySeen: 0,
  };
  if (!transfers.length) return out;

  // Idempotency markers from previous runs.
  const markers = transfers.map((t) => `sm-transfer:${t.id}`);
  const { data: seenRows } = await db.from("rumour_sources").select("url").in("url", markers);
  const seen = new Set((seenRows ?? []).map((r) => r.url));

  // Our players by Sportmonks id.
  const smIds = [...new Set(transfers.map((t) => String(t.player_id)))];
  const { data: playerRows } = await db.from("players").select("id,name,known_as,sportmonks_id").in("sportmonks_id", smIds);
  const bySmId = new Map((playerRows ?? []).map((p) => [p.sportmonks_id as string, p]));

  // Club lookup by folded name for FK linkage (best-effort — text name is the fallback).
  const { data: clubRows } = await db.from("clubs").select("id,name");
  const clubByFold = new Map((clubRows ?? []).map((c) => [fold(c.name), c.id]));

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

    const toName = (t.toteam ?? t.toTeam)?.name ?? "—";
    const fromName = (t.fromteam ?? t.fromTeam)?.name ?? null;
    const kind = t.type?.name?.toLowerCase() ?? "transfer";
    const isLoan = kind.includes("loan");
    const feeEur = t.amount && t.amount > 0 ? Math.round(t.amount) : null;

    // 1) System of record.
    const { error: trErr } = await db.from("transfers").upsert(
      {
        id: `sm-${t.id}`,
        player_id: player.id,
        from_club_id: fromName ? (clubByFold.get(fold(fromName)) ?? null) : null,
        to_club_id: toName !== "—" ? (clubByFold.get(fold(toName)) ?? null) : null,
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
    const summary = `OFFICIAL: ${display} ${isLoan ? "joins on loan" : "joins"} ${toName}${feeEur ? ` for €${Math.round(feeEur / 1e6)}M` : ""}${fromName ? ` from ${fromName}` : ""}`;

    const { data: existing } = await db
      .from("rumours")
      .select("id,to_club,status")
      .eq("player_id", player.id);

    const match = (existing ?? []).find((r) => fold(r.to_club) === fold(toName));
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
    const competing = (existing ?? []).filter((r) => r.status === "rumour" && fold(r.to_club) !== fold(toName));
    for (const c of competing) {
      const { error } = await db.from("rumours").update({ status: "dead", last_update: now, resolved_at: now }).eq("id", c.id);
      if (!error) out.competingKilled++;
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
