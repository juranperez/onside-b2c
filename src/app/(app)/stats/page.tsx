"use client";

import { useState } from "react";
import { Card, SectionHead, Avatar, Delta, Chip } from "@/components/ui";
import { fmtVal } from "@/lib/utils";

const CATEGORIES = ["Goals", "Assists", "xG", "Key passes", "Dribbles", "Tackles", "Clean sheets"];

const LEADERS: Record<string, { name: string; club: string; pos: string; stat: string; clubBg: string; clubColor: string }[]> = {
  Goals: [
    { name: "Erling Haaland", club: "Man City", pos: "ST", stat: "28", clubBg: "#6CABDD", clubColor: "#1C2C5B" },
    { name: "Viktor Gyökeres", club: "Sporting", pos: "ST", stat: "26", clubBg: "#008C45", clubColor: "#fff" },
    { name: "Robert Lewandowski", club: "Barcelona", pos: "ST", stat: "24", clubBg: "#A50044", clubColor: "#EDBB00" },
    { name: "Harry Kane", club: "Bayern", pos: "ST", stat: "23", clubBg: "#DC052D", clubColor: "#fff" },
    { name: "Lamine Yamal", club: "Barcelona", pos: "RW", stat: "22", clubBg: "#A50044", clubColor: "#EDBB00" },
    { name: "Bukayo Saka", club: "Arsenal", pos: "RW", stat: "21", clubBg: "#EF0107", clubColor: "#fff" },
    { name: "Vinícius Jr", club: "Real Madrid", pos: "LW", stat: "20", clubBg: "#FEBE10", clubColor: "#00529F" },
    { name: "Cole Palmer", club: "Chelsea", pos: "AM", stat: "19", clubBg: "#034694", clubColor: "#DBA111" },
    { name: "Mohamed Salah", club: "Liverpool", pos: "RW", stat: "18", clubBg: "#C8102E", clubColor: "#fff" },
    { name: "Jonathan David", club: "Lille", pos: "ST", stat: "17", clubBg: "#E2001A", clubColor: "#fff" },
  ],
  Assists: [
    { name: "Bukayo Saka", club: "Arsenal", pos: "RW", stat: "16", clubBg: "#EF0107", clubColor: "#fff" },
    { name: "Lamine Yamal", club: "Barcelona", pos: "RW", stat: "16", clubBg: "#A50044", clubColor: "#EDBB00" },
    { name: "Florian Wirtz", club: "Leverkusen", pos: "AM", stat: "14", clubBg: "#E32221", clubColor: "#000" },
    { name: "Cole Palmer", club: "Chelsea", pos: "AM", stat: "13", clubBg: "#034694", clubColor: "#DBA111" },
    { name: "Kevin De Bruyne", club: "Man City", pos: "AM", stat: "12", clubBg: "#6CABDD", clubColor: "#1C2C5B" },
    { name: "Vinícius Jr", club: "Real Madrid", pos: "LW", stat: "11", clubBg: "#FEBE10", clubColor: "#00529F" },
    { name: "Phil Foden", club: "Man City", pos: "AM", stat: "10", clubBg: "#6CABDD", clubColor: "#1C2C5B" },
    { name: "Pedri", club: "Barcelona", pos: "CM", stat: "10", clubBg: "#A50044", clubColor: "#EDBB00" },
    { name: "Jamal Musiala", club: "Bayern", pos: "AM", stat: "9", clubBg: "#DC052D", clubColor: "#fff" },
    { name: "Martin Ødegaard", club: "Arsenal", pos: "AM", stat: "9", clubBg: "#EF0107", clubColor: "#fff" },
  ],
};

export default function StatsPage() {
  const [active, setActive] = useState("Goals");
  const data = LEADERS[active] || LEADERS["Goals"];

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-8">
      <div className="mb-8">
        <div className="text-[11px] uppercase tracking-[0.18em] text-mute-soft mb-2 num">2025/26 Season</div>
        <h1 className="display text-[clamp(28px,4vw,40px)] tracking-tight">
          Stats <span className="font-serif italic text-acc">leaderboards</span>
        </h1>
        <p className="text-[13px] text-mute mt-2">Top performers across Europe&apos;s Big 5 leagues.</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setActive(c)}
            className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border transition ${
              active === c
                ? "bg-acc/15 border-acc/30 text-acc"
                : "bg-ink-800 border-line text-mute hover:text-white"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="grid grid-cols-[40px_1.5fr_80px_60px_80px] px-4 py-2.5 text-[10px] uppercase tracking-wider text-mute-soft num border-b border-line bg-ink-900">
          <span>#</span><span>Player</span><span>Club</span><span>Pos</span>
          <span className="text-right">{active}</span>
        </div>
        {data.map((p, i) => (
          <div key={p.name} className="grid grid-cols-[40px_1.5fr_80px_60px_80px] px-4 py-3 items-center border-b border-line last:border-0 hover:bg-white/[0.03] transition">
            <span className={`num text-[13px] font-semibold ${i < 3 ? "text-acc" : "text-mute"}`}>{i + 1}</span>
            <div className="flex items-center gap-3">
              <Avatar name={p.name} clubBg={p.clubBg} clubColor={p.clubColor} size={32} />
              <span className="text-[13px] font-medium">{p.name}</span>
            </div>
            <span className="text-[12px] text-mute truncate">{p.club}</span>
            <span className="num text-[12px] text-mute">{p.pos}</span>
            <span className="num text-[16px] text-right font-bold">{p.stat}</span>
          </div>
        ))}
      </Card>

      {!LEADERS[active] && (
        <Card className="p-8 text-center mt-4">
          <div className="text-[14px] text-mute">Data for &quot;{active}&quot; coming soon.</div>
          <div className="text-[12px] text-mute-soft mt-1">We&apos;re crunching the numbers across 2,400+ players.</div>
        </Card>
      )}
    </div>
  );
}
