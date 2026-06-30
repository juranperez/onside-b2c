import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Globe, Calendar, Trophy } from "lucide-react";
import { Button, Card, SectionHead, LiveDot, Chip } from "@/components/ui";
import { getNationalTeams, getWcFixtures, getWatchPlayers, getWcBracket, type NationalTeamSummary, type WcFixture } from "@/lib/queries";
import { matchdaySlate } from "@/lib/wc-day";
import { MatchdaySlate } from "@/components/worldcup/MatchdaySlate";
import { BracketView } from "@/components/worldcup/Bracket";
import { cn } from "@/lib/utils";
import { CodeTile } from "@/components/worldcup/CodeTile";
import { GoalAlertsPrompt } from "@/components/push/GoalAlertsPrompt";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "World Cup 2026 — squad values, live | Onside",
  description:
    "Every nation at the 2026 tournament, valued by the Onside engine. 48 squads ranked by combined value, the group of death, and projected knockouts.",
};

/** Squad value in millions → editorial money string (€…M, or €…B at/above a billion). */
function money(m: number): string {
  if (m >= 1000) return `€${(m / 1000).toFixed(2)}B`;
  return `€${m.toFixed(0)}M`;
}

export default async function WorldCupPage() {
  let nations: NationalTeamSummary[] = [];
  try {
    nations = await getNationalTeams();
  } catch (e) {
    // A transient data issue must never crash the build/page — degrade to empty state.
    console.error("[worldcup] data unavailable at render:", e);
  }

  const totalValueM = nations.reduce((s, n) => s + n.squadValueM, 0);
  const top10 = nations.slice(0, 10); // already sorted by squad value desc

  // Group of Death — group letter with the highest combined squad value.
  const byGroup = new Map<string, NationalTeamSummary[]>();
  for (const n of nations) {
    if (!n.group) continue;
    const arr = byGroup.get(n.group) ?? [];
    arr.push(n);
    byGroup.set(n.group, arr);
  }
  const groupTotals = [...byGroup.entries()]
    .map(([letter, teams]) => ({
      letter,
      teams: [...teams].sort((a, b) => b.squadValueM - a.squadValueM),
      total: teams.reduce((s, t) => s + t.squadValueM, 0),
    }))
    .sort((a, b) => b.total - a.total);
  const groupOfDeath = groupTotals[0] ?? null;

  let fixtures: WcFixture[] = [];
  try {
    fixtures = await getWcFixtures();
  } catch (e) {
    console.error("[worldcup] fixtures unavailable:", e);
  }
  const bracket = await getWcBracket().catch(() => null);
  const slate = matchdaySlate(fixtures, new Date());
  const slateSlugs = [...new Set(slate.fixtures.flatMap((f) => [f.home.slug, f.away.slug]).filter(Boolean))];
  const watch = slateSlugs.length ? await getWatchPlayers(slateSlugs).catch(() => ({})) : {};

  // Empty state — never throw, give the reader somewhere to go.
  if (nations.length === 0) {
    return (
      <div className="max-w-[1440px] mx-auto px-6 py-20 text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Trophy size={16} className="text-acc" />
          <span className="text-[11px] uppercase tracking-[0.18em] text-acc num font-semibold">World Cup 2026</span>
        </div>
        <h1 className="display text-[32px] mb-3">Squad values are loading</h1>
        <p className="text-mute mb-6">
          Nation valuations aren&apos;t available right now. Explore the rest of the market in the meantime.
        </p>
        <Link href="/clubs">
          <Button kind="primary">Browse club squads</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-8">
      <GoalAlertsPrompt />
      {/* Knockout bracket — the hero, now the cup is in the knockouts */}
      <div className="mb-10">
        <div className="flex items-end justify-between mb-5 flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Trophy size={15} className="text-acc" />
              <span className="text-[11px] uppercase tracking-[0.18em] text-acc num font-semibold">World Cup 2026 · Knockouts</span>
            </div>
            <h1 className="display text-[clamp(28px,4.5vw,46px)] tracking-tight leading-[1.02]">
              The bracket, <span className="font-serif italic text-acc">valued live.</span>
            </h1>
            <p className="text-mute text-[14px] mt-2 max-w-[500px]">
              Every tie priced by the Onside engine — <span className="num text-fg font-semibold">{money(totalValueM)}</span> of
              talent across the draw, our forecast on each game, scores as they land.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Link href="/worldcup/schedule"><Button kind="outline" size="sm" icon={<Calendar size={13} />}>Schedule</Button></Link>
            <Link href="/worldcup/groups"><Button kind="outline" size="sm" icon={<Globe size={13} />}>Groups</Button></Link>
          </div>
        </div>
        {bracket && bracket.rounds.length > 0 ? (
          <BracketView bracket={bracket} />
        ) : (
          <Card className="p-10 text-center text-mute text-[13px]">The knockout bracket fills in as the group stage resolves.</Card>
        )}
      </div>

      <MatchdaySlate label={slate.label} isToday={slate.isToday} fixtures={slate.fixtures} watch={watch} />

      {/* Most valuable squads */}
      <SectionHead
        eyebrow="Squad values"
        title="Most valuable squads"
        action={<LiveDot />}
      />
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2 mb-12">
        {top10.map((team, i) => (
          <Link key={team.slug} href={`/worldcup/teams/${team.slug}`}>
            <Card className="p-4 hover:bg-ink-800 transition cursor-pointer h-full">
              <div className="flex items-center justify-between mb-3">
                <CodeTile slug={team.slug} name={team.name} size={36} />
                <span className="text-[10px] text-mute-soft num">#{i + 1}</span>
              </div>
              <div className="text-[13px] font-semibold truncate">{team.name}</div>
              <div className="num text-[16px] font-bold mt-1 text-up">{money(team.squadValueM)}</div>
              <div className="text-[10px] text-mute-soft num mt-0.5">
                {team.group ? `Group ${team.group}` : "—"}
                {team.fifaRank ? ` · FIFA #${team.fifaRank}` : ""}
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {/* Group of Death */}
      {groupOfDeath && (
        <>
          <SectionHead eyebrow="Toughest draw" title="The group of death" />
          <Card className="p-6 mb-12 overflow-hidden relative border-acc/25">
            <div
              className="absolute -top-16 -right-10 w-[280px] h-[280px] rounded-full pointer-events-none"
              style={{ background: "radial-gradient(circle, rgba(232,255,90,0.08) 0%, transparent 60%)" }}
            />
            <div className="relative flex items-start justify-between gap-6 flex-wrap">
              <div>
                <div className="flex items-center gap-2.5 mb-1">
                  <span className="display text-[28px]">Group {groupOfDeath.letter}</span>
                  <Chip tone="acc">Highest combined value</Chip>
                </div>
                <p className="text-[13px] text-mute max-w-[420px]">
                  Four nations worth a combined{" "}
                  <span className="num text-fg font-semibold">{money(groupOfDeath.total)}</span> — the densest
                  concentration of talent in the draw.
                </p>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-[0.18em] text-mute-soft mb-1">Combined value</div>
                <div className="display text-[40px] num leading-none text-acc">{money(groupOfDeath.total)}</div>
              </div>
            </div>
            <div className="relative grid grid-cols-2 md:grid-cols-4 gap-2 mt-5">
              {groupOfDeath.teams.map((t) => (
                <Link key={t.slug} href={`/worldcup/teams/${t.slug}`}>
                  <div className="rounded-xl bg-ink-800 hover:bg-ink-750 transition border border-line p-3 flex items-center gap-3 cursor-pointer">
                    <CodeTile slug={t.slug} name={t.name} size={34} />
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium truncate">{t.name}</div>
                      <div className="num text-[12px] text-mute">{money(t.squadValueM)}</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </Card>
        </>
      )}

      {/* All 48 nations */}
      <SectionHead
        eyebrow={`All ${nations.length} nations`}
        title="Every squad, by value"
        action={
          <Link href="/worldcup/groups">
            <Button kind="outline" size="sm" icon={<ArrowRight size={12} />}>By group</Button>
          </Link>
        }
      />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
        {nations.map((team) => (
          <Link key={team.slug} href={`/worldcup/teams/${team.slug}`}>
            <Card className={cn("p-3 hover:bg-ink-800 transition cursor-pointer h-full")}>
              <div className="flex items-center gap-2.5 mb-2.5">
                <CodeTile slug={team.slug} name={team.name} size={32} />
                <span className="ml-auto text-[10px] num text-mute-soft">
                  {team.group ? `Grp ${team.group}` : "—"}
                </span>
              </div>
              <div className="text-[12px] font-semibold truncate leading-tight">{team.name}</div>
              <div className="num text-[13px] font-bold mt-1">{money(team.squadValueM)}</div>
            </Card>
          </Link>
        ))}
      </div>
      <p className="text-[11px] text-mute-soft mt-4">
        Squad value is the sum of live Onside valuations across each nation&apos;s called-up players — a model
        estimate, not a market quote.
      </p>
    </div>
  );
}
