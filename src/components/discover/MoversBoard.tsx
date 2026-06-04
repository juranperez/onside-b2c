"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Card, Avatar, Delta } from "@/components/ui";
import type { PlayerListItem } from "@/lib/queries/map";

type Dir = "all" | "up" | "down";

/**
 * Client child for the "Biggest movers · last 24h" board.
 * Receives the already-fetched movers from the Server Component and lets the
 * reader flip between All / Up / Down without another round-trip.
 */
export function MoversBoard({ movers }: { movers: PlayerListItem[] }) {
  const [dir, setDir] = useState<Dir>("all");

  const shown = useMemo(() => {
    const sorted = [...movers].sort((a, b) => Math.abs(b.dWeek) - Math.abs(a.dWeek));
    const filtered =
      dir === "up"
        ? sorted.filter((p) => p.dWeek > 0)
        : dir === "down"
          ? sorted.filter((p) => p.dWeek < 0)
          : sorted;
    return filtered.slice(0, 4);
  }, [movers, dir]);

  const toggles: { id: Dir; label: string }[] = [
    { id: "all", label: "All" },
    { id: "up", label: "Up" },
    { id: "down", label: "Down" },
  ];

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-mute-soft num">Today&apos;s board</div>
          <h2 className="text-[18px] font-semibold mt-0.5">Biggest movers &middot; last 24h</h2>
        </div>
        <div className="flex items-center gap-2">
          {toggles.map((t) => (
            <button
              key={t.id}
              onClick={() => setDir(t.id)}
              className={cn(
                "px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer",
                dir === t.id ? "bg-overlay/10 text-fg" : "text-mute hover:text-fg",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <Card className="p-8 text-center text-mute text-[13px]">
          No movers in this direction right now.
        </Card>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {shown.map((p) => (
            <Link key={p.id} href={`/players/${p.slug}`}>
              <Card className="p-4 hover:bg-ink-800 transition cursor-pointer h-full">
                <div className="flex items-center justify-between mb-3">
                  <Avatar name={p.name} clubBg={p.clubBg} clubColor={p.clubColor} size={36} />
                  <Delta value={p.dWeek} big />
                </div>
                <div className="text-[14px] font-semibold leading-snug truncate">{p.name}</div>
                <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-mute min-w-0">
                  <span
                    className="w-3 h-3 rounded-sm grid place-items-center text-[6px] font-bold num shrink-0"
                    style={{ background: p.clubBg, color: p.clubColor }}
                  >
                    {p.clubShort.slice(0, 2)}
                  </span>
                  <span className="truncate">{p.club}</span>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <span className="num text-[18px] font-bold">€{p.val.toFixed(1)}M</span>
                  <span className="text-[10px] text-mute-soft num">{p.pos}</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
