import type { Metadata } from "next";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { fmtVal, fmtDelta } from "@/lib/format";
import { Card, Avatar, Delta, Chip, SectionHead, Button } from "@/components/ui";
import { JsonLd } from "@/components/seo/json-ld";
import { WatchButton } from "@/components/players/WatchButton";
import { getPlayerBySlug, getSimilarPlayers } from "@/lib/queries";

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const p = await getPlayerBySlug(id).catch(() => null);
  if (!p) return { title: "Player — Onside" };
  return {
    title: `${p.name} — Onside valuation ${fmtVal(p.value)}`,
    description: `${p.name}${p.club ? `, ${p.club.name}` : ""}. Live Onside valuation ${fmtVal(p.value)} with confidence band and 12-month history.`,
  };
}

export default async function PlayerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const player = await getPlayerBySlug(id).catch(() => null);

  if (!player) {
    return (
      <div className="max-w-[1440px] mx-auto px-6 py-20 text-center">
        <h1 className="display text-[32px] mb-3">Player not found</h1>
        <p className="text-mute mb-6">We couldn&apos;t find that player. Browse the full directory instead.</p>
        <Link href="/players">
          <Button kind="primary">Browse all players</Button>
        </Link>
      </div>
    );
  }

  const similar = await getSimilarPlayers(player).catch(() => []);
  const maxV = Math.max(...player.series.map((s) => s.v), 1);
  const minV = Math.min(...player.series.map((s) => s.v), 0);
  const range = maxV - minV || 1;

  return (
    <div>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Person",
          name: player.name,
          jobTitle: "Footballer",
          ...(player.nationality ? { nationality: player.nationality } : {}),
          ...(player.club ? { affiliation: { "@type": "SportsTeam", name: player.club.name } } : {}),
          description: `${player.name}${player.club ? `, ${player.club.name}` : ""}. Onside valuation ${fmtVal(player.value)}.`,
        }}
      />
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-line">
        <div className="absolute inset-0 pointer-events-none" style={{ background: `linear-gradient(135deg, ${player.clubBg}40 0%, transparent 60%)` }} />
        <div className="max-w-[1440px] mx-auto px-6 py-10 relative">
          <div className="flex items-start justify-between gap-8 flex-wrap">
            <div className="flex items-start gap-6">
              <Avatar name={player.name} clubBg={player.clubBg} clubColor={player.clubColor} size={80} ring />
              <div>
                <div className="flex items-center gap-2 mb-1 text-[12px] text-mute">
                  {player.nationality && <span>{player.nationality}</span>}
                  <span className="text-mute-soft">&middot;</span>
                  <span>{player.position}</span>
                  {player.shirtNo ? (
                    <>
                      <span className="text-mute-soft">&middot;</span>
                      <span className="num">#{player.shirtNo}</span>
                    </>
                  ) : null}
                </div>
                <h1 className="display text-[clamp(28px,4vw,48px)] tracking-tight leading-[1.05]">
                  {player.firstName && <span className="font-serif italic font-normal">{player.firstName}</span>}{" "}
                  {player.lastName}
                </h1>
                {player.club && (
                  <Link href={`/clubs/${player.club.slug}`} className="flex items-center gap-2 mt-2 text-[13px] text-mute hover:text-white transition w-fit">
                    <div className="w-5 h-5 rounded-[4px] grid place-items-center text-[8px] font-bold num" style={{ background: player.clubBg, color: player.clubColor }}>
                      {player.clubShort.slice(0, 2)}
                    </div>
                    {player.club.name}
                    {player.league && <> &middot; {player.league.name}</>}
                  </Link>
                )}
              </div>
            </div>

            <div className="text-right">
              <div className="text-[10px] uppercase tracking-[0.18em] text-mute-soft mb-1">Onside Valuation</div>
              <div className="display text-[52px] leading-none num">{fmtVal(player.value)}</div>
              <div className="mt-2 flex items-center justify-end gap-3">
                <Delta value={Math.round((player.dWeek / 1e6) * 10) / 10} big />
                <span className="text-mute text-[11px]">this week</span>
              </div>
              <div className="text-[11px] text-mute-soft mt-1 num">
                {player.confidence}% confidence &middot; {fmtVal(player.bandLow)}–{fmtVal(player.bandHigh)}
              </div>
              <div className="mt-4 flex items-center gap-2 justify-end">
                <WatchButton playerId={player.id} />
                <Button kind="ghost" size="sm">Share</Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1440px] mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-[1fr_340px] gap-6">
          <div className="space-y-6">
            {/* Valuation chart */}
            <Card className="p-6">
              <SectionHead eyebrow="12-month history" title="Valuation trajectory" />
              <div className="h-[200px] flex items-end gap-1 mt-2">
                {player.series.map((point, i) => {
                  const height = ((point.v - minV) / range) * 160 + 24;
                  const isLast = i === player.series.length - 1;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <span className={cn("num text-[9px]", isLast ? "text-up font-semibold" : "text-mute-soft")}>{point.v.toFixed(0)}</span>
                      <div className={cn("w-full rounded-t-sm", isLast ? "bg-up" : "bg-ink-700")} style={{ height }} />
                      <span className="num text-[8px] text-mute-soft">{point.label}</span>
                    </div>
                  );
                })}
              </div>
              <p className="text-[11px] text-mute-soft mt-3">
                Onside model estimate. Values are derived from the methodology, not a market quote.
              </p>
            </Card>

            {/* Pillar breakdown */}
            {player.pillars.length > 0 && (
              <Card className="p-6">
                <SectionHead eyebrow="What drives the value" title="Valuation pillars" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                  {player.pillars.map((attr) => (
                    <div key={attr.label} className="flex items-center gap-3">
                      <span className="text-[12px] text-mute w-24">{attr.label}</span>
                      <div className="flex-1 h-2 bg-ink-700 rounded-full overflow-hidden">
                        <div className={cn("h-full rounded-full", attr.value >= 75 ? "bg-up" : attr.value >= 50 ? "bg-acc" : "bg-mute")} style={{ width: `${attr.value}%` }} />
                      </div>
                      <span className="num text-[12px] font-semibold w-8 text-right">{attr.value}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Similar players */}
            {similar.length > 0 && (
              <Card className="p-6">
                <SectionHead eyebrow="Comparable value + position" title="Similar players" />
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
                  {similar.map((p) => (
                    <Link key={p.id} href={`/players/${p.slug}`} className="rounded-xl bg-ink-800 hover:bg-ink-750 transition border border-line p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Avatar name={p.name} clubBg={p.clubBg} clubColor={p.clubColor} size={28} />
                        <div className="min-w-0">
                          <div className="text-[12px] font-semibold truncate">{p.name}</div>
                          <div className="text-[10px] text-mute truncate">{p.club}</div>
                        </div>
                      </div>
                      <div className="num text-[14px] font-semibold">{fmtVal(p.val * 1e6)}</div>
                    </Link>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <Card className="p-5">
              <h3 className="text-[13px] font-semibold mb-3">Key facts</h3>
              <div className="space-y-2.5 text-[12px]">
                {[
                  ["Age", player.age != null ? `${player.age} years` : "—"],
                  ["Position", player.position],
                  ["Foot", player.foot ?? "—"],
                  ["Height", player.heightCm ? `${player.heightCm} cm` : "—"],
                  ["Nationality", player.nationality ?? "—"],
                  ["Confidence", `${player.confidence}%`],
                  ["Value range", `${fmtVal(player.bandLow)}–${fmtVal(player.bandHigh)}`],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-3">
                    <span className="text-mute">{label}</span>
                    <span className="num font-medium text-right">{value}</span>
                  </div>
                ))}
              </div>
            </Card>

            {player.stats && (
              <Card className="p-5">
                <h3 className="text-[13px] font-semibold mb-3 flex items-center justify-between">
                  Season {player.stats.season}/{(player.stats.season + 1) % 100}
                  {player.stats.rating ? <span className="num text-up">{player.stats.rating.toFixed(2)}</span> : null}
                </h3>
                <div className="grid grid-cols-2 gap-3 text-center">
                  {[
                    ["Apps", player.stats.apps],
                    ["Minutes", player.stats.minutes.toLocaleString()],
                    ["Goals", player.stats.goals],
                    ["Assists", player.stats.assists],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl bg-ink-800 border border-line py-3">
                      <div className="num text-[20px] font-semibold">{value}</div>
                      <div className="text-[10px] text-mute-soft uppercase tracking-wider mt-1">{label}</div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <Card className="p-5">
              <h3 className="text-[13px] font-semibold mb-2">Compare</h3>
              <Link href="/compare">
                <Button kind="ghost" size="sm" className="w-full">Compare with another player</Button>
              </Link>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
