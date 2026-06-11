import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, Chip } from "@/components/ui";
import { readDb } from "@/lib/db/server";
import { getWcFixtures, type WcFixture } from "@/lib/queries";
import { nationFlagSrc, nationCode } from "@/components/worldcup/nation-code";

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

async function getWcMatch(id: string): Promise<WcFixture | null> {
  if (!id.startsWith("wc2026-")) return null;
  const all = await getWcFixtures().catch(() => [] as WcFixture[]);
  return all.find((f) => f.id === id) ?? null;
}

function WcTeam({ slug, name, align }: { slug: string; name: string; align: "left" | "right" }) {
  const src = nationFlagSrc(slug);
  return (
    <Link
      href={`/worldcup/teams/${slug}`}
      className={cn("flex-1 flex items-center gap-3 group", align === "right" ? "justify-end" : "justify-start", align === "right" ? "flex-row" : "flex-row-reverse")}
    >
      <span className={cn("text-[16px] md:text-[20px] font-bold tracking-tight group-hover:text-acc transition", align === "right" ? "text-right" : "text-left")}>
        {name}
      </span>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} width={34} height={34} className="rounded-full ring-1 ring-line/60 shrink-0" style={{ width: 34, height: 34 }} />
      ) : (
        <span className="num text-[12px] text-mute-soft">{nationCode(slug, name)}</span>
      )}
    </Link>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const wc = await getWcMatch(id);
  if (wc) {
    const score = wc.status !== "scheduled" && wc.scoreHome != null ? ` ${wc.scoreHome}–${wc.scoreAway}` : " vs";
    return {
      title: `${wc.home.name}${score} ${wc.away.name} — World Cup 2026 | Onside`,
      description: `${wc.home.name} v ${wc.away.name}${wc.group ? `, Group ${wc.group}` : ""} — score, kickoff and the Onside Forecast.`,
    };
  }
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

  // World Cup fixtures get their own layout: nations, group context, the Onside Forecast.
  const wc = await getWcMatch(id);
  if (wc) {
    const kickoff = wc.kickoff
      ? new Date(wc.kickoff).toLocaleString("en-US", { weekday: "long", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York" }) + " ET"
      : "TBD";
    return (
      <div className="max-w-[760px] mx-auto px-4 md:px-6 py-8">
        <Link href="/worldcup/schedule" className="inline-flex items-center gap-1.5 text-[13px] text-mute hover:text-fg transition mb-6">
          <ArrowLeft size={14} /> World Cup schedule
        </Link>

        <Card className="p-6 md:p-8 mb-5">
          <div className="text-center text-[11px] text-mute uppercase tracking-wider num mb-5">
            {wc.group ? `Group ${wc.group} · ` : ""}
            {wc.round?.replace("Group Stage - ", "Matchday ") ?? "World Cup 2026"} · {kickoff}
          </div>
          <div className="flex items-center justify-center gap-4 md:gap-6">
            <WcTeam slug={wc.home.slug} name={wc.home.name} align="right" />
            <div className="shrink-0 px-2">
              {wc.scoreHome != null && wc.scoreAway != null && wc.status !== "scheduled" ? (
                <span className={cn("display num text-[38px] md:text-[48px] tracking-tight", wc.status === "live" && "text-up")}>
                  {wc.scoreHome}–{wc.scoreAway}
                </span>
              ) : (
                <span className="display num text-[24px] text-mute-soft">vs</span>
              )}
            </div>
            <WcTeam slug={wc.away.slug} name={wc.away.name} align="left" />
          </div>
          <div className="mt-4 text-center">
            <Chip tone={wc.status === "live" ? "acc" : wc.status === "finished" ? "neutral" : "solid"} className="uppercase">
              {wc.status === "scheduled" ? "upcoming" : wc.status}
            </Chip>
            {wc.venue && (
              <div className="text-[12px] text-mute mt-3">
                {wc.venue}
                {wc.city ? ` · ${wc.city}` : ""}
              </div>
            )}
          </div>
        </Card>

        {wc.forecast && (
          <Card className="p-6">
            <div className="flex items-center gap-1.5 mb-1 text-[10px] uppercase tracking-[0.14em] font-bold num text-acc">
              <span className="w-1.5 h-1.5 rounded-full bg-acc" /> Onside Forecast
            </div>
            <p className="text-[12px] text-mute mb-4 leading-relaxed">
              Win probability from our squad-value model, anchored by FIFA rank — entertainment, not betting advice.
            </p>
            <div className="grid grid-cols-3 text-center mb-2">
              <div>
                <div className="display num text-[26px]">{wc.forecast.home}%</div>
                <div className="text-[11px] text-mute">{wc.home.name}</div>
              </div>
              <div>
                <div className="display num text-[26px] text-mute">{wc.forecast.draw}%</div>
                <div className="text-[11px] text-mute-soft">Draw</div>
              </div>
              <div>
                <div className="display num text-[26px]">{wc.forecast.away}%</div>
                <div className="text-[11px] text-mute">{wc.away.name}</div>
              </div>
            </div>
            <div className="flex h-2.5 rounded-full overflow-hidden bg-ink-700">
              <div style={{ width: `${wc.forecast.home}%` }} className="bg-acc" />
              <div style={{ width: `${wc.forecast.draw}%` }} className="bg-ink-600" />
              <div style={{ width: `${wc.forecast.away}%` }} className="bg-fg/70" />
            </div>
          </Card>
        )}
      </div>
    );
  }

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
