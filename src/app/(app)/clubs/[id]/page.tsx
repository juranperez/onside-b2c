import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui";
import { JsonLd } from "@/components/seo/json-ld";
import { getClubBySlug } from "@/lib/queries";
import { SquadTable } from "@/components/clubs/SquadTable";

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
            className="inline-flex items-center gap-1.5 text-[13px] text-mute hover:text-white transition mb-6"
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

      {/* Content */}
      <div className="max-w-[1440px] mx-auto px-6 py-8">
        <SquadTable squad={club.squad} />
        <p className="text-[11px] text-mute-soft mt-3">
          Squad value is the sum of live Onside valuations across the roster — a model estimate, not a market quote.
        </p>
      </div>
    </div>
  );
}
