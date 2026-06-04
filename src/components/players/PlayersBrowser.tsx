"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { cn, fmtVal } from "@/lib/utils";
import { LayoutGrid, List } from "lucide-react";
import { Tabs, Card, Avatar, Delta } from "@/components/ui";
import type { PlayerListItem } from "@/lib/queries/map";

type SortKey = "val" | "rise" | "age";

export function PlayersBrowser({ players, total }: { players: PlayerListItem[]; total: number }) {
  const [view, setView] = useState<"grid" | "list">("grid");
  const [pos, setPos] = useState("all");
  const [sort, setSort] = useState<SortKey>("val");

  const filtered = useMemo(() => {
    return players
      .filter((p) => (pos === "all" ? true : p.pos === pos))
      .sort((a, b) => {
        if (sort === "val") return b.val - a.val;
        if (sort === "rise") return b.dWeek - a.dWeek;
        return a.age - b.age;
      });
  }, [players, pos, sort]);

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-8">
      <div className="flex items-end justify-between mb-7 flex-wrap gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-mute-soft mb-2 num">All players</div>
          <h1 className="display text-[clamp(28px,4vw,40px)] leading-[1] tracking-[-0.04em]">
            <span className="num">{total.toLocaleString()}</span> players.{" "}
            <span className="font-serif italic text-acc">One floor.</span>
          </h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Tabs
            size="sm"
            value={pos}
            onChange={setPos}
            tabs={[
              { id: "all", label: "All" },
              { id: "FWD", label: "FWD" },
              { id: "MID", label: "MID" },
              { id: "DEF", label: "DEF" },
              { id: "GK", label: "GK" },
            ]}
          />
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
          <div className="inline-flex items-center gap-0.5 p-1 rounded-lg bg-ink-800 border border-line">
            <button
              onClick={() => setView("grid")}
              className={cn("p-1.5 rounded-md cursor-pointer", view === "grid" ? "bg-ink-700 text-fg" : "text-mute")}
              aria-label="Grid view"
            >
              <LayoutGrid size={14} />
            </button>
            <button
              onClick={() => setView("list")}
              className={cn("p-1.5 rounded-md cursor-pointer", view === "list" ? "bg-ink-700 text-fg" : "text-mute")}
              aria-label="List view"
            >
              <List size={14} />
            </button>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center text-mute">No players match this filter yet.</Card>
      ) : view === "grid" ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((p) => (
            <Link key={p.id} href={`/players/${p.slug}`}>
              <div className="rounded-2xl bg-ink-850 hover:bg-ink-800 transition border border-line p-5 text-left relative overflow-hidden cursor-pointer">
                <div
                  className="absolute inset-0 opacity-25 pointer-events-none"
                  style={{ background: `linear-gradient(160deg, ${p.clubBg} 0%, transparent 70%)` }}
                />
                <div className="relative">
                  <div className="flex items-start justify-between mb-4">
                    <Avatar name={p.name} clubBg={p.clubBg} clubColor={p.clubColor} size={48} />
                    <Delta value={p.dWeek} big />
                  </div>
                  <div className="text-[15px] font-semibold leading-tight">{p.name}</div>
                  <div className="text-[11.5px] text-mute mt-1 flex items-center gap-1.5">
                    <div
                      className="w-3 h-3 rounded-[3px] grid place-items-center text-[6px] font-bold num"
                      style={{ background: p.clubBg, color: p.clubColor }}
                    >
                      {p.clubShort.slice(0, 1)}
                    </div>
                    {p.club} &middot; {p.pos}
                  </div>
                  <div className="mt-4 flex items-end justify-between">
                    <div>
                      <div className="num display text-[24px] leading-none">{fmtVal(p.val)}</div>
                      <div className="text-[10.5px] text-mute-soft mt-1 num">{p.age ? `${p.age}y` : "—"}</div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="grid grid-cols-[1.5fr_60px_60px_90px_90px_1fr] px-4 py-3 text-[10px] uppercase tracking-wider text-mute-soft num border-b border-line bg-ink-900">
            <span>Player</span>
            <span className="text-right">Pos</span>
            <span className="text-right">Age</span>
            <span className="text-right">Value</span>
            <span className="text-right">7d</span>
            <span className="text-right">League</span>
          </div>
          {filtered.map((p) => (
            <Link key={p.id} href={`/players/${p.slug}`}>
              <div className="w-full grid grid-cols-[1.5fr_60px_60px_90px_90px_1fr] px-4 py-3 items-center hover:bg-overlay/[0.03] transition text-left border-b border-line last:border-0 cursor-pointer">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={p.name} clubBg={p.clubBg} clubColor={p.clubColor} size={28} />
                  <div className="min-w-0">
                    <div className="text-[13.5px] font-semibold truncate">{p.name}</div>
                    <div className="text-[11px] text-mute truncate">{p.club}</div>
                  </div>
                </div>
                <span className="num text-[12px] text-right">{p.pos}</span>
                <span className="num text-[12px] text-right">{p.age || "—"}</span>
                <span className="num text-[13px] text-right font-semibold">{fmtVal(p.val)}</span>
                <span className="text-right">
                  <Delta value={p.dWeek} />
                </span>
                <span className="num text-[11px] text-right text-mute truncate">{p.league}</span>
              </div>
            </Link>
          ))}
        </Card>
      )}
    </div>
  );
}
