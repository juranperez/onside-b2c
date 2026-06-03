import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, SectionHead, Avatar, Delta, Chip, Button } from "@/components/ui";
import { JsonLd } from "@/components/seo/json-ld";
import { getNationalTeamBySlug, type NationalTeamProfile } from "@/lib/queries";
import { nationCode, nationStyle, nationFlagSrc } from "@/components/worldcup/nation-code";

export const revalidate = 3600;

/** Squad value in millions → editorial money string (€…M, or €…B at/above a billion). */
function money(m: number): string {
  if (m >= 1000) return `€${(m / 1000).toFixed(2)}B`;
  return `€${m.toFixed(0)}M`;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const team = await getNationalTeamBySlug(id).catch(() => null);
  if (!team) return { title: "Nation — Onside" };
  return {
    title: `${team.name} — World Cup 2026 squad value ${money(team.squadValueM)}`,
    description: `${team.name}${team.confederation ? `, ${team.confederation}` : ""}. Combined Onside squad valuation ${money(
      team.squadValueM,
    )} across ${team.squad.length} called-up players for the 2026 tournament.`,
  };
}

export default async function NationalTeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const team: NationalTeamProfile | null = await getNationalTeamBySlug(id).catch(() => null);

  if (!team) {
    return (
      <div className="max-w-[1440px] mx-auto px-6 py-20 text-center">
        <h1 className="display text-[32px] mb-3">Team not found</h1>
        <p className="text-mute mb-6">We couldn&apos;t find that nation. Browse every squad at the World Cup hub instead.</p>
        <Link href="/worldcup">
          <Button kind="primary">Back to World Cup 2026</Button>
        </Link>
      </div>
    );
  }

  const style = nationStyle(team.slug);
  const squad = team.squad; // already sorted by value desc
  // Sum of the called-up players' live club valuations (millions).
  const squadSumM = squad.reduce((s, p) => s + p.val, 0);

  return (
    <div>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "SportsTeam",
          name: `${team.name} national football team`,
          sport: "Soccer",
          ...(team.confederation ? { memberOf: { "@type": "SportsOrganization", name: team.confederation } } : {}),
        }}
      />
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-line">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: `linear-gradient(135deg, ${style.bg}40 0%, transparent 60%)` }}
        />
        <div className="max-w-[1440px] mx-auto px-6 py-10 relative">
          <Link
            href="/worldcup"
            className="inline-flex items-center gap-1.5 text-[13px] text-mute hover:text-white transition mb-6"
          >
            <ArrowLeft size={14} /> World Cup 2026
          </Link>

          <div className="flex items-start justify-between gap-8 flex-wrap">
            <div className="flex items-start gap-6">
              {nationFlagSrc(team.slug) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={nationFlagSrc(team.slug)!}
                  alt={team.name}
                  width={80}
                  height={80}
                  className="w-20 h-20 rounded-full shrink-0 ring-1 ring-line/60 object-cover"
                />
              ) : (
                <div
                  className="w-20 h-20 rounded-full grid place-items-center text-[24px] font-bold num shrink-0 tracking-tight"
                  style={{ background: style.bg, color: style.color }}
                >
                  {nationCode(team.slug, team.name)}
                </div>
              )}
              <div>
                <h1 className="display text-[clamp(28px,4vw,48px)] tracking-tight leading-[1.05]">{team.name}</h1>
                <div className="flex items-center gap-3 mt-2 text-[13px] text-mute flex-wrap">
                  {team.group && <Chip tone="acc">Group {team.group}</Chip>}
                  {team.fifaRank != null && <span className="num">FIFA #{team.fifaRank}</span>}
                  {team.confederation && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-line" />
                      <span>{team.confederation}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-[10px] uppercase tracking-[0.18em] text-mute-soft mb-1">Squad valuation</div>
              <div className="display text-[52px] leading-none num">{money(team.squadValueM)}</div>
              <div className="text-[11px] text-mute-soft mt-2 num">
                {squad.length} {squad.length === 1 ? "player" : "players"} · Onside model estimate
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1440px] mx-auto px-6 py-8">
        <Card className="overflow-hidden">
          <div className="px-5 py-3.5 border-b border-line">
            <SectionHead eyebrow="Called-up players" title="The squad, by value" className="mb-0" />
          </div>

          {squad.length === 0 ? (
            <div className="p-12 text-center text-mute">No squad data yet for this nation.</div>
          ) : (
            <>
              <div className="grid grid-cols-[1.5fr_56px_50px_90px_80px] px-4 py-2.5 text-[10px] uppercase tracking-wider text-mute-soft num border-b border-line bg-ink-900">
                <span>Player</span>
                <span className="text-right">Pos</span>
                <span className="text-right">Age</span>
                <span className="text-right">Value</span>
                <span className="text-right">Week</span>
              </div>
              {squad.map((p) => (
                <Link key={p.id} href={`/players/${p.slug}`}>
                  <div className="grid grid-cols-[1.5fr_56px_50px_90px_80px] px-4 py-3 items-center hover:bg-white/[0.03] transition border-b border-line last:border-0 cursor-pointer">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar name={p.name} clubBg={p.clubBg} clubColor={p.clubColor} size={28} />
                      <div className="min-w-0">
                        <div className="text-[13px] font-medium truncate">{p.name}</div>
                        <div className="text-[11px] text-mute truncate">{p.club}</div>
                      </div>
                    </div>
                    <span className="num text-[12px] text-right text-mute">{p.pos}</span>
                    <span className="num text-[12px] text-right text-mute">{p.age || "—"}</span>
                    <span className="num text-[13px] text-right font-semibold">{money(p.val)}</span>
                    <span className="text-right">
                      <Delta value={p.dWeek} />
                    </span>
                  </div>
                </Link>
              ))}
            </>
          )}
        </Card>

        {squad.length > 0 && (
          <p className="text-[12px] text-mute mt-3">
            These {squad.length} players are valued at{" "}
            <span className="num text-white font-semibold">{money(squadSumM)}</span> at their clubs — the sum of live
            Onside valuations, a model estimate rather than a market quote.
          </p>
        )}
      </div>
    </div>
  );
}
