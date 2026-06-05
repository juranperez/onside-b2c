"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, Avatar, Tabs } from "@/components/ui";
import type { StatLeader } from "@/lib/queries";

type Metric = "goals" | "assists" | "rating";

function fmtStat(metric: Metric, v: number): string {
  return metric === "rating" ? v.toFixed(2) : Math.round(v).toString();
}

export function StatLeaderboards({
  goals,
  assists,
  rating,
}: {
  goals: StatLeader[];
  assists: StatLeader[];
  rating: StatLeader[];
}) {
  const [metric, setMetric] = useState<Metric>("goals");
  const lists: Record<Metric, StatLeader[]> = { goals, assists, rating };
  const rows = lists[metric];

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <Tabs
          value={metric}
          onChange={(v) => setMetric(v as Metric)}
          tabs={[
            { id: "goals", label: "Goals" },
            { id: "assists", label: "Assists" },
            { id: "rating", label: "Rating" },
          ]}
        />
      </div>

      {rows.length === 0 ? (
        <Card className="px-6 py-12 text-center">
          <h2 className="display text-[22px] tracking-tight mb-1.5">No leaderboard yet</h2>
          <p className="text-mute text-[13px]">
            We&apos;re still crunching the numbers for this metric. Check back soon.
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="grid grid-cols-[40px_1.5fr_1fr_80px_90px] px-4 py-2.5 text-[10px] uppercase tracking-wider text-mute-soft num border-b border-line bg-ink-900">
            <span>#</span>
            <span>Player</span>
            <span>Club</span>
            <span className="text-right capitalize">{metric}</span>
            <span className="text-right">Onside</span>
          </div>
          {rows.map((p, i) => (
            <Link
              key={`${p.slug}-${i}`}
              href={`/players/${p.slug}`}
              className="grid grid-cols-[40px_1.5fr_1fr_80px_90px] px-4 py-3 items-center border-b border-line last:border-0 hover:bg-overlay/[0.03] transition"
            >
              <span className={`num text-[13px] font-semibold ${i < 3 ? "text-acc" : "text-mute"}`}>
                {i + 1}
              </span>
              <div className="flex items-center gap-3 min-w-0">
                <Avatar name={p.displayName} clubBg={p.clubBg} clubColor={p.clubColor} size={32} />
                <span className="text-[13px] font-medium truncate">{p.displayName}</span>
              </div>
              <span className="text-[12px] text-mute truncate">{p.club}</span>
              <span className="num text-[16px] text-right font-bold">{fmtStat(metric, p.statValue)}</span>
              <span className="num text-[13px] text-right font-semibold">€{p.valueM}M</span>
            </Link>
          ))}
        </Card>
      )}
    </div>
  );
}
