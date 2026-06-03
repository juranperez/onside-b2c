import type { Metadata } from "next";
import { getStatLeaders, type StatLeader } from "@/lib/queries";
import { StatLeaderboards } from "@/components/stats/StatLeaderboards";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Stats leaderboards — Onside",
  description:
    "Top performers across Europe's biggest leagues — goals, assists and match ratings, each paired with its live Onside valuation.",
};

export default async function StatsPage() {
  const [goals, assists, rating] = await Promise.all([
    getStatLeaders("goals", 25).catch(() => [] as StatLeader[]),
    getStatLeaders("assists", 25).catch(() => [] as StatLeader[]),
    getStatLeaders("rating", 25).catch(() => [] as StatLeader[]),
  ]);

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-8">
      <div className="mb-8">
        <div className="text-[11px] uppercase tracking-[0.18em] text-mute-soft mb-2 num">Season leaders</div>
        <h1 className="display text-[clamp(28px,4vw,40px)] tracking-tight">
          Stats <span className="font-serif italic text-acc">leaderboards</span>
        </h1>
        <p className="text-[13px] text-mute mt-2">
          Top performers across Europe&apos;s biggest leagues, each with its live Onside valuation.
        </p>
      </div>

      <StatLeaderboards goals={goals} assists={assists} rating={rating} />
    </div>
  );
}
