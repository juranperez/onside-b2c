import type { Metadata } from "next";
import Link from "next/link";
import { Trophy, Calendar, Globe } from "lucide-react";
import { Card, SectionHead, LiveDot, Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { nationFlagSrc, nationCode } from "@/components/worldcup/nation-code";
import { getWcFixtures, type WcFixture } from "@/lib/queries";
import { matchdaySlate, roundLabel } from "@/lib/wc-day";
import { WcBreadcrumb } from "@/components/worldcup/WcBreadcrumb";
import { GoalAlertsPrompt } from "@/components/push/GoalAlertsPrompt";

// Re-render every 5 min so synced live scores surface without a redeploy.
export const revalidate = 300;

export const metadata: Metadata = {
  title: "World Cup 2026 schedule — fixtures & kickoff times | Onside",
  description:
    "Every World Cup 2026 fixture: dates, kickoff times, venues and live scores, matchday by matchday through to the final.",
};

const ET = "America/New_York";
const fmtDate = (iso: string) =>
  new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: ET }).format(
    new Date(iso),
  );
const fmtTime = (iso: string) =>
  new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: ET }).format(new Date(iso));

function Flag({ slug, name, size = 24 }: { slug: string; name: string; size?: number }) {
  const src = nationFlagSrc(slug);
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        className="rounded-full ring-1 ring-line/60 shrink-0 object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return <span className="num text-[11px] text-mute-soft shrink-0">{nationCode(slug, name)}</span>;
}

function MatchRow({ f }: { f: WcFixture }) {
  const decided = f.status === "finished" || f.status === "live";
  const score = decided ? `${f.scoreHome ?? 0}–${f.scoreAway ?? 0}` : "v";
  const homeCode = nationCode(f.home.slug, f.home.name);
  const awayCode = nationCode(f.away.slug, f.away.name);
  return (
    <div className="relative px-3 md:px-4 py-3.5 hover:bg-overlay/[0.03] transition border-b border-line last:border-0">
      {/* The whole row opens the match centre; team links sit above it. */}
      <Link href={`/matches/${f.id}`} className="absolute inset-0 z-0" aria-label={`${f.home.name} v ${f.away.name} — match centre`} />
      <div className="grid grid-cols-[64px_1fr_auto_1fr] md:grid-cols-[84px_1fr_72px_1fr_170px] items-center gap-2 pointer-events-none">
        {/* time / status */}
        <div className="text-left">
          {f.status === "live" ? (
            <LiveDot />
          ) : (
            <div className="num text-[14px] font-bold leading-tight">{f.kickoff ? fmtTime(f.kickoff) : "TBD"}</div>
          )}
          {f.group && <div className="text-[10px] text-acc font-semibold num mt-0.5">Group {f.group}</div>}
        </div>
        {/* home */}
        <div className="flex items-center justify-end gap-2.5 min-w-0">
          <Link href={`/worldcup/teams/${f.home.slug}`} className="pointer-events-auto relative z-10 text-[14px] font-semibold truncate text-right hover:text-acc transition">
            {f.home.name}
          </Link>
          <Flag slug={f.home.slug} name={f.home.name} />
        </div>
        {/* score / v */}
        <div
          className={cn(
            "num text-center font-bold tabular-nums px-1",
            decided ? "text-[17px]" : "text-[12px] text-mute-soft font-normal",
            f.status === "live" && "text-up",
          )}
        >
          {score}
        </div>
        {/* away */}
        <div className="flex items-center gap-2.5 min-w-0">
          <Flag slug={f.away.slug} name={f.away.name} />
          <Link href={`/worldcup/teams/${f.away.slug}`} className="pointer-events-auto relative z-10 text-[14px] font-semibold truncate hover:text-acc transition">
            {f.away.name}
          </Link>
        </div>
        {/* venue */}
        <div className="hidden md:block text-right text-[11.5px] text-mute truncate">
          {f.venue}
          {f.city ? ` · ${f.city}` : ""}
        </div>
      </div>
      {/* Onside Forecast — squad-value win probability (our own model).
          Upcoming: the pre-match call. Live: re-priced every refresh from the
          score + minute. Finished: how the call fared. */}
      {f.status === "scheduled" && f.forecast && (
        <ForecastBar label="Onside Forecast" fc={f.forecast} homeCode={homeCode} awayCode={awayCode} homeName={f.home.name} awayName={f.away.name} />
      )}
      {f.status === "live" && f.live && (
        <ForecastBar label="Live forecast · re-priced with the score" fc={f.live} homeCode={homeCode} awayCode={awayCode} homeName={f.home.name} awayName={f.away.name} pulse />
      )}
      {f.status === "finished" && f.verdict && f.forecast && (
        <div className="mt-2 pointer-events-none flex items-center justify-between gap-2 flex-wrap">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] font-bold num",
              f.verdict.hit ? "text-up" : "text-mute",
            )}
          >
            {f.verdict.hit ? "✓ Onside called it" : "✗ Against the forecast"}
          </span>
          <span className="num text-[10.5px] text-mute-soft tabular-nums">
            had {f.verdict.predicted === "home" ? homeCode : f.verdict.predicted === "away" ? awayCode : "draw"}{" "}
            {f.verdict.predictedPct}% · {homeCode} {f.forecast.home}% / draw {f.forecast.draw}% / {awayCode} {f.forecast.away}%
          </span>
        </div>
      )}
    </div>
  );
}

function ForecastBar({
  label, fc, homeCode, awayCode, homeName, awayName, pulse = false,
}: {
  label: string;
  fc: NonNullable<WcFixture["forecast"]>;
  homeCode: string;
  awayCode: string;
  homeName: string;
  awayName: string;
  pulse?: boolean;
}) {
  return (
    <div className="mt-2.5 pointer-events-none">
      <div className="flex items-center justify-between mb-1">
        <span className={cn("inline-flex items-center gap-1.5 text-[9px] uppercase tracking-[0.14em] font-bold num", pulse ? "text-up" : "text-acc")}>
          <span className={cn("w-1.5 h-1.5 rounded-full", pulse ? "bg-up animate-pulse" : "bg-acc")} /> {label}
        </span>
        <span className="num text-[10.5px] text-mute tabular-nums">
          <span className="text-fg font-semibold">{homeCode} {fc.home}%</span>
          <span className="text-mute-soft mx-1.5">·</span>
          draw {fc.draw}%
          <span className="text-mute-soft mx-1.5">·</span>
          <span className="text-fg font-semibold">{awayCode} {fc.away}%</span>
        </span>
      </div>
      <div className="flex h-2 rounded-full overflow-hidden bg-ink-700" title={`${homeName} ${fc.home}% · Draw ${fc.draw}% · ${awayName} ${fc.away}%`}>
        <div style={{ width: `${fc.home}%` }} className={pulse ? "bg-up" : "bg-acc"} />
        <div style={{ width: `${fc.draw}%` }} className="bg-ink-600" />
        <div style={{ width: `${fc.away}%` }} className="bg-fg/70" />
      </div>
    </div>
  );
}

export default async function WorldCupSchedulePage() {
  let fixtures: WcFixture[] = [];
  try {
    fixtures = await getWcFixtures();
  } catch (e) {
    console.error("[wc/schedule] data unavailable at render:", e);
  }

  // The cup is live: the hero leads with the current state, not a countdown to an
  // opener that's already kicked off. matchdaySlate gives today's fixtures (ET), or
  // the next match day's when today is empty — the same helper the hub leads with.
  const slate = matchdaySlate(fixtures, new Date());
  const liveNow = slate.fixtures.filter((f) => f.status === "live").length;
  const slateDate = slate.fixtures.find((f) => f.kickoff)?.kickoff ?? null;

  // Group by round, preserving chronological order.
  const groups: { round: string; items: WcFixture[] }[] = [];
  for (const f of fixtures) {
    const label = roundLabel(f.round);
    const g = groups.find((x) => x.round === label);
    if (g) g.items.push(f);
    else groups.push({ round: label, items: [f] });
  }

  if (fixtures.length === 0) {
    return (
      <div className="max-w-[1440px] mx-auto px-6 py-20 text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Calendar size={16} className="text-acc" />
          <span className="text-[11px] uppercase tracking-[0.18em] text-acc num font-semibold">World Cup 2026</span>
        </div>
        <h1 className="display text-[32px] mb-3">The schedule is loading</h1>
        <p className="text-mute mb-6">Fixtures aren&apos;t available right now. Explore the squads in the meantime.</p>
        <Link href="/worldcup">
          <Button kind="primary">Back to the hub</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-[1100px] mx-auto px-6 py-8">
      <WcBreadcrumb current="Schedule" />
      <GoalAlertsPrompt />
      {/* Hero — live tournament state (no countdown; the cup is underway) */}
      <div className="relative rounded-2xl bg-ink-850 border border-line overflow-hidden mb-8">
        <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" />
        <div
          className="absolute -top-20 -right-10 w-[400px] h-[400px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(232,255,90,0.1) 0%, transparent 60%)" }}
        />
        <div className="relative p-8 md:p-10">
          <div className="flex items-center gap-2 mb-3">
            <Trophy size={15} className="text-acc" />
            <span className="text-[11px] uppercase tracking-[0.18em] text-acc num font-semibold">
              World Cup 2026 · Schedule
            </span>
          </div>
          <h1 className="display text-[clamp(26px,4vw,42px)] tracking-tight leading-[1.05] mb-2">
            {slate.label || "The schedule"}
          </h1>
          {slate.fixtures.length > 0 ? (
            <p className="text-mute text-[14px] mb-6 flex items-center gap-x-2 gap-y-1 flex-wrap">
              {liveNow > 0 ? (
                <span className="inline-flex items-center gap-1.5 text-up font-semibold num">
                  <span className="w-1.5 h-1.5 rounded-full bg-up animate-pulse" />
                  {liveNow} live now
                </span>
              ) : (
                <span className="text-fg font-semibold">{slate.isToday ? "Today" : "Up next"}</span>
              )}
              {slateDate && (
                <>
                  <span className="text-mute-soft">·</span>
                  <span className="num text-fg">{fmtDate(slateDate)}</span>
                </>
              )}
              <span className="text-mute-soft">·</span>
              <span className="num">
                {slate.fixtures.length} {slate.fixtures.length === 1 ? "match" : "matches"}
              </span>
            </p>
          ) : (
            <p className="text-mute text-[14px] mb-6">Every fixture, from the group stage to the final.</p>
          )}

          <div className="mt-8 flex items-center gap-3 flex-wrap">
            <Link href="/worldcup/groups">
              <Button kind="outline" size="sm" icon={<Globe size={13} />}>All groups</Button>
            </Link>
            <Link href="/worldcup/bracket">
              <Button kind="outline" size="sm" icon={<Trophy size={13} />}>Projected bracket</Button>
            </Link>
            <span className="text-[11px] text-mute-soft num">{fixtures.length} fixtures · all times ET</span>
          </div>
        </div>
      </div>

      {/* Fixtures by matchday, sectioned by day */}
      {groups.map((g) => {
        const dates = [...new Set(g.items.map((f) => (f.kickoff ? fmtDate(f.kickoff) : "TBD")))];
        return (
          <div key={g.round} className="mb-10">
            <SectionHead
              eyebrow={`Group stage · ${dates[0]}${dates.length > 1 ? ` – ${dates[dates.length - 1]}` : ""}`}
              title={g.round}
              action={g.items.some((f) => f.status === "live") ? <LiveDot /> : undefined}
            />
            <Card className="overflow-hidden">
              {g.items.map((f, i) => {
                const day = f.kickoff ? fmtDate(f.kickoff) : "TBD";
                const prevDay = i > 0 && g.items[i - 1].kickoff ? fmtDate(g.items[i - 1].kickoff!) : null;
                const newDay = i === 0 || day !== prevDay;
                return (
                  <div key={f.id}>
                    {newDay && (
                      <div className="px-4 py-2 bg-ink-900 border-b border-line flex items-center gap-2">
                        <Calendar size={11} className="text-mute-soft" />
                        <span className="text-[11.5px] font-semibold text-fg">{day}</span>
                        <span className="text-[10px] text-mute-soft num ml-auto">all times ET</span>
                      </div>
                    )}
                    <MatchRow f={f} />
                  </div>
                );
              })}
            </Card>
          </div>
        );
      })}

      <p className="text-[11px] text-mute-soft mt-2">
        Fixtures, kickoff times and scores via API-Football. Knockout pairings are added once group results are
        final. Times shown in US Eastern.
      </p>
    </div>
  );
}
