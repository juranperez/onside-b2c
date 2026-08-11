import type { Metadata } from "next";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { getStatLeaders, type StatLeader } from "@/lib/queries";
import { StatLeaderboards } from "@/components/stats/StatLeaderboards";

// U21 is a query param view — render per-request, cache upstream of the CDN.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Stats leaderboards — Onside",
  description:
    "Top performers across Europe's biggest leagues — goals, assists and match ratings, each paired with its live Onside valuation. Flip to U21 for the wonderkid board.",
};

export default async function StatsPage({ searchParams }: { searchParams: Promise<{ u21?: string }> }) {
  const sp = await searchParams;
  const u21 = sp.u21 === "1";
  const [goals, assists, rating, xg] = await Promise.all([
    getStatLeaders("goals", 25, u21).catch(() => [] as StatLeader[]),
    getStatLeaders("assists", 25, u21).catch(() => [] as StatLeader[]),
    getStatLeaders("rating", 25, u21).catch(() => [] as StatLeader[]),
    getStatLeaders("xg", 25, u21).catch(() => [] as StatLeader[]),
  ]);

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-8">
      <div className="mb-8">
        <div className="text-[11px] uppercase tracking-[0.18em] text-mute-soft mb-2 num">Season leaders</div>
        <h1 className="display text-[clamp(28px,4vw,40px)] tracking-tight">
          Stats <span className="font-serif italic text-acc">leaderboards</span>
          {u21 && <span className="ml-3 align-middle inline-flex items-center rounded-full bg-acc text-ink-950 px-2.5 py-1 text-[12px] font-bold num">U21</span>}
        </h1>
        <p className="text-[13px] text-mute mt-2">
          {u21
            ? "The wonderkid board — under-21 leaders only, each with its live Onside valuation."
            : "Top performers across Europe's biggest leagues, each with its live Onside valuation."}
        </p>
        <div className="flex items-center gap-2 mt-4">
          <Link
            href="/stats"
            className={cn(
              "h-7 px-3 rounded-full text-[12px] font-medium transition border inline-flex items-center",
              !u21 ? "bg-acc text-ink-950 border-acc" : "bg-overlay/5 text-mute border-line hover:text-fg",
            )}
          >
            All ages
          </Link>
          <Link
            href="/stats?u21=1"
            className={cn(
              "h-7 px-3 rounded-full text-[12px] font-medium transition border inline-flex items-center",
              u21 ? "bg-acc text-ink-950 border-acc" : "bg-overlay/5 text-mute border-line hover:text-fg",
            )}
          >
            U21 only
          </Link>
        </div>
      </div>

      <StatLeaderboards goals={goals} assists={assists} rating={rating} xg={xg} />
    </div>
  );
}
