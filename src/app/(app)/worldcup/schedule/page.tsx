import type { Metadata } from "next";
import Link from "next/link";
import { Trophy, Calendar, Globe } from "lucide-react";
import { Card, SectionHead, LiveDot, Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { Countdown } from "@/components/worldcup/countdown";
import { nationFlagSrc, nationCode } from "@/components/worldcup/nation-code";
import { getWcFixtures, type WcFixture } from "@/lib/queries";

// Re-render every 5 min so synced live scores surface without a redeploy.
export const revalidate = 300;

export const metadata: Metadata = {
  title: "World Cup 2026 schedule — fixtures & kickoff times | Onside",
  description:
    "Every World Cup 2026 fixture: dates, kickoff times, venues and live scores, counting down to the opening match at Estadio Azteca.",
};

const ET = "America/New_York";
const fmtDate = (iso: string) =>
  new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: ET }).format(
    new Date(iso),
  );
const fmtTime = (iso: string) =>
  new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: ET }).format(new Date(iso));

function roundLabel(r: string | null): string {
  const m = r?.match(/Group Stage - (\d)/);
  return m ? `Matchday ${m[1]}` : (r ?? "Fixtures");
}

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
      {/* Onside Forecast — squad-value win probability (our own model) */}
      {f.forecast && (
        <div className="mt-2.5 pointer-events-none">
          <div className="flex items-center justify-between mb-1">
            <span className="inline-flex items-center gap-1.5 text-[9px] uppercase tracking-[0.14em] font-bold num text-acc">
              <span className="w-1.5 h-1.5 rounded-full bg-acc" /> Onside Forecast
            </span>
            <span className="num text-[10.5px] text-mute tabular-nums">
              <span className="text-fg font-semibold">{homeCode} {f.forecast.home}%</span>
              <span className="text-mute-soft mx-1.5">·</span>
              draw {f.forecast.draw}%
              <span className="text-mute-soft mx-1.5">·</span>
              <span className="text-fg font-semibold">{awayCode} {f.forecast.away}%</span>
            </span>
          </div>
          <div className="flex h-2 rounded-full overflow-hidden bg-ink-700" title={`${f.home.name} ${f.forecast.home}% · Draw ${f.forecast.draw}% · ${f.away.name} ${f.forecast.away}%`}>
            <div style={{ width: `${f.forecast.home}%` }} className="bg-acc" />
            <div style={{ width: `${f.forecast.draw}%` }} className="bg-ink-600" />
            <div style={{ width: `${f.forecast.away}%` }} className="bg-fg/70" />
          </div>
        </div>
      )}
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

  const opener = fixtures.find((f) => f.status === "scheduled") ?? fixtures[0];

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
      {/* Hero + countdown */}
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
            {opener ? (
              <>
                {opener.home.name} <span className="text-mute-soft font-serif italic font-normal text-[0.7em]">v</span>{" "}
                {opener.away.name}
              </>
            ) : (
              "The schedule"
            )}
          </h1>
          {opener?.kickoff && (
            <p className="text-mute text-[14px] mb-6">
              The tournament opens at {opener.venue}, {opener.city} —{" "}
              <span className="num text-fg">
                {fmtDate(opener.kickoff)}, {fmtTime(opener.kickoff)} ET
              </span>
              .
            </p>
          )}
          {opener?.kickoff && <Countdown target={opener.kickoff} />}

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
