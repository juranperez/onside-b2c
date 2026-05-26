"use client";

import Link from "next/link";
import { ArrowRight, TrendingUp, Sparkles, MessageCircle, Bookmark, RefreshCw } from "lucide-react";
import { Button, Card, SectionHead, Avatar, Delta, Chip, LiveDot } from "@/components/ui";
import { fmtVal } from "@/lib/utils";

const MOVERS = [
  { name: "Lamine Yamal", club: "FC Barcelona", short: "BAR", pos: "RW", age: 17, val: 215.0, dWeek: 9.3, clubBg: "#A50044", clubColor: "#EDBB00", series: [180, 188, 195, 198, 205, 208, 215] },
  { name: "Endrick", club: "Real Madrid", short: "RMA", pos: "ST", age: 19, val: 76.0, dWeek: 6.2, clubBg: "#FEBE10", clubColor: "#00529F", series: [52, 55, 60, 64, 68, 72, 76] },
  { name: "Désiré Doué", club: "Paris Saint-Germain", short: "PSG", pos: "AM", age: 20, val: 74.0, dWeek: 7.2, clubBg: "#004170", clubColor: "#DA291C", series: [42, 48, 52, 58, 62, 68, 74] },
  { name: "Florian Wirtz", club: "Bayer Leverkusen", short: "B04", pos: "AM", age: 22, val: 142.0, dWeek: 5.2, clubBg: "#E32221", clubColor: "#000", series: [118, 122, 128, 132, 136, 139, 142] },
];

const RECOMMENDED = [
  { name: "Serhou Guirassy", club: "Borussia Dortmund", short: "BVB", pos: "ST", age: 30, val: 48.0, dWeek: 0.4, clubBg: "#FDE100", clubColor: "#000" },
  { name: "Jamal Musiala", club: "Bayern Munich", short: "FCB", pos: "AM", age: 22, val: 138.0, dWeek: 4.8, clubBg: "#DC052D", clubColor: "#fff" },
  { name: "Bukayo Saka", club: "Arsenal", short: "ARS", pos: "RW", age: 24, val: 134.0, dWeek: 2.5, clubBg: "#EF0107", clubColor: "#fff" },
  { name: "Pedri", club: "FC Barcelona", short: "BAR", pos: "CM", age: 23, val: 98.0, dWeek: 3.2, clubBg: "#A50044", clubColor: "#EDBB00" },
  { name: "Viktor Gyökeres", club: "Arsenal", short: "ARS", pos: "ST", age: 27, val: 86.0, dWeek: 3.6, clubBg: "#EF0107", clubColor: "#fff" },
  { name: "Cole Palmer", club: "Chelsea", short: "CHE", pos: "AM", age: 23, val: 128.0, dWeek: 8.4, clubBg: "#034694", clubColor: "#DBA111" },
];

function MiniSparkline({ data, color = "rgb(0,230,118)" }: { data: number[]; color?: string }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 80;
  const h = 28;
  const points = data
    .map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`)
    .join(" ");
  return (
    <svg width={w} height={h} className="shrink-0">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function DiscoverPage() {
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Morning" : hour < 17 ? "Afternoon" : "Evening";
  const dayStr = now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-8">
      {/* Hero greeting */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <LiveDot />
          <span className="text-[11px] uppercase tracking-[0.12em] text-mute-soft num">
            Live {dayStr.split(",")[0]} &middot; {dayStr}
          </span>
        </div>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <h1 className="display text-[clamp(28px,4vw,40px)] tracking-[-0.03em] leading-[1.1]">
            {greeting}, Mateo. <span className="font-serif italic text-acc">The board moved overnight.</span>
          </h1>
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/watchlist">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-up/10 border border-up/20 text-[12px] font-medium">
                <span className="text-up">Watchlist</span>
                <span className="text-up num font-bold">€11.2M</span>
              </div>
            </Link>
            <Link href="/community">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-line text-[12px] font-medium text-mute">
                11 new threads
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Biggest movers — horizontal cards */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-mute-soft num">Today&apos;s board</div>
            <h2 className="text-[18px] font-semibold mt-0.5">Biggest movers &middot; last 24h</h2>
          </div>
          <div className="flex items-center gap-2">
            {["All", "Up", "Down"].map((f, i) => (
              <button
                key={f}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
                  i === 0
                    ? "bg-white/10 text-white"
                    : "text-mute hover:text-white"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {MOVERS.map((p) => (
            <Link key={p.name} href="/players/yamal">
              <Card className="p-4 hover:bg-ink-800 transition cursor-pointer">
                <div className="flex items-center justify-between mb-3">
                  <Avatar name={p.name} clubBg={p.clubBg} clubColor={p.clubColor} size={36} />
                  <Delta value={p.dWeek} big />
                </div>
                <div className="text-[14px] font-semibold leading-snug">{p.name}</div>
                <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-mute">
                  <span className="w-3 h-3 rounded-sm grid place-items-center text-[6px] font-bold" style={{ background: p.clubBg, color: p.clubColor }}>
                    {p.short.slice(0, 2)}
                  </span>
                  {p.club}
                </div>
                <div className="flex items-center justify-between mt-3">
                  <span className="num text-[18px] font-bold">{fmtVal(p.val)}</span>
                  <MiniSparkline data={p.series} />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_340px] gap-6">
        <div className="space-y-8">
          {/* Players you should know about */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-acc" />
                  <span className="text-[10px] uppercase tracking-[0.18em] text-mute-soft num">For you</span>
                </div>
                <h2 className="text-[18px] font-semibold mt-1">Players you should know about</h2>
              </div>
              <button className="text-[12px] text-mute hover:text-white transition flex items-center gap-1">
                <RefreshCw size={12} /> Refresh
              </button>
            </div>
            <p className="text-[12px] text-mute-soft mb-4">Because you compared Bellingham and Pedri this week.</p>

            <div className="grid grid-cols-2 gap-2">
              {RECOMMENDED.map((p) => (
                <Link key={p.name} href="/players/yamal">
                  <Card className="p-4 hover:bg-ink-800 transition cursor-pointer">
                    <div className="flex items-center gap-3">
                      <Avatar name={p.name} clubBg={p.clubBg} clubColor={p.clubColor} size={36} />
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-semibold truncate">{p.name}</div>
                        <div className="text-[11px] text-mute">
                          <span className="inline-flex items-center gap-1">
                            <span className="w-3 h-3 rounded-sm grid place-items-center text-[6px] font-bold" style={{ background: p.clubBg, color: p.clubColor }}>
                              {p.short.slice(0, 2)}
                            </span>
                            {p.club}
                          </span>
                          <span className="mx-1">&middot;</span>
                          {p.age}y
                          <span className="mx-1">&middot;</span>
                          {p.pos}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="num text-[13px] font-semibold">{fmtVal(p.val)}</div>
                        <Delta value={p.dWeek} />
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[13px] font-semibold flex items-center gap-1.5">
                <Bookmark size={13} /> My watchlist
              </h3>
              <Link href="/watchlist">
                <Button kind="quiet" size="sm">Edit</Button>
              </Link>
            </div>
            <div className="space-y-2">
              {MOVERS.map((p) => (
                <div key={p.name} className="flex items-center gap-2 py-1.5">
                  <Avatar name={p.name} clubBg={p.clubBg} clubColor={p.clubColor} size={24} />
                  <span className="text-[12px] flex-1 truncate">{p.name}</span>
                  <Delta value={p.dWeek} />
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5 border-acc/20">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={14} className="text-acc" />
              <span className="text-[11px] text-acc font-semibold uppercase tracking-wider">AI Coach</span>
            </div>
            <p className="text-[13px] text-mute leading-relaxed mb-3">
              Ask anything about players, transfers, or tactics.
            </p>
            <Link href="/coach">
              <Button kind="primary" size="sm" className="w-full" icon={<ArrowRight size={12} />}>
                Open Coach
              </Button>
            </Link>
          </Card>

          <Card className="p-5">
            <h3 className="text-[13px] font-semibold mb-2">World Cup 2026</h3>
            <div className="display text-[28px] num text-acc">16</div>
            <div className="text-[11px] text-mute-soft">days to kickoff</div>
            <Link href="/worldcup" className="block mt-3">
              <Button kind="outline" size="sm" className="w-full">Explore tournament</Button>
            </Link>
          </Card>

          <Card className="p-5">
            <h3 className="text-[13px] font-semibold flex items-center gap-1.5 mb-3">
              <MessageCircle size={13} /> Trending threads
            </h3>
            <div className="space-y-3">
              {[
                { title: "Is Yamal already the best teenager ever?", replies: 284 },
                { title: "World Cup dark horse predictions", replies: 156 },
                { title: "Underrated CBs in Serie A", replies: 67 },
              ].map((t) => (
                <Link key={t.title} href="/community">
                  <div className="hover:bg-white/[0.03] -mx-2 px-2 py-1 rounded transition">
                    <div className="text-[12px] leading-snug">{t.title}</div>
                    <div className="text-[10px] text-mute-soft num mt-0.5">{t.replies} replies</div>
                  </div>
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
