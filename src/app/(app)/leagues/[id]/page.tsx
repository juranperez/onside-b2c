import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, SectionHead, Button } from "@/components/ui";
import { JsonLd } from "@/components/seo/json-ld";
import { getLeagueBySlug } from "@/lib/queries";

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
