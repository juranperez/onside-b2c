import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Sparkles, TrendingUp, Trophy } from "lucide-react";
import { Card, Avatar, Delta, Button, LiveDot } from "@/components/ui";
import { MoversBoard } from "@/components/discover/MoversBoard";
import { WelcomeRail } from "@/components/discover/WelcomeRail";
import { getMovers, getTopPlayers, getCounts, getMoverReasons } from "@/lib/queries";
import type { PlayerListItem } from "@/lib/queries/map";

export const revalidate = 1800;

export const metadata: Metadata = {
  title: "Discover — Onside",
  description:
    "The board moved overnight. Today's biggest movers, players you should know, and live coverage across Onside's model valuations.",
};

export default async function DiscoverPage() {
  // Build-resilient: any transient data issue degrades to an empty state, never a throw.
  let movers: PlayerListItem[] = [];
  let topPlayers: PlayerListItem[] = [];
  let counts = { players: 0, clubs: 0, leagues: 0 };
  try {
    [movers, topPlayers, counts] = await Promise.all([
      getMovers(8).catch(() => []),
      getTopPlayers(12).catch(() => []),
      getCounts().catch(() => ({ players: 0, clubs: 0, leagues: 0 })),
    ]);
  } catch (e) {
    console.error("[discover] data unavailable at render:", e);
  }

  // Why each mover is moving — real signals only (rumours, deals, injuries, WC duty).
  const reasons = await getMoverReasons(movers.map((p) => p.id)).catch(() => ({}));

  // "Players you should know" — top players, minus anyone already on the movers board.
  const moverIds = new Set(movers.slice(0, 4).map((p) => p.id));
  const known = topPlayers.filter((p) => !moverIds.has(p.id)).slice(0, 8);

  // Trending mini-list for the sidebar (top movers, no fabricated personal watchlist).
  const trending = movers.slice(0, 5);

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Morning" : hour < 17 ? "Afternoon" : "Evening";
  const dayStr = now.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-8">
      <WelcomeRail />
      {/* Hero greeting — editorial voice preserved */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <LiveDot />
          <span className="text-[11px] uppercase tracking-[0.12em] text-mute-soft num">
            {dayStr.split(",")[0]} &middot; {dayStr}
          </span>
        </div>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <h1 className="display text-[clamp(28px,4vw,40px)] tracking-[-0.03em] leading-[1.1]">
            {greeting}. <span className="font-serif italic text-acc">The board moved overnight.</span>
          </h1>
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/players">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-overlay/5 border border-line text-[12px] font-medium text-mute hover:text-fg transition">
                <TrendingUp size={13} className="text-acc" />
                <span className="num">{counts.players.toLocaleString()}</span> players tracked
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Biggest movers — client child handles the All/Up/Down toggle */}
      <MoversBoard movers={movers} reasons={reasons} />

      <div className="grid lg:grid-cols-[1fr_340px] gap-6">
        <div className="space-y-8">
          {/* Players you should know about */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-acc" />
                  <span className="text-[10px] uppercase tracking-[0.18em] text-mute-soft num">For you</span>
                </div>
                <h2 className="text-[18px] font-semibold mt-1">Players you should know about</h2>
              </div>
            </div>
            <p className="text-[12px] text-mute-soft mb-4">
              The most valuable names on the board right now.
            </p>

            {known.length === 0 ? (
              <Card className="p-10 text-center text-mute text-[13px]">
                Player coverage is loading. Check back in a moment.
              </Card>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {known.map((p) => (
                  <Link key={p.id} href={`/players/${p.slug}`}>
                    <Card className="p-4 hover:bg-ink-800 transition cursor-pointer h-full">
                      <div className="flex items-center gap-3">
                        <Avatar name={p.displayName} clubBg={p.clubBg} clubColor={p.clubColor} src={p.photoUrl} size={36} />
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-semibold truncate">{p.displayName}</div>
                          <div className="text-[11px] text-mute truncate">
                            <span className="inline-flex items-center gap-1 align-middle">
                              <span
                                className="w-3 h-3 rounded-sm grid place-items-center text-[6px] font-bold num shrink-0"
                                style={{ background: p.clubBg, color: p.clubColor }}
                              >
                                {p.clubShort.slice(0, 2)}
                              </span>
                              {p.club}
                            </span>
                            <span className="mx-1">&middot;</span>
                            {p.age}y
                            <span className="mx-1">&middot;</span>
                            {p.pos}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="num text-[13px] font-semibold">€{p.val.toFixed(1)}M</div>
                          <Delta value={p.dWeek} />
                        </div>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Coverage */}
          <Card className="p-5">
            <div className="text-[10px] uppercase tracking-[0.18em] text-mute-soft num mb-2">Coverage</div>
            <p className="text-[13px] leading-relaxed">
              <span className="num font-semibold">{counts.players.toLocaleString()}</span> players{" "}
              <span className="text-mute-soft">&middot;</span>{" "}
              <span className="num font-semibold">{counts.clubs.toLocaleString()}</span> clubs{" "}
              <span className="text-mute-soft">&middot;</span>{" "}
              <span className="num font-semibold">{counts.leagues.toLocaleString()}</span> leagues
            </p>
            <p className="text-[11px] text-mute-soft mt-1">Live model valuations, refreshed continuously.</p>
            <Link href="/players" className="block mt-3">
              <Button kind="outline" size="sm" className="w-full">Browse all players</Button>
            </Link>
          </Card>

          {/* Trending (real movers, not a fabricated watchlist) */}
          <Card className="p-5">
            <h3 className="text-[13px] font-semibold flex items-center gap-1.5 mb-3">
              <TrendingUp size={13} className="text-acc" /> Trending now
            </h3>
            {trending.length === 0 ? (
              <p className="text-[12px] text-mute-soft">No movement to report yet.</p>
            ) : (
              <div className="space-y-1">
                {trending.map((p) => (
                  <Link key={p.id} href={`/players/${p.slug}`}>
                    <div className="flex items-center gap-2 py-1.5 -mx-2 px-2 rounded hover:bg-overlay/[0.03] transition">
                      <Avatar name={p.displayName} clubBg={p.clubBg} clubColor={p.clubColor} src={p.photoUrl} size={24} />
                      <span className="text-[12px] flex-1 truncate">{p.displayName}</span>
                      <Delta value={p.dWeek} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          {/* AI Coach teaser */}
          <Card className="p-5 border-acc/20">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={14} className="text-acc" />
              <span className="text-[11px] text-acc font-semibold uppercase tracking-wider">AI Coach</span>
            </div>
            <p className="text-[13px] text-mute leading-relaxed mb-3">
              Ask anything about players, transfers, or tactics.
            </p>
            <Link href="/coach">
              <Button kind="primary" size="sm" className="w-full" icon={<ArrowRight size={12} />}>
                Open Coach
              </Button>
            </Link>
          </Card>

          {/* World Cup teaser */}
          <Card className="p-5">
            <h3 className="text-[13px] font-semibold flex items-center gap-1.5 mb-2">
              <Trophy size={13} className="text-acc" /> World Cup 2026
            </h3>
            <p className="text-[12px] text-mute leading-relaxed mb-3">
              Squads, values, and the players to watch this summer.
            </p>
            <Link href="/worldcup">
              <Button kind="outline" size="sm" className="w-full">Explore tournament</Button>
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
