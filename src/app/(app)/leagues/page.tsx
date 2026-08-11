import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Trophy } from "lucide-react";
import { Card, Button } from "@/components/ui";
import { getLeagues, type LeagueSummary } from "@/lib/queries";
import { monogram } from "@/lib/club-style";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Leagues — Onside",
  description:
    "The Big 5 and beyond. Every league ranked by total squad market value, with Onside's live model valuations.",
};

/** €{m}M, or €{x.xx}B once a league clears the billion mark. */
function leagueValue(m: number): string {
  if (m >= 1000) return `€${(m / 1000).toFixed(2)}B`;
  return `€${m}M`;
}

export default async function LeaguesPage() {
  let leagues: LeagueSummary[] = [];
  try {
    leagues = await getLeagues();
  } catch (e) {
    // Never let a transient data issue crash the build/page — degrade to empty state.
    console.error("[leagues] data unavailable at render:", e);
  }

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-8">
      <div className="mb-7">
        <div className="text-[11px] uppercase tracking-[0.18em] text-mute-soft mb-2 num">Leagues</div>
        <h1 className="display text-[clamp(28px,4vw,40px)] leading-[1] tracking-[-0.04em]">
          The Big <span className="num">5</span>.{" "}
          <span className="font-serif italic text-acc">And beyond.</span>
        </h1>
      </div>

      <Link href="/worldcup" className="block mb-6 group">
        <Card className="p-4 flex items-center gap-4 hover:border-mute transition">
          <div className="w-10 h-10 rounded-full bg-acc/15 text-acc grid place-items-center shrink-0">
            <Trophy size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-semibold group-hover:text-acc transition">World Cup 2026</div>
            <div className="text-[12px] text-mute truncate">
              48 national squads, valued live — groups, bracket and the full schedule
            </div>
          </div>
          <ArrowRight size={15} className="text-mute-soft group-hover:text-acc transition shrink-0" />
        </Card>
      </Link>

      {leagues.length === 0 ? (
        <Card className="p-12 text-center text-mute">No leagues available yet.</Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {leagues.map((league) => (
            <Link key={league.slug} href={`/leagues/${league.slug}`}>
              <Card className="p-6 hover:bg-ink-800 transition cursor-pointer h-full">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-xl grid place-items-center text-[13px] font-bold num bg-ink-800 border border-line text-mute">
                    {monogram(league.name)}
                  </div>
                  <div>
                    <div className="text-[16px] font-semibold leading-tight">{league.name}</div>
                    <div className="text-[12px] text-mute">{league.country ?? "—"}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <div className="num display text-[28px] leading-none text-up">{leagueValue(league.totalValueM)}</div>
                    <div className="text-[10px] text-mute-soft mt-1">Total market value</div>
                  </div>
                  <div>
                    <div className="num display text-[28px] leading-none">{league.clubCount}</div>
                    <div className="text-[10px] text-mute-soft mt-1">Clubs</div>
                  </div>
                </div>

                <Button kind="ghost" size="sm" className="w-full mt-1" icon={<ArrowRight size={12} />}>
                  View league
                </Button>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
