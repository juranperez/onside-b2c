"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Card, Avatar, Delta, Tabs } from "@/components/ui";
import type { PlayerListItem } from "@/lib/queries/map";

type SortKey = "val" | "rise" | "age";

/** Player value in millions → editorial money string. */
function money(m: number): string {
  return `€${m.toFixed(1)}M`;
}

export function SquadTable({ squad }: { squad: PlayerListItem[] }) {
  const [sort, setSort] = useState<SortKey>("val");

  const sorted = useMemo(
    () =>
      [...squad].sort((a, b) => {
        if (sort === "val") return b.val - a.val;
        if (sort === "rise") return b.dWeek - a.dWeek;
        return a.age - b.age;
      }),
    [squad, sort],
  );

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-4 px-5 py-3.5 border-b border-line">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-mute-soft mb-1 num">Roster</div>
          <h2 className="display text-xl tracking-tight">
            The squad, <span className="font-serif italic text-acc">by value</span>
          </h2>
        </div>
        <Tabs
          size="sm"
          value={sort}
          onChange={(v) => setSort(v as SortKey)}
          tabs={[
            { id: "val", label: "Value" },
            { id: "rise", label: "Risers" },
            { id: "age", label: "Age" },
          ]}
        />
      </div>

      {sorted.length === 0 ? (
        <div className="p-12 text-center text-mute">No squad data yet.</div>
      ) : (
        <>
          <div className="grid grid-cols-[1.5fr_60px_50px_90px_80px] px-4 py-2.5 text-[10px] uppercase tracking-wider text-mute-soft num border-b border-line bg-ink-900">
            <span>Player</span>
            <span className="text-right">Pos</span>
            <span className="text-right">Age</span>
            <span className="text-right">Value</span>
            <span className="text-right">Week</span>
          </div>
          {sorted.map((p) => (
            <Link key={p.id} href={`/players/${p.slug}`}>
              <div
                className={cn(
                  "grid grid-cols-[1.5fr_60px_50px_90px_80px] px-4 py-3 items-center",
                  "hover:bg-overlay/[0.03] transition border-b border-line last:border-0 cursor-pointer",
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={p.name} clubBg={p.clubBg} clubColor={p.clubColor} size={28} />
                  <span className="text-[13px] font-medium truncate">{p.name}</span>
                </div>
                <span className="num text-[12px] text-right text-mute">{p.pos}</span>
                <span className="num text-[12px] text-right text-mute">{p.age || "—"}</span>
                <span className="num text-[13px] text-right font-semibold">{money(p.val)}</span>
                <span className="text-right">
                  <Delta value={p.dWeek} />
                </span>
              </div>
            </Link>
          ))}
        </>
      )}
    </Card>
  );
}
