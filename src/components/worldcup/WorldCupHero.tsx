import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button, LiveDot } from "@/components/ui";
import { cn } from "@/lib/utils";
import { getWcFixtures, getNationalTeams, type WcFixture, type NationalTeamSummary } from "@/lib/queries";
import { todaysFixtures } from "@/lib/wc-day";
import { nationCode } from "./nation-code";
import { CodeTile } from "./CodeTile";

const ET = "America/New_York";
const fmtTime = (iso: string) =>
  new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: ET }).format(new Date(iso));

/** €{m}M, or €{x.xx}B once past a billion (same convention as the WC hub). */
function money(m: number): string {
  if (m >= 1000) return `€${(m / 1000).toFixed(2)}B`;
  return `€${m.toFixed(0)}M`;
}

/** Tournament-window homepage hero: today's matches + the market angle. */
export async function WorldCupHero() {
  const [fixtures, nations] = await Promise.all([
    getWcFixtures().catch(() => [] as WcFixture[]),
    getNationalTeams().catch(() => [] as NationalTeamSummary[]),
  ]);

  const today = todaysFixtures(fixtures, new Date()).slice(0, 6);
  const topSquads = [...nations].sort((a, b) => b.squadValueM - a.squadValueM).slice(0, 5);
  const totalValueM = nations.reduce((s, n) => s + n.squadValueM, 0);

  return (
    <section className="relative overflow-hidden border-b border-line noise">
      <div className="absolute inset-0 grid-bg opacity-60 pointer-events-none" />
      <div className="max-w-[1440px] mx-auto px-6 pt-14 pb-12 relative">
        <div className="flex items-center gap-3 mb-8">
          <LiveDot />
          <span className="text-[11.5px] text-mute">
            World Cup 2026 &middot; 48 nations &middot; <span className="num">{money(totalValueM)}</span> in talent
          </span>
        </div>

        <div className="grid lg:grid-cols-[1.2fr_1fr] gap-12 items-start">
          <div>
            <h1 className="display tracking-[-0.045em] text-[clamp(44px,6vw,72px)] leading-[0.94]">
              The World Cup,
              <br />
              <span className="font-serif italic text-acc">valued live.</span>
            </h1>
            <p className="mt-5 text-mute text-[16px] max-w-[520px] leading-relaxed">
              Every squad priced by the Onside engine — match forecasts before kickoff, market movers after the
              whistle, and the tournament&rsquo;s real talent table.
            </p>
            <div className="mt-8 flex items-center gap-3 flex-wrap">
              <Link href="/worldcup">
                <Button kind="primary" size="lg" icon={<ArrowRight size={15} />}>
                  Enter the World Cup hub
                </Button>
              </Link>
              <Link href="/login">
                <Button kind="outline" size="lg">Create free account</Button>
              </Link>
            </div>
            {topSquads.length > 0 && (
              <div className="mt-9 flex items-center gap-5 flex-wrap">
                {topSquads.map((n) => (
                  <Link key={n.slug} href={`/worldcup/teams/${n.slug}`} className="flex items-center gap-2 group">
                    <CodeTile slug={n.slug} name={n.name} size={28} />
                    <span className="num text-[12px] text-mute group-hover:text-fg transition">
                      {money(n.squadValueM)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-line bg-ink-850/60 p-4">
            <div className="text-[10px] uppercase tracking-[0.18em] text-mute-soft num mb-3">
              Today&rsquo;s matches
            </div>
            {today.length === 0 ? (
              <p className="text-[13px] text-mute py-4">
                No matches today — the board never sleeps.{" "}
                <Link href="/worldcup/schedule" className="text-acc hover:underline">
                  Full schedule
                </Link>
              </p>
            ) : (
              <div className="space-y-1">
                {today.map((f) => (
                  <Link
                    key={f.id}
                    href={`/matches/${f.id}`}
                    className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-overlay/5 transition"
                  >
                    <CodeTile slug={f.home.slug} name={f.home.name} size={24} />
                    <span className="text-[13px] font-medium flex-1 truncate">
                      {nationCode(f.home.slug, f.home.name)} v {nationCode(f.away.slug, f.away.name)}
                    </span>
                    <CodeTile slug={f.away.slug} name={f.away.name} size={24} />
                    <span className={cn("num text-[12px] w-14 text-right", f.status === "live" ? "text-fg font-medium" : "text-mute")}>
                      {f.status === "scheduled" && f.kickoff ? fmtTime(f.kickoff) : `${f.scoreHome ?? 0}–${f.scoreAway ?? 0}`}
                    </span>
                    {f.status === "live" && <span className="w-1.5 h-1.5 rounded-full bg-acc pulse-dot shrink-0" />}
                  </Link>
                ))}
              </div>
            )}
            <Link
              href="/worldcup/schedule"
              className="mt-3 flex items-center gap-1 text-[12px] text-acc hover:underline"
            >
              All fixtures &amp; kickoff times <ArrowRight size={11} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
