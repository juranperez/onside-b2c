import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, SectionHead, Button, Avatar } from "@/components/ui";
import { JsonLd } from "@/components/seo/json-ld";
import { getLeagueBySlug, getLeagueStandings, getLeagueTopScorers } from "@/lib/queries";

export const revalidate = 3600;

/** €{m}M, or €{x.xx}B once value clears the billion mark. */
function leagueValue(m: number): string {
  if (m >= 1000) return `€${(m / 1000).toFixed(2)}B`;
  return `€${m}M`;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const league = await getLeagueBySlug(id).catch(() => null);
  if (!league) return { title: "League — Onside" };
  return {
    title: `${league.name} — Onside league valuation`,
    description: `${league.name}${league.country ? `, ${league.country}` : ""}. ${league.clubCount} clubs ranked by squad value, total ${leagueValue(league.totalValueM)} — live Onside model valuations.`,
  };
}

export default async function LeagueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const league = await getLeagueBySlug(id).catch(() => null);

  if (!league) {
    return (
      <div className="max-w-[1440px] mx-auto px-6 py-20 text-center">
        <h1 className="display text-[32px] mb-3">League not found</h1>
        <p className="text-mute mb-6">We couldn&apos;t find that league. Browse them all instead.</p>
        <Link href="/leagues">
          <Button kind="primary">Browse all leagues</Button>
        </Link>
      </div>
    );
  }

  const clubs = league.clubs;
  const [standings, scorers] = await Promise.all([
    getLeagueStandings(league.slug).catch(() => []),
    getLeagueTopScorers(league.slug, 10).catch(() => []),
  ]);
  // The Onside layer on a league table: where each club SHOULD sit on squad value alone.
  const valueRank = new Map(
    [...standings].sort((a, b) => (b.squadValueM ?? 0) - (a.squadValueM ?? 0)).map((r, i) => [r.clubName, i + 1]),
  );

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-8">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "SportsOrganization",
          name: league.name,
          sport: "Soccer",
          ...(league.country ? { location: { "@type": "Country", name: league.country } } : {}),
        }}
      />
      <Link href="/leagues" className="inline-flex items-center gap-1.5 text-[13px] text-mute hover:text-fg transition mb-6">
        <ArrowLeft size={14} /> All leagues
      </Link>

      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 rounded-2xl grid place-items-center text-[16px] font-bold num bg-ink-800 border border-line text-mute">
          {league.slug.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <h1 className="display text-[clamp(28px,4vw,40px)] tracking-tight">{league.name}</h1>
          <div className="text-[13px] text-mute mt-1">
            {league.country ?? "—"} &middot; <span className="num">{league.clubCount}</span> clubs
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
        <Card className="p-4">
          <div className="text-[10px] text-mute-soft uppercase tracking-wider">Total value</div>
          <div className="num display text-[28px] mt-1 text-up">{leagueValue(league.totalValueM)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-[10px] text-mute-soft uppercase tracking-wider">Clubs</div>
          <div className="num display text-[28px] mt-1">{league.clubCount}</div>
        </Card>
        <Card className="p-4">
          <div className="text-[10px] text-mute-soft uppercase tracking-wider">Country</div>
          <div className="text-[16px] font-semibold mt-1.5">{league.country ?? "—"}</div>
        </Card>
      </div>

      {standings.length > 0 && (
        <Card className="overflow-hidden mb-8">
          <div className="px-5 py-3 border-b border-line flex items-center justify-between gap-4 flex-wrap">
            <SectionHead eyebrow="2025/26 season" title="Table" />
            <div className="flex items-center gap-3 text-[11px] text-mute">
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-flex items-center rounded-full bg-up/15 text-up border border-up/30 px-1.5 py-0.5 text-[10px] font-bold num">+3</span>
                beating their budget
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-flex items-center rounded-full bg-down/10 text-down border border-down/30 px-1.5 py-0.5 text-[10px] font-bold num">−3</span>
                underdelivering
              </span>
            </div>
          </div>
          <div className="px-5 py-2 border-b border-line bg-ink-900/60 text-[11px] text-mute leading-relaxed">
            <span className="text-acc font-semibold">Budget rank</span> is Onside&apos;s twist: where each club <em>should</em> finish if squad value
            (the money) decided everything. The badge shows places gained or lost against the money — only Onside can compute it.
          </div>
          <div className="grid grid-cols-[36px_1fr_30px_30px_30px_30px_38px_42px_110px] px-4 py-2.5 text-[10px] uppercase tracking-wider text-mute-soft num border-b border-line bg-ink-900">
            <span>#</span>
            <span>Club</span>
            <span className="text-right">P</span>
            <span className="text-right">W</span>
            <span className="text-right">D</span>
            <span className="text-right">L</span>
            <span className="text-right">GD</span>
            <span className="text-right">Pts</span>
            <span className="text-right">vs budget</span>
          </div>
          {standings.map((row) => {
            const vr = valueRank.get(row.clubName);
            const delta = vr != null ? vr - row.position : null; // + = outperforming the money
            const inner = (
              <div className="grid grid-cols-[36px_1fr_30px_30px_30px_30px_38px_42px_110px] px-4 py-2.5 items-center hover:bg-overlay/[0.03] transition border-b border-line last:border-0">
                <span className="num text-[12px] text-mute">{row.position}</span>
                <span className="text-[13px] font-medium truncate">{row.clubName}</span>
                <span className="num text-[12px] text-right text-mute">{row.played ?? "—"}</span>
                <span className="num text-[12px] text-right text-mute">{row.won ?? "—"}</span>
                <span className="num text-[12px] text-right text-mute">{row.draw ?? "—"}</span>
                <span className="num text-[12px] text-right text-mute">{row.lost ?? "—"}</span>
                <span className="num text-[12px] text-right text-mute">{row.gd != null ? (row.gd > 0 ? `+${row.gd}` : row.gd) : "—"}</span>
                <span className="num text-[13px] text-right font-semibold">{row.points ?? "—"}</span>
                <span className="text-right">
                  {delta == null ? (
                    <span className="text-[11px] text-mute-soft">—</span>
                  ) : delta >= 2 ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-up/15 text-up border border-up/30 px-2 py-0.5 text-[10.5px] font-bold num" title={`Squad value says ${vr}th — finishing ${row.position}${row.position === 1 ? "st" : row.position === 2 ? "nd" : row.position === 3 ? "rd" : "th"}. ${delta} places above their budget.`}>
                      ▲ +{delta}
                    </span>
                  ) : delta <= -2 ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-down/10 text-down border border-down/30 px-2 py-0.5 text-[10.5px] font-bold num" title={`Squad value says ${vr}th — finishing ${row.position}th. ${Math.abs(delta)} places below their budget.`}>
                      ▼ −{Math.abs(delta)}
                    </span>
                  ) : (
                    <span className="text-[10.5px] text-mute-soft num" title="Finishing about where their squad value predicts.">on budget</span>
                  )}
                </span>
              </div>
            );
            return row.clubSlug ? (
              <Link key={row.clubName} href={`/clubs/${row.clubSlug}`} className="block cursor-pointer">
                {inner}
              </Link>
            ) : (
              <div key={row.clubName}>{inner}</div>
            );
          })}
        </Card>
      )}

      {scorers.length > 0 && (
        <Card className="overflow-hidden mb-8">
          <div className="px-5 py-3 border-b border-line">
            <SectionHead eyebrow="2025/26 season · Onside values alongside" title="Top scorers" />
          </div>
          {scorers.map((s, i) => (
            <Link key={s.slug} href={`/players/${s.slug}`}>
              <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-overlay/[0.03] transition border-b border-line last:border-0 cursor-pointer">
                <span className="num text-[12px] text-mute w-5">{i + 1}</span>
                <Avatar name={s.displayName} clubBg={s.clubBg} clubColor={s.clubColor} src={s.photoUrl} size={28} />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium truncate">{s.displayName}</div>
                  <div className="text-[11px] text-mute-soft truncate">{s.club}</div>
                </div>
                <span className="num text-[12px] text-mute">{s.assists}a</span>
                <span className="num text-[14px] font-bold w-9 text-right">{s.goals}g</span>
                <span className="num text-[12px] text-mute-soft w-16 text-right">€{s.valueM}M</span>
              </div>
            </Link>
          ))}
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="px-5 py-3 border-b border-line">
          <SectionHead eyebrow="Ranked by squad value" title="Clubs" />
        </div>

        {clubs.length === 0 ? (
          <div className="px-5 py-12 text-center text-mute">No clubs in this league yet.</div>
        ) : (
          <>
            <div className="grid grid-cols-[40px_1fr_110px] px-4 py-2.5 text-[10px] uppercase tracking-wider text-mute-soft num border-b border-line bg-ink-900">
              <span>#</span>
              <span>Club</span>
              <span className="text-right">Squad value</span>
            </div>
            {clubs.map((club, i) => (
              <Link key={club.slug} href={`/clubs/${club.slug}`}>
                <div className="grid grid-cols-[40px_1fr_110px] px-4 py-3 items-center hover:bg-overlay/[0.03] transition border-b border-line last:border-0 cursor-pointer">
                  <span className="num text-[12px] text-mute">{i + 1}</span>
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-7 h-7 rounded-md grid place-items-center text-[9px] font-bold num shrink-0"
                      style={{ background: club.bg, color: club.color }}
                    >
                      {club.short.slice(0, 3)}
                    </div>
                    <span className="text-[13px] font-medium truncate">{club.name}</span>
                  </div>
                  <span className="num text-[13px] text-right font-semibold">€{club.squadValueM}M</span>
                </div>
              </Link>
            ))}
          </>
        )}
      </Card>
    </div>
  );
}
