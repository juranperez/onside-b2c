import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, Chip } from "@/components/ui";
import { readDb } from "@/lib/db/server";

// Match centre v1 (build #5 foundation): our stored fixture row + Sportmonks
// detail (events, lineups) fetched server-side. 5-minute revalidate now; the
// live in-play cadence upgrades this page when club seasons restart in August.
export const revalidate = 300;

interface SmEvent {
  minute: number | null;
  player_name?: string | null;
  participant_id?: number | null;
  result?: string | null;
  type?: { name?: string | null } | null;
}
interface SmLineupRow {
  player_name?: string | null;
  jersey_number?: number | null;
  team_id?: number | null;
  type_id?: number | null; // 11 = starting XI, 12 = bench
}
interface SmDetail {
  events: SmEvent[];
  lineups: SmLineupRow[];
  homeSmId: number | null;
  awaySmId: number | null;
}

async function fetchDetail(smId: number): Promise<SmDetail | null> {
  const token = process.env.SPORTMONKS_API_TOKEN;
  if (!token) return null;
  try {
    const r = await fetch(
      `https://api.sportmonks.com/v3/football/fixtures/${smId}?include=events.type;events.player;lineups.player;participants`,
      { headers: { Authorization: token, Accept: "application/json" }, next: { revalidate: 300 } },
    );
    if (!r.ok) return null;
    const j = (await r.json()) as {
      data?: {
        events?: SmEvent[];
        lineups?: SmLineupRow[];
        participants?: Array<{ id: number; meta?: { location?: string | null } | null }>;
      };
    };
    const home = j.data?.participants?.find((p) => p.meta?.location === "home")?.id ?? null;
    const away = j.data?.participants?.find((p) => p.meta?.location === "away")?.id ?? null;
    return { events: j.data?.events ?? [], lineups: j.data?.lineups ?? [], homeSmId: home, awaySmId: away };
  } catch {
    return null;
  }
}

async function getFixture(id: string) {
  const { data } = await readDb()
    .from("club_fixtures")
    .select("id,kickoff,status,round,home_name,away_name,score_home,score_away,sm_id, leagues(name,slug)")
    .eq("id", id)
    .maybeSingle();
  return data;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const f = await getFixture(id).catch(() => null);
  if (!f) return { title: "Match — Onside" };
  const score = f.status === "finished" && f.score_home != null ? ` ${f.score_home}–${f.score_away}` : "";
  return {
    title: `${f.home_name}${score ? score : " vs"} ${f.away_name} — Onside match centre`,
    description: `${f.home_name} vs ${f.away_name}${f.round ? `, round ${f.round}` : ""} — score, events and lineups on Onside.`,
  };
}

const EVENT_ICON: Record<string, string> = {
  Goal: "⚽",
  "Own Goal": "⚽",
  Penalty: "⚽",
  "Missed Penalty": "✗",
  Substitution: "⇄",
  Yellowcard: "▮",
  Redcard: "▮",
};

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const f = await getFixture(id).catch(() => null);

  if (!f) {
    return (
      <div className="max-w-[760px] mx-auto px-6 py-20 text-center">
        <h1 className="display text-[28px] mb-3">Match not found</h1>
        <Link href="/clubs" className="text-acc text-[13px] hover:underline">
          Browse clubs
        </Link>
      </div>
    );
  }

  const league = f.leagues as unknown as { name: string; slug: string } | null;
  const detail = f.sm_id && f.status !== "scheduled" ? await fetchDetail(f.sm_id) : null;
  const goalsAndCards = (detail?.events ?? [])
    .filter((e) => e.type?.name && ["Goal", "Own Goal", "Penalty", "Missed Penalty", "Substitution", "Yellowcard", "Redcard"].includes(e.type.name))
    .sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0));
  const xiFor = (teamSmId: number | null) => (detail?.lineups ?? []).filter((l) => l.type_id === 11 && l.team_id === teamSmId).slice(0, 11);
  const homeXi = xiFor(detail?.homeSmId ?? null);
  const awayXi = xiFor(detail?.awaySmId ?? null);

  const kickoff = f.kickoff
    ? new Date(f.kickoff).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) + " UTC"
    : "TBD";

  return (
    <div className="max-w-[860px] mx-auto px-4 md:px-6 py-8">
      {league && (
        <Link href={`/leagues/${league.slug}`} className="inline-flex items-center gap-1.5 text-[13px] text-mute hover:text-fg transition mb-6">
          <ArrowLeft size={14} /> {league.name}
        </Link>
      )}

      <Card className="p-6 md:p-8 mb-5 text-center">
        <div className="text-[11px] text-mute-soft uppercase tracking-wider num mb-3">
          {f.round ? `Round ${f.round} · ` : ""}
          {kickoff}
        </div>
        <div className="flex items-center justify-center gap-4 md:gap-8">
          <div className="flex-1 text-right text-[16px] md:text-[20px] font-bold tracking-tight">{f.home_name}</div>
          <div className="shrink-0">
            {f.score_home != null && f.score_away != null ? (
              <span className="display num text-[34px] md:text-[44px] tracking-tight">
                {f.score_home}–{f.score_away}
              </span>
            ) : (
              <span className="display num text-[24px] text-mute-soft">vs</span>
            )}
          </div>
          <div className="flex-1 text-left text-[16px] md:text-[20px] font-bold tracking-tight">{f.away_name}</div>
        </div>
        <div className="mt-3">
          <Chip tone={f.status === "live" ? "acc" : f.status === "finished" ? "neutral" : "solid"} className="uppercase">
            {f.status}
          </Chip>
        </div>
      </Card>

      {goalsAndCards.length > 0 && (
        <Card className="overflow-hidden mb-5">
          <div className="px-5 py-3 border-b border-line text-[11px] uppercase tracking-wider text-mute-soft num">Key events</div>
          {goalsAndCards.map((e, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-2 border-b border-line last:border-0 text-[13px]">
              <span className="num text-mute w-9 shrink-0">{e.minute ?? "—"}&apos;</span>
              <span
                className={cn(
                  "w-5 text-center shrink-0",
                  e.type?.name === "Yellowcard" ? "text-acc" : e.type?.name === "Redcard" ? "text-down" : "text-fg",
                )}
              >
                {EVENT_ICON[e.type?.name ?? ""] ?? "·"}
              </span>
              <span className="flex-1 truncate">
                {e.player_name ?? "—"}
                <span className="text-mute-soft ml-2 text-[11px]">{e.type?.name}</span>
              </span>
              {e.result && <span className="num text-[12px] text-mute shrink-0">{e.result}</span>}
            </div>
          ))}
        </Card>
      )}

      {(homeXi.length > 0 || awayXi.length > 0) && (
        <Card className="overflow-hidden">
          <div className="px-5 py-3 border-b border-line text-[11px] uppercase tracking-wider text-mute-soft num">Starting XIs</div>
          <div className="grid grid-cols-2">
            {[
              { name: f.home_name, xi: homeXi, border: "border-r border-line" },
              { name: f.away_name, xi: awayXi, border: "" },
            ].map((side) => (
              <div key={side.name} className={side.border}>
                <div className="px-4 py-2 text-[12px] font-semibold border-b border-line bg-ink-900 truncate">{side.name}</div>
                {side.xi.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 px-4 py-1.5 text-[12.5px] border-b border-line/50 last:border-0">
                    <span className="num text-mute-soft w-6 shrink-0">{p.jersey_number ?? "—"}</span>
                    <span className="truncate">{p.player_name ?? "—"}</span>
                  </div>
                ))}
                {side.xi.length === 0 && <div className="px-4 py-3 text-[12px] text-mute-soft">Lineup not available</div>}
              </div>
            ))}
          </div>
        </Card>
      )}

      <p className="text-[10.5px] text-mute-soft mt-5 text-center">Match data via licensed feeds · live in-play coverage arrives with the new club season.</p>
    </div>
  );
}
