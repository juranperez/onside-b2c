"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Card, Tabs } from "@/components/ui";
import type { ClubSummary } from "@/lib/queries";

/** Squad value in millions → editorial money string (€…M, or €…B at/above a billion). */
function money(m: number): string {
  if (m >= 1000) return `€${(m / 1000).toFixed(2)}B`;
  return `€${m}M`;
}

export function ClubsBrowser({ clubs }: { clubs: ClubSummary[] }) {
  const [league, setLeague] = useState("all");

  // Build the league filter from the leagues actually present, ordered by the
  // combined squad value of their clubs (most valuable competitions first).
  const leagueTabs = useMemo(() => {
    const byLeague = new Map<string, { name: string; value: number }>();
    for (const c of clubs) {
      if (!c.leagueSlug) continue;
      const cur = byLeague.get(c.leagueSlug) ?? { name: c.league, value: 0 };
      cur.value += c.squadValueM;
      byLeague.set(c.leagueSlug, cur);
    }
    const ranked = [...byLeague.entries()]
      .sort((a, b) => b[1].value - a[1].value)
      .map(([slug, v]) => ({ id: slug, label: v.name }));
    return [{ id: "all", label: "All" }, ...ranked];
  }, [clubs]);

  const filtered = useMemo(
    () =>
      clubs
        .filter((c) => league === "all" || c.leagueSlug === league)
        .sort((a, b) => b.squadValueM - a.squadValueM),
    [clubs, league],
  );

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-8">
      <div className="flex items-end justify-between mb-7 flex-wrap gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-mute-soft mb-2 num">Club rankings</div>
          <h1 className="display text-[clamp(28px,4vw,40px)] leading-[1] tracking-[-0.04em]">
            <span className="num">{clubs.length}</span> squads.{" "}
            <span className="font-serif italic text-acc">Most valuable first.</span>
          </h1>
        </div>
        {leagueTabs.length > 1 && (
          <Tabs size="sm" value={league} onChange={setLeague} tabs={leagueTabs} />
        )}
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center text-mute">No squads to rank yet.</Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="grid grid-cols-[40px_1.5fr_1fr_110px] px-4 py-3 text-[10px] uppercase tracking-wider text-mute-soft num border-b border-line bg-ink-900">
            <span>#</span>
            <span>Club</span>
            <span className="text-right">League</span>
            <span className="text-right">Squad value</span>
          </div>
          {filtered.map((c, i) => (
            <Link key={c.slug} href={`/clubs/${c.slug}`}>
              <div
                className={cn(
                  "grid grid-cols-[40px_1.5fr_1fr_110px] px-4 py-3 items-center",
                  "hover:bg-overlay/[0.03] transition border-b border-line last:border-0 cursor-pointer",
                )}
              >
                <span className="num text-[12px] text-mute-soft">{i + 1}</span>
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-8 h-8 rounded-[6px] grid place-items-center text-[10px] font-bold num shrink-0"
                    style={{ background: c.bg, color: c.color }}
                  >
                    {c.short}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13.5px] font-semibold truncate">{c.name}</div>
                  </div>
                </div>
                <span className="text-[11px] text-mute text-right truncate">{c.league}</span>
                <span className="num text-[13px] text-right font-semibold">{money(c.squadValueM)}</span>
              </div>
            </Link>
          ))}
        </Card>
      )}
    </div>
  );
}
