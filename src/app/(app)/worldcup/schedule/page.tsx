import type { Metadata } from "next";
import Link from "next/link";
import { Trophy, Calendar, Globe } from "lucide-react";
import { Card, SectionHead, LiveDot, Chip, Button } from "@/components/ui";
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
  return (
    <Link href={`/worldcup/teams/${f.home.slug}`} className="block">
      <div className="grid grid-cols-[64px_1fr_auto_1fr] md:grid-cols-[92px_1fr_64px_1fr_150px] items-center gap-2 px-3 md:px-4 py-3 hover:bg-overlay/[0.03] transition border-b border-line last:border-0">
        {/* time / status */}
        <div className="text-left">
          {f.status === "live" ? (
            <LiveDot />
          ) : (
            <>
              <div className="num text-[12px] font-semibold leading-tight">{f.kickoff ? fmtTime(f.kickoff) : "TBD"}</div>
              <div className="num text-[10px] text-mute-soft leading-tight">{f.kickoff ? fmtDate(f.kickoff) : ""}</div>
            </>
          )}
        </div>
        {/* home */}
        <div className="flex items-center justify-end gap-2 min-w-0">
          <span className="text-[13px] font-medium truncate text-right">{f.home.name}</span>
          <Flag slug={f.home.slug} name={f.home.name} />
        </div>
        {/* score / v */}
        <div
          className={cn(
            "num text-center font-bold tabular-nums",
            decided ? "text-[16px]" : "text-[12px] text-mute-soft font-normal",
            f.status === "live" && "text-up",
          )}
        >
          {score}
        </div>
        {/* away */}
        <div className="flex items-center gap-2 min-w-0">
          <Flag slug={f.away.slug} name={f.away.name} />
          <span className="text-[13px] font-medium truncate">{f.away.name}</span>
        </div>
        {/* venue */}
        <div className="hidden md:block text-right text-[11px] text-mute-soft truncate num">
          {f.venue}
          {f.city ? ` · ${f.city}` : ""}
        </div>
        {/* Onside Forecast — squad-value win probability (our own; WC isn't on Sportmonks) */}
        {f.forecast && (
          <div className="col-span-full mt-2 flex items-center gap-2">
            <span className="text-[8.5px] uppercase tracking-[0.14em] text-mute-soft num shrink-0">Onside&nbsp;Forecast</span>
            <div className="flex-1 flex h-1.5 rounded-full overflow-hidden" title={`${f.home.name} ${f.forecast.home}% · Draw ${f.forecast.draw}% · ${f.away.name} ${f.forecast.away}%`}>
              <div style={{ width: `${f.forecast.home}%` }} className="bg-acc" />
              <div style={{ width: `${f.forecast.draw}%` }} className="bg-ink-600" />
              <div style={{ width: `${f.forecast.away}%` }} className="bg-fg/40" />
            </div>
            <span className="num text-[9.5px] text-mute-soft shrink-0 tabular-nums">{f.forecast.home}·{f.forecast.draw}·{f.forecast.away}</span>
          </div>
        )}
      </div>
    </Link>
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

      {/* Fixtures by matchday */}
      {groups.map((g) => (
        <div key={g.round} className="mb-8">
          <SectionHead
            eyebrow="Group stage"
            title={g.round}
            action={g.items.some((f) => f.status === "live") ? <LiveDot /> : undefined}
          />
          <Card className="overflow-hidden">
            {g.items.map((f) => (
              <MatchRow key={f.id} f={f} />
            ))}
          </Card>
        </div>
      ))}

      <p className="text-[11px] text-mute-soft mt-2">
        Fixtures, kickoff times and scores via API-Football. Knockout pairings are added once group results are
        final. Times shown in US Eastern.
      </p>
    </div>
  );
}
