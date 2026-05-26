"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { LayoutGrid, List, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Tabs, Card, Avatar, Delta } from "@/components/ui";
import { fmtVal } from "@/lib/utils";

const MOCK_PLAYERS = [
  { id: "yamal", slug: "yamal", name: "Lamine Yamal", first: "Lamine", last: "Yamal", pos: "RW", age: 17, club: "Barcelona", clubShort: "BAR", clubBg: "#A50044", clubColor: "#EDBB00", val: 215.0, dWeek: 9.3, league: "La Liga" },
  { id: "vinicius", slug: "vinicius-jr", name: "Vinicius Jr", first: "Vinicius", last: "Jr", pos: "LW", age: 25, club: "Real Madrid", clubShort: "RMA", clubBg: "#FEBE10", clubColor: "#00529F", val: 198.0, dWeek: 3.1, league: "La Liga" },
  { id: "mbappe", slug: "mbappe", name: "Kylian Mbappé", first: "Kylian", last: "Mbappé", pos: "ST", age: 27, club: "Real Madrid", clubShort: "RMA", clubBg: "#FEBE10", clubColor: "#00529F", val: 185.0, dWeek: -3.8, league: "La Liga" },
  { id: "haaland", slug: "haaland", name: "Erling Haaland", first: "Erling", last: "Haaland", pos: "ST", age: 25, club: "Manchester City", clubShort: "MCI", clubBg: "#6CABDD", clubColor: "#1C2C5B", val: 178.5, dWeek: 4.2, league: "Premier League" },
  { id: "musiala", slug: "musiala", name: "Jamal Musiala", first: "Jamal", last: "Musiala", pos: "AM", age: 23, club: "Bayern Munich", clubShort: "BAY", clubBg: "#DC052D", clubColor: "#0066B2", val: 148.0, dWeek: 2.9, league: "Bundesliga" },
  { id: "saka", slug: "saka", name: "Bukayo Saka", first: "Bukayo", last: "Saka", pos: "RW", age: 23, club: "Arsenal", clubShort: "ARS", clubBg: "#EF0107", clubColor: "#FFFFFF", val: 142.0, dWeek: 5.6, league: "Premier League" },
  { id: "wirtz", slug: "wirtz", name: "Florian Wirtz", first: "Florian", last: "Wirtz", pos: "AM", age: 22, club: "Bayer Leverkusen", clubShort: "LEV", clubBg: "#E32221", clubColor: "#000000", val: 140.5, dWeek: 6.8, league: "Bundesliga" },
  { id: "bellingham", slug: "bellingham", name: "Jude Bellingham", first: "Jude", last: "Bellingham", pos: "CM", age: 22, club: "Real Madrid", clubShort: "RMA", clubBg: "#FEBE10", clubColor: "#00529F", val: 131.4, dWeek: 2.1, league: "La Liga" },
  { id: "palmer", slug: "palmer", name: "Cole Palmer", first: "Cole", last: "Palmer", pos: "AM", age: 23, club: "Chelsea", clubShort: "CHE", clubBg: "#034694", clubColor: "#DBA111", val: 128.0, dWeek: 8.4, league: "Premier League" },
  { id: "pedri", slug: "pedri", name: "Pedri", first: "Pedro", last: "González", pos: "CM", age: 23, club: "Barcelona", clubShort: "BAR", clubBg: "#A50044", clubColor: "#EDBB00", val: 112.0, dWeek: -1.2, league: "La Liga" },
  { id: "endrick", slug: "endrick", name: "Endrick", first: "Endrick", last: "Felipe", pos: "ST", age: 19, club: "Real Madrid", clubShort: "RMA", clubBg: "#FEBE10", clubColor: "#00529F", val: 64.0, dWeek: 1.8, league: "La Liga" },
  { id: "gyokeres", slug: "gyokeres", name: "Viktor Gyökeres", first: "Viktor", last: "Gyökeres", pos: "ST", age: 27, club: "Sporting CP", clubShort: "SPO", clubBg: "#009A44", clubColor: "#FFFFFF", val: 82.0, dWeek: 11.2, league: "Liga Portugal" },
  { id: "guirassy", slug: "guirassy", name: "Serhou Guirassy", first: "Serhou", last: "Guirassy", pos: "ST", age: 28, club: "Borussia Dortmund", clubShort: "BVB", clubBg: "#FDE100", clubColor: "#000000", val: 52.0, dWeek: 2.4, league: "Bundesliga" },
  { id: "doue", slug: "doue", name: "Désiré Doué", first: "Désiré", last: "Doué", pos: "LW", age: 20, club: "Paris Saint-Germain", clubShort: "PSG", clubBg: "#004170", clubColor: "#DA291C", val: 58.0, dWeek: 3.6, league: "Ligue 1" },
];

type SortKey = "val" | "rise" | "age";

export default function PlayersPage() {
  const [view, setView] = useState<"grid" | "list">("grid");
  const [pos, setPos] = useState("all");
  const [sort, setSort] = useState<SortKey>("val");

  const filtered = useMemo(() => {
    return MOCK_PLAYERS
      .filter((p) => {
        if (pos === "all") return true;
        if (pos === "FW") return ["ST", "LW", "RW", "CF"].includes(p.pos);
        if (pos === "MF") return ["CM", "AM", "DM"].includes(p.pos);
        if (pos === "CB") return ["CB", "LB", "RB", "GK"].includes(p.pos);
        return p.pos === pos;
      })
      .sort((a, b) => {
        if (sort === "val") return b.val - a.val;
        if (sort === "rise") return b.dWeek - a.dWeek;
        return a.age - b.age;
      });
  }, [pos, sort]);

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-8">
      <div className="flex items-end justify-between mb-7 flex-wrap gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-mute-soft mb-2 num">
            All players
          </div>
          <h1 className="display text-[clamp(28px,4vw,40px)] leading-[1] tracking-[-0.04em]">
            <span className="num">128,412</span> players.{" "}
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
              { id: "FW", label: "FW" },
              { id: "MF", label: "MF" },
              { id: "CB", label: "CB" },
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
              className={cn("p-1.5 rounded-md cursor-pointer", view === "grid" ? "bg-ink-700 text-white" : "text-mute")}
            >
              <LayoutGrid size={14} />
            </button>
            <button
              onClick={() => setView("list")}
              className={cn("p-1.5 rounded-md cursor-pointer", view === "list" ? "bg-ink-700 text-white" : "text-mute")}
            >
              <List size={14} />
            </button>
          </div>
        </div>
      </div>

      {view === "grid" ? (
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
                      <div className="text-[10.5px] text-mute-soft mt-1 num">{p.age}y</div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="grid grid-cols-[1.5fr_60px_80px_80px_90px_80px] px-4 py-3 text-[10px] uppercase tracking-wider text-mute-soft num border-b border-line bg-ink-900">
            <span>Player</span>
            <span className="text-right">Pos</span>
            <span className="text-right">Age</span>
            <span className="text-right">Val</span>
            <span className="text-right">Delta Week</span>
            <span className="text-right">Peak</span>
          </div>
          {filtered.map((p) => (
            <Link key={p.id} href={`/players/${p.slug}`}>
              <div className="w-full grid grid-cols-[1.5fr_60px_80px_80px_90px_80px] px-4 py-3 items-center hover:bg-white/[0.03] transition text-left border-b border-line last:border-0 cursor-pointer">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={p.name} clubBg={p.clubBg} clubColor={p.clubColor} size={28} />
                  <div className="min-w-0">
                    <div className="text-[13.5px] font-semibold truncate">{p.name}</div>
                    <div className="text-[11px] text-mute truncate">{p.club}</div>
                  </div>
                </div>
                <span className="num text-[12px] text-right">{p.pos}</span>
                <span className="num text-[12px] text-right">{p.age}</span>
                <span className="num text-[13px] text-right font-semibold">{fmtVal(p.val)}</span>
                <span className="text-right">
                  <Delta value={p.dWeek} />
                </span>
                <span className="num text-[12px] text-right text-mute">{fmtVal(p.val * 1.15)}</span>
              </div>
            </Link>
          ))}
        </Card>
      )}
    </div>
  );
}
