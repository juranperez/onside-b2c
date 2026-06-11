import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Radio, Gauge, Banknote, Flame, MessagesSquare, CalendarClock } from "lucide-react";
import { Card, Button, LiveDot } from "@/components/ui";
import { WireRow } from "@/components/transfers/wire-row";
import { FilterRail } from "@/components/transfers/filter-rail";
import { getRumours, getCommentCounts, filterWire, type RumourItem, type WireFilters } from "@/lib/queries/rumours";

// Confidence carries a time-decay factor, so keep the feed fresh on every request.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "The Wire — every transfer rumour, live, rated by the Onside Confidence % | Onside",
  description:
    "The live transfer wire: every rumour and done deal, stage-tracked and rated by the Onside Confidence % — a market-anchored credibility score priced against each player's live Onside valuation.",
};

// Summer 2026 window (Premier League dates; close enough across the big leagues for v0).
const WINDOW = { label: "Summer window", opens: Date.UTC(2026, 5, 15), closes: Date.UTC(2026, 8, 1) };

function windowStatus(now = Date.now()): string {
  if (now < WINDOW.opens) {
    const d = Math.ceil((WINDOW.opens - now) / 86_400_000);
    return d <= 1 ? "opens tomorrow" : `opens in ${d}d`;
  }
  if (now <= WINDOW.closes) {
    const d = Math.ceil((WINDOW.closes - now) / 86_400_000);
    return `OPEN · ${d}d left`;
  }
  return "closed";
}

function PulseStat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <div className="w-7 h-7 rounded-lg bg-overlay/5 border border-line grid place-items-center text-acc shrink-0">{icon}</div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-mute-soft leading-none">{label}</div>
        <div className="text-[13px] font-semibold num truncate mt-1">
          {value}
          {sub && <span className="text-mute-soft font-normal ml-1.5 text-[11px]">{sub}</span>}
        </div>
      </div>
    </div>
  );
}

export default async function TransfersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const filters: WireFilters = {
    status: (["rumour", "confirmed", "dead"].includes(one(sp.status)) ? one(sp.status) : undefined) as WireFilters["status"],
    league: one(sp.league) || undefined,
    club: one(sp.club) || undefined,
    credibleOnly: one(sp.min) === "70",
  };

  let all: RumourItem[] = [];
  let comments = new Map<string, number>();
  try {
    [all, comments] = await Promise.all([getRumours(120), getCommentCounts()]);
  } catch (e) {
    console.error("[transfers] data unavailable:", e);
  }
  const items = filterWire(all, filters);

  // Pulse — computed over the whole feed, not the filtered view.
  const nowTs = new Date().getTime();
  const dayStart = new Date().setUTCHours(0, 0, 0, 0);
  const todaySpendM = all
    .filter((r) => new Date(r.lastUpdate).getTime() >= dayStart && r.reportedFeeM != null)
    .reduce((s, r) => s + (r.reportedFeeM ?? 0), 0);
  const live = all.filter((r) => r.status === "rumour");
  const biggest = [...live].sort((a, b) => (b.reportedFeeM ?? 0) - (a.reportedFeeM ?? 0))[0];
  const mostDiscussed = [...all].sort((a, b) => (comments.get(b.id) ?? 0) - (comments.get(a.id) ?? 0))[0];

  // League chips from the live feed itself — self-maintaining.
  const leagueCount = new Map<string, { slug: string; name: string; n: number }>();
  for (const r of all) {
    if (!r.leagueSlug || !r.league) continue;
    const e = leagueCount.get(r.leagueSlug) ?? { slug: r.leagueSlug, name: r.league, n: 0 };
    e.n++;
    leagueCount.set(r.leagueSlug, e);
  }
  const leagues = [...leagueCount.values()].sort((a, b) => b.n - a.n).slice(0, 8);

  return (
    <div className="max-w-[1100px] mx-auto px-4 md:px-6 py-8">
      {/* Compact hero */}
      <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Radio size={14} className="text-acc" />
            <span className="text-[11px] uppercase tracking-[0.18em] text-acc num font-semibold">The Wire</span>
            <LiveDot />
          </div>
          <h1 className="display text-[clamp(24px,3.5vw,34px)] tracking-tight leading-[1.05]">
            Every rumour, rated. <span className="font-serif italic text-acc">Live.</span>
          </h1>
        </div>
        <p className="text-[12px] text-mute max-w-[340px] leading-relaxed hidden md:block">
          Stage-tracked stories with the Onside Confidence % — source quality, corroboration, contract leverage, and
          whether the fee lines up with our live valuation.
        </p>
      </div>

      {/* Market pulse */}
      <Card className="px-4 py-3 mb-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-3">
          <PulseStat icon={<CalendarClock size={13} />} label={WINDOW.label} value={windowStatus()} />
          <PulseStat icon={<Banknote size={13} />} label="Reported fees today" value={todaySpendM > 0 ? `€${Math.round(todaySpendM)}M` : "—"} />
          <PulseStat
            icon={<Flame size={13} />}
            label="Biggest live saga"
            value={biggest ? biggest.player.name : "—"}
            sub={biggest?.reportedFeeM != null ? `€${biggest.reportedFeeM}M` : undefined}
          />
          <PulseStat
            icon={<MessagesSquare size={13} />}
            label="Most discussed"
            value={mostDiscussed && (comments.get(mostDiscussed.id) ?? 0) > 0 ? mostDiscussed.player.name : "—"}
            sub={mostDiscussed && (comments.get(mostDiscussed.id) ?? 0) > 0 ? `${comments.get(mostDiscussed.id)} takes` : undefined}
          />
        </div>
      </Card>

      <Suspense>
        <FilterRail leagues={leagues} />
      </Suspense>

      {items.length === 0 ? (
        <Card className="p-12 text-center">
          <Gauge size={26} className="mx-auto text-mute-soft mb-3" />
          <h2 className="display text-[22px] mb-1.5">{all.length === 0 ? "The Wire is warming up" : "Nothing matches those filters"}</h2>
          <p className="text-mute text-[13px] max-w-[440px] mx-auto leading-relaxed">
            {all.length === 0
              ? "Stories land here the moment our ingestion engine verifies them — each scored live against the player's Onside valuation."
              : "Loosen a filter or clear them all to get back to the full feed."}
          </p>
          <Link href="/transfers" className="inline-block mt-5">
            <Button kind="primary">{all.length === 0 ? "Browse players" : "Clear filters"}</Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {items.map((r) => (
            <WireRow key={r.id} r={r} comments={comments.get(r.id) ?? 0} now={nowTs} />
          ))}
        </div>
      )}

      <p className="text-[11px] text-mute-soft mt-6 leading-relaxed">
        Confidence % weights source credibility (45%), corroboration (20%), valuation alignment (20%), contract status
        (10%) and freshness (5%). Stage is derived from the latest credible report. Rumours come from public reporting;
        scores are model estimates, not guarantees — see the{" "}
        <Link href="/insights/accuracy" className="text-mute hover:text-acc transition underline">
          accuracy report
        </Link>
        .
      </p>
    </div>
  );
}
