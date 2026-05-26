"use client";

import { useState } from "react";
import { Search, Users, Building2, Trophy, Globe } from "lucide-react";
import { Card, Avatar, Delta, Chip } from "@/components/ui";
import { fmtVal } from "@/lib/utils";

const RESULTS = {
  players: [
    { name: "Lamine Yamal", club: "Barcelona", pos: "RW", val: 215.0, dWeek: 9.3, clubBg: "#A50044", clubColor: "#EDBB00" },
    { name: "Florian Wirtz", club: "Bayer Leverkusen", pos: "AM", val: 140.5, dWeek: 6.8, clubBg: "#E32221", clubColor: "#000" },
    { name: "Cole Palmer", club: "Chelsea", pos: "AM", val: 128.0, dWeek: 8.4, clubBg: "#034694", clubColor: "#DBA111" },
  ],
  clubs: [
    { name: "FC Barcelona", short: "BAR", league: "La Liga", val: 1420, bg: "#A50044", color: "#EDBB00" },
    { name: "Real Madrid", short: "RMA", league: "La Liga", val: 1340, bg: "#FEBE10", color: "#00529F" },
  ],
  leagues: [
    { name: "Premier League", country: "England", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", clubs: 20, val: 12800 },
    { name: "La Liga", country: "Spain", flag: "🇪🇸", clubs: 20, val: 5200 },
  ],
};

export default function SearchPage() {
  const [query, setQuery] = useState("");

  return (
    <div className="max-w-[900px] mx-auto px-6 py-8">
      <div className="mb-8">
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-mute" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search players, clubs, leagues, managers..."
            className="w-full h-14 pl-12 pr-4 bg-ink-800 border border-line rounded-xl text-[15px] outline-none focus:border-acc/50 transition placeholder:text-mute-soft"
            autoFocus
          />
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {["Yamal", "Chelsea", "Free agents", "World Cup", "Premier League"].map((s) => (
            <button
              key={s}
              onClick={() => setQuery(s)}
              className="px-3 py-1.5 rounded-lg bg-ink-800 border border-line text-[12px] text-mute hover:text-white transition"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="space-y-6">
        {/* Players */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Users size={14} className="text-mute" />
            <span className="text-[13px] font-semibold">Players</span>
            <Chip tone="neutral">{RESULTS.players.length}</Chip>
          </div>
          <Card className="overflow-hidden">
            {RESULTS.players.map((p) => (
              <div key={p.name} className="flex items-center gap-3 px-4 py-3 border-b border-line last:border-0 hover:bg-white/[0.03] transition cursor-pointer">
                <Avatar name={p.name} clubBg={p.clubBg} clubColor={p.clubColor} size={32} />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium">{p.name}</div>
                  <div className="text-[11px] text-mute">{p.club} &middot; {p.pos}</div>
                </div>
                <div className="text-right">
                  <div className="num text-[13px] font-semibold">{fmtVal(p.val)}</div>
                  <Delta value={p.dWeek} />
                </div>
              </div>
            ))}
          </Card>
        </div>

        {/* Clubs */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Building2 size={14} className="text-mute" />
            <span className="text-[13px] font-semibold">Clubs</span>
            <Chip tone="neutral">{RESULTS.clubs.length}</Chip>
          </div>
          <Card className="overflow-hidden">
            {RESULTS.clubs.map((c) => (
              <div key={c.name} className="flex items-center gap-3 px-4 py-3 border-b border-line last:border-0 hover:bg-white/[0.03] transition cursor-pointer">
                <div className="w-8 h-8 rounded-md grid place-items-center text-[10px] font-bold" style={{ background: c.bg, color: c.color }}>
                  {c.short}
                </div>
                <div className="flex-1">
                  <div className="text-[13px] font-medium">{c.name}</div>
                  <div className="text-[11px] text-mute">{c.league}</div>
                </div>
                <span className="num text-[13px] font-semibold">{fmtVal(c.val)}</span>
              </div>
            ))}
          </Card>
        </div>

        {/* Leagues */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Globe size={14} className="text-mute" />
            <span className="text-[13px] font-semibold">Leagues</span>
            <Chip tone="neutral">{RESULTS.leagues.length}</Chip>
          </div>
          <Card className="overflow-hidden">
            {RESULTS.leagues.map((l) => (
              <div key={l.name} className="flex items-center gap-3 px-4 py-3 border-b border-line last:border-0 hover:bg-white/[0.03] transition cursor-pointer">
                <span className="text-[22px]">{l.flag}</span>
                <div className="flex-1">
                  <div className="text-[13px] font-medium">{l.name}</div>
                  <div className="text-[11px] text-mute">{l.country} &middot; {l.clubs} clubs</div>
                </div>
                <span className="num text-[13px] font-semibold">€{(l.val / 1000).toFixed(1)}B</span>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}
