"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, TrendingUp, Trophy } from "lucide-react";
import { Card, SectionHead, Avatar, Delta, Chip } from "@/components/ui";
import { fmtVal } from "@/lib/utils";

const LEAGUE = {
  name: "Premier League",
  slug: "premier-league",
  country: "England",
  flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  totalVal: 12800,
  clubs: 20,
  avgAge: 26.4,
  topScorer: "Haaland (28)",
  topAssist: "Saka (14)",
};

const TABLE = [
  { pos: 1, name: "Arsenal", short: "ARS", bg: "#EF0107", color: "#fff", pts: 89, gd: 58, val: 1380 },
  { pos: 2, name: "Manchester City", short: "MCI", bg: "#6CABDD", color: "#1C2C5B", pts: 85, gd: 52, val: 1520 },
  { pos: 3, name: "Liverpool", short: "LIV", bg: "#C8102E", color: "#fff", pts: 82, gd: 45, val: 1180 },
  { pos: 4, name: "Chelsea", short: "CHE", bg: "#034694", color: "#DBA111", pts: 74, gd: 28, val: 1240 },
  { pos: 5, name: "Newcastle", short: "NEW", bg: "#241F20", color: "#fff", pts: 68, gd: 22, val: 820 },
  { pos: 6, name: "Aston Villa", short: "AVL", bg: "#670E36", color: "#95BFE5", pts: 65, gd: 18, val: 680 },
  { pos: 7, name: "Tottenham", short: "TOT", bg: "#132257", color: "#fff", pts: 62, gd: 14, val: 890 },
  { pos: 8, name: "Man United", short: "MUN", bg: "#DA291C", color: "#FBE122", pts: 58, gd: 8, val: 920 },
];

const TOP_PLAYERS = [
  { name: "Bukayo Saka", club: "Arsenal", pos: "RW", val: 142.0, dWeek: 5.6, clubBg: "#EF0107", clubColor: "#fff" },
  { name: "Cole Palmer", club: "Chelsea", pos: "AM", val: 128.0, dWeek: 8.4, clubBg: "#034694", clubColor: "#DBA111" },
  { name: "Erling Haaland", club: "Man City", pos: "ST", val: 165.0, dWeek: 3.2, clubBg: "#6CABDD", clubColor: "#1C2C5B" },
  { name: "Declan Rice", club: "Arsenal", pos: "DM", val: 108.0, dWeek: 2.8, clubBg: "#EF0107", clubColor: "#fff" },
  { name: "Phil Foden", club: "Man City", pos: "AM", val: 112.0, dWeek: -1.4, clubBg: "#6CABDD", clubColor: "#1C2C5B" },
];

export default function LeagueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-8">
      <Link href="/leagues" className="inline-flex items-center gap-1.5 text-[13px] text-mute hover:text-white transition mb-6">
        <ArrowLeft size={14} /> All leagues
      </Link>

      <div className="flex items-center gap-4 mb-8">
        <span className="text-[48px]">{LEAGUE.flag}</span>
        <div>
          <h1 className="display text-[clamp(28px,4vw,40px)] tracking-tight">{LEAGUE.name}</h1>
          <div className="text-[13px] text-mute mt-1">{LEAGUE.country} &middot; {LEAGUE.clubs} clubs</div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <Card className="p-4">
          <div className="text-[10px] text-mute-soft uppercase tracking-wider">Total value</div>
          <div className="num display text-[28px] mt-1">€{(LEAGUE.totalVal / 1000).toFixed(1)}B</div>
        </Card>
        <Card className="p-4">
          <div className="text-[10px] text-mute-soft uppercase tracking-wider">Avg age</div>
          <div className="num display text-[28px] mt-1">{LEAGUE.avgAge}</div>
        </Card>
        <Card className="p-4">
          <div className="text-[10px] text-mute-soft uppercase tracking-wider">Top scorer</div>
          <div className="text-[14px] font-semibold mt-1">{LEAGUE.topScorer}</div>
        </Card>
        <Card className="p-4">
          <div className="text-[10px] text-mute-soft uppercase tracking-wider">Top assists</div>
          <div className="text-[14px] font-semibold mt-1">{LEAGUE.topAssist}</div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-[1fr_380px] gap-6">
        {/* League table */}
        <Card className="overflow-hidden">
          <div className="px-5 py-3 border-b border-line">
            <SectionHead eyebrow="2025/26" title="Standings" />
          </div>
          <div className="grid grid-cols-[40px_1.5fr_60px_60px_90px] px-4 py-2.5 text-[10px] uppercase tracking-wider text-mute-soft num border-b border-line bg-ink-900">
            <span>#</span><span>Club</span><span className="text-right">Pts</span>
            <span className="text-right">GD</span><span className="text-right">Value</span>
          </div>
          {TABLE.map((t) => (
            <Link key={t.name} href={`/clubs/${t.name.toLowerCase().replace(/ /g, "-")}`}>
              <div className="grid grid-cols-[40px_1.5fr_60px_60px_90px] px-4 py-3 items-center hover:bg-white/[0.03] transition border-b border-line last:border-0 cursor-pointer">
                <span className="num text-[12px] text-mute">{t.pos}</span>
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-md grid place-items-center text-[9px] font-bold" style={{ background: t.bg, color: t.color }}>
                    {t.short}
                  </div>
                  <span className="text-[13px] font-medium">{t.name}</span>
                </div>
                <span className="num text-[13px] text-right font-semibold">{t.pts}</span>
                <span className="num text-[12px] text-right text-mute">+{t.gd}</span>
                <span className="num text-[12px] text-right">{fmtVal(t.val)}</span>
              </div>
            </Link>
          ))}
        </Card>

        {/* Most valuable players */}
        <Card className="p-5 h-fit">
          <SectionHead eyebrow="Top 5" title="Most valuable" />
          <div className="space-y-3 mt-4">
            {TOP_PLAYERS.map((p, i) => (
              <div key={p.name} className="flex items-center gap-3">
                <span className="num text-[11px] text-mute-soft w-4">{i + 1}</span>
                <Avatar name={p.name} clubBg={p.clubBg} clubColor={p.clubColor} size={28} />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium truncate">{p.name}</div>
                  <div className="text-[11px] text-mute">{p.club} &middot; {p.pos}</div>
                </div>
                <div className="text-right">
                  <div className="num text-[13px] font-semibold">{fmtVal(p.val)}</div>
                  <Delta value={p.dWeek} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
