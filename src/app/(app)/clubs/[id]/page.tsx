import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui";
import { JsonLd } from "@/components/seo/json-ld";
import { getClubBySlug, getClubFixtures } from "@/lib/queries";
import { ClubFixtures } from "@/components/clubs/ClubFixtures";
import { getClubDeals } from "@/lib/queries/rumours";
import { SquadTable } from "@/components/clubs/SquadTable";
import { ClubDashboard } from "@/components/clubs/ClubDashboard";
import { ClubDeals } from "@/components/clubs/ClubDeals";
import { ClubWindow } from "@/components/clubs/ClubWindow";
import { ClubLeaderboard } from "@/components/clubs/ClubLeaderboard";
import { clubWindowFrom } from "@/lib/clubs/window";
import { getClubLeaderboard } from "@/lib/clubs/leaderboard";

export const revalidate = 3600;

/** Squad value in millions → editorial money string (€…M, or €…B at/above a billion). */
function money(m: number): string {
  if (m >= 1000) return `€${(m / 1000).toFixed(2)}B`;
  return `€${m}M`;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const club = await getClubBySlug(id).catch(() => null);
  if (!club) return { title: "Club — Onside" };
  return {
    title: `${club.name} — squad value ${money(club.squadValueM)}`,
    description: `${club.name}${club.league ? `, ${club.league}` : ""}. Combined Onside squad valuation ${money(
      club.squadValueM,
    )} across ${club.squad.length} players, live.`,
  };
}

export default async function ClubProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const club = await getClubBySlug(id).catch(() => null);

  if (!club) {
    return (
      <div className="max-w-[1440px] mx-auto px-6 py-20 text-center">
        <h1 className="display text-[32px] mb-3">Club not found</h1>
        <p className="text-mute mb-6">We couldn&apos;t find that club. Browse the full ranking instead.</p>
        <Link href="/clubs">
          <Button kind="primary">Browse all clubs</Button>
        </Link>
      </div>
    );
  }

  // Hero meta line — only show the parts we actually have.
  const meta = [club.league, club.stadium, club.country].filter(Boolean) as string[];

  // Every live deal touching this club, queried by club rather than filtered out of the
  // newest 60 rows site-wide — that older approach left 130 of the 159 clubs that have
  // deals showing an empty section.
  const deals = await getClubDeals(club.name, club.slug).catch(() => []);
  const [{ results, upcoming }, leaderboard] = await Promise.all([
    getClubFixtures(club.slug).catch(() => ({ results: [], upcoming: [] })),
    getClubLeaderboard(deals.map((d) => d.id)).catch(() => []),
  ]);
  // Null when there is nothing priced to measure, which is most clubs — the section is
  // then absent rather than reporting a confident €0M.
  const window = clubWindowFrom(deals, club.name);

  return (
    <div>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "SportsTeam",
          name: club.name,
          sport: "Soccer",
          ...(club.league ? { memberOf: { "@type": "SportsOrganization", name: club.league } } : {}),
        }}
      />
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-line">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: `linear-gradient(135deg, ${club.bg}40 0%, transparent 60%)` }}
        />
        <div className="max-w-[1440px] mx-auto px-6 py-10 relative">
          <Link
            href="/clubs"
            className="inline-flex items-center gap-1.5 text-[13px] text-mute hover:text-fg transition mb-6"
          >
            <ArrowLeft size={14} /> All clubs
          </Link>

          <div className="flex items-start justify-between gap-8 flex-wrap">
            <div className="flex items-start gap-6">
              <div
                className="w-20 h-20 rounded-2xl grid place-items-center text-[26px] font-bold num shrink-0"
                style={{ background: club.bg, color: club.color }}
              >
                {club.short}
              </div>
              <div>
                <h1 className="display text-[clamp(28px,4vw,48px)] tracking-tight leading-[1.05]">{club.name}</h1>
                {meta.length > 0 && (
                  <div className="flex items-center gap-3 mt-2 text-[13px] text-mute flex-wrap">
                    {meta.map((m, i) => (
                      <span key={m} className="flex items-center gap-3">
                        {i > 0 && <span className="w-1 h-1 rounded-full bg-line" />}
                        {m}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="text-right">
              <div className="text-[10px] uppercase tracking-[0.18em] text-mute-soft mb-1">Squad valuation</div>
              <div className="display text-[52px] leading-none num">{money(club.squadValueM)}</div>
              <div className="text-[11px] text-mute-soft mt-2 num">
                {club.squad.length} {club.squad.length === 1 ? "player" : "players"} &middot; Onside model estimate
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content — the club page leads with what is being argued about, not the roster. */}
      <div className="max-w-[1440px] mx-auto px-6 py-8 space-y-10">
        {deals.length > 0 && <ClubDeals deals={deals} clubName={club.name} />}
        {window && <ClubWindow w={window} clubName={club.name} />}
        {leaderboard.length > 0 && <ClubLeaderboard callers={leaderboard} clubName={club.name} />}

        <ClubDashboard squad={club.squad} />

        <ClubFixtures results={results} upcoming={upcoming} />

        {/* Demoted: the roster is reference material, not the reason to visit. */}
        <div>
          <h2 className="text-[18px] font-semibold mb-3">Full squad</h2>
          <SquadTable squad={club.squad} />
          <p className="text-[11px] text-mute-soft mt-3">
            Squad value is the sum of live Onside valuations across the roster — a model estimate, not a market quote.
          </p>
        </div>
      </div>
    </div>
  );
}
