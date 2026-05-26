"use client";

import Link from "next/link";
import { Bookmark, Bell, TrendingUp, Settings, Plus } from "lucide-react";
import { Card, SectionHead, Button, Avatar, Delta, Chip } from "@/components/ui";
import { fmtVal } from "@/lib/utils";

const WATCHLIST = [
  { name: "Lamine Yamal", club: "Barcelona", pos: "RW", val: 215.0, dWeek: 9.3, dMonth: 18.6, clubBg: "#A50044", clubColor: "#EDBB00" },
  { name: "Florian Wirtz", club: "Bayer Leverkusen", pos: "AM", val: 140.5, dWeek: 6.8, dMonth: 12.4, clubBg: "#E32221", clubColor: "#000" },
  { name: "Cole Palmer", club: "Chelsea", pos: "AM", val: 128.0, dWeek: 8.4, dMonth: 15.2, clubBg: "#034694", clubColor: "#DBA111" },
  { name: "Jude Bellingham", club: "Real Madrid", pos: "CM", val: 131.4, dWeek: 2.1, dMonth: 6.8, clubBg: "#FEBE10", clubColor: "#00529F" },
  { name: "Bukayo Saka", club: "Arsenal", pos: "RW", val: 142.0, dWeek: 5.6, dMonth: 10.8, clubBg: "#EF0107", clubColor: "#fff" },
];

const ALERTS = [
  { text: "Wirtz value +€6.8M this week (your threshold: €5M)", time: "2h ago", type: "up" },
  { text: "Palmer named in England World Cup squad", time: "6h ago", type: "news" },
  { text: "Yamal reaches new all-time high €215M", time: "1d ago", type: "up" },
  { text: "Bellingham minor injury concern (hamstring)", time: "2d ago", type: "alert" },
];

export default function WatchlistPage() {
  const totalValue = WATCHLIST.reduce((s, p) => s + p.val, 0);
  const totalDelta = WATCHLIST.reduce((s, p) => s + p.dWeek, 0);

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-8">
      <div className="flex items-end justify-between mb-7 flex-wrap gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-mute-soft mb-2 num">Your portfolio</div>
          <h1 className="display text-[clamp(28px,4vw,40px)] leading-[1] tracking-[-0.04em]">
            Watchlist
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button kind="ghost" size="sm" icon={<Bell size={13} />}>Alerts</Button>
          <Button kind="ghost" size="sm" icon={<Settings size={13} />}>Settings</Button>
          <Button kind="primary" size="sm" icon={<Plus size={13} />}>Add player</Button>
        </div>
      </div>

      {/* Portfolio summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <Card className="p-4">
          <div className="text-[10px] text-mute-soft uppercase tracking-wider">Total value</div>
          <div className="num display text-[28px] mt-1">{fmtVal(totalValue)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-[10px] text-mute-soft uppercase tracking-wider">Weekly change</div>
          <div className="num display text-[28px] mt-1 text-up">+{fmtVal(totalDelta)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-[10px] text-mute-soft uppercase tracking-wider">Players</div>
          <div className="num display text-[28px] mt-1">{WATCHLIST.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-[10px] text-mute-soft uppercase tracking-wider">Top performer</div>
          <div className="text-[14px] font-semibold mt-1">Yamal</div>
          <Delta value={9.3} />
        </Card>
      </div>

      <div className="grid lg:grid-cols-[1fr_340px] gap-6">
        <div>
          <Card className="overflow-hidden">
            <div className="grid grid-cols-[1.5fr_60px_80px_90px_90px] px-4 py-3 text-[10px] uppercase tracking-wider text-mute-soft num border-b border-line bg-ink-900">
              <span>Player</span><span className="text-right">Pos</span>
              <span className="text-right">Value</span><span className="text-right">Week</span>
              <span className="text-right">Month</span>
            </div>
            {WATCHLIST.map((p) => (
              <Link key={p.name} href="/players/yamal">
                <div className="grid grid-cols-[1.5fr_60px_80px_90px_90px] px-4 py-3 items-center hover:bg-white/[0.03] transition border-b border-line last:border-0 cursor-pointer">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={p.name} clubBg={p.clubBg} clubColor={p.clubColor} size={32} />
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold truncate">{p.name}</div>
                      <div className="text-[11px] text-mute truncate">{p.club}</div>
                    </div>
                  </div>
                  <span className="num text-[12px] text-right">{p.pos}</span>
                  <span className="num text-[13px] text-right font-semibold">{fmtVal(p.val)}</span>
                  <span className="text-right"><Delta value={p.dWeek} /></span>
                  <span className="text-right"><Delta value={p.dMonth} /></span>
                </div>
              </Link>
            ))}
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="text-[13px] font-semibold flex items-center gap-1.5 mb-3">
              <Bell size={13} /> Recent alerts
            </h3>
            <div className="space-y-3">
              {ALERTS.map((a, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${a.type === "up" ? "bg-up" : a.type === "alert" ? "bg-down" : "bg-acc"}`} />
                  <div>
                    <div className="text-[12px] leading-snug">{a.text}</div>
                    <div className="text-[10px] text-mute-soft num mt-0.5">{a.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
