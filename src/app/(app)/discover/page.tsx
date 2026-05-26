"use client";

import Link from "next/link";
import { ArrowRight, TrendingUp, Sparkles, MessageCircle, Bookmark } from "lucide-react";
import { Button, Card, SectionHead, Avatar, Delta, Chip, LiveDot } from "@/components/ui";
import { fmtVal } from "@/lib/utils";

const MOVERS = [
  { name: "Viktor Gyökeres", club: "Sporting CP", pos: "ST", age: 27, val: 82.0, dWeek: 11.2, clubBg: "#009A44", clubColor: "#fff" },
  { name: "Lamine Yamal", club: "Barcelona", pos: "RW", age: 17, val: 215.0, dWeek: 9.3, clubBg: "#A50044", clubColor: "#EDBB00" },
  { name: "Cole Palmer", club: "Chelsea", pos: "AM", age: 23, val: 128.0, dWeek: 8.4, clubBg: "#034694", clubColor: "#DBA111" },
  { name: "Florian Wirtz", club: "Bayer Leverkusen", pos: "AM", age: 22, val: 140.5, dWeek: 6.8, clubBg: "#E32221", clubColor: "#000" },
  { name: "Bukayo Saka", club: "Arsenal", pos: "RW", age: 23, val: 142.0, dWeek: 5.6, clubBg: "#EF0107", clubColor: "#fff" },
];

const NEWS = [
  { title: "Yamal breaks La Liga assist record at 17", source: "ONSIDE Intel", time: "2h ago", tag: "La Liga" },
  { title: "PSG eyeing €80M bid for Wirtz", source: "Transfer Watch", time: "4h ago", tag: "Rumor" },
  { title: "Haaland signs extension through 2030", source: "Official", time: "6h ago", tag: "Premier League" },
  { title: "World Cup 2026 squad values: who's richest?", source: "ONSIDE Analysis", time: "8h ago", tag: "World Cup" },
];

const THREADS = [
  { title: "Is Yamal already the best teenager ever?", replies: 284, upvotes: 1842, author: "@xG_Pedro" },
  { title: "Underrated CBs in Serie A — my watchlist", replies: 67, upvotes: 423, author: "@ScoutVision" },
  { title: "World Cup 2026 dark horse predictions", replies: 156, upvotes: 891, author: "@TacticsBoard" },
];

export default function DiscoverPage() {
  return (
    <div className="max-w-[1440px] mx-auto px-6 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <LiveDot />
          <span className="text-[11px] text-mute num">
            {new Date().toLocaleDateString("en-GB", { weekday: "long", month: "long", day: "numeric" })}
          </span>
        </div>
        <h1 className="display text-[32px] tracking-tight">
          Good evening, <span className="font-serif italic text-acc">scout</span>.
        </h1>
      </div>

      <div className="grid lg:grid-cols-[1fr_340px] gap-6">
        <div className="space-y-6">
          {/* Big movers strip */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-up" />
                <span className="display text-[18px]">Biggest movers</span>
              </div>
              <Link href="/players">
                <Button kind="quiet" size="sm" icon={<ArrowRight size={12} />}>See all</Button>
              </Link>
            </div>
            <div className="divide-y divide-line">
              {MOVERS.map((p) => (
                <Link key={p.name} href="/players/yamal" className="block">
                  <div className="flex items-center gap-3 py-2.5 hover:bg-white/[0.02] transition">
                    <Avatar name={p.name} clubBg={p.clubBg} clubColor={p.clubColor} size={36} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13.5px] font-semibold truncate">{p.name}</div>
                      <div className="text-[11px] text-mute truncate">{p.club} &middot; {p.pos}</div>
                    </div>
                    <div className="text-right">
                      <div className="num text-[13px] font-semibold">{fmtVal(p.val)}</div>
                      <Delta value={p.dWeek} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </Card>

          {/* Players you should know */}
          <SectionHead eyebrow="AI picks" title="Players you should know" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {MOVERS.slice(0, 3).map((p) => (
              <Link key={p.name} href="/players/yamal">
                <Card className="p-4 hover:bg-ink-800 transition cursor-pointer">
                  <Avatar name={p.name} clubBg={p.clubBg} clubColor={p.clubColor} size={40} />
                  <div className="mt-3 text-[14px] font-semibold">{p.name}</div>
                  <div className="text-[11px] text-mute mt-0.5">{p.club}</div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="num text-[15px] font-bold">{fmtVal(p.val)}</span>
                    <Delta value={p.dWeek} />
                  </div>
                </Card>
              </Link>
            ))}
          </div>

          {/* News & rumors */}
          <SectionHead
            eyebrow="Feed"
            title="News & rumors"
            action={<Button kind="quiet" size="sm">See all</Button>}
          />
          <div className="space-y-2">
            {NEWS.map((item) => (
              <Card key={item.title} className="p-4 hover:bg-ink-800 transition cursor-pointer">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-[14px] font-medium leading-snug">{item.title}</div>
                    <div className="flex items-center gap-2 mt-1.5 text-[11px] text-mute">
                      <span>{item.source}</span>
                      <span className="text-mute-soft">&middot;</span>
                      <span className="num">{item.time}</span>
                    </div>
                  </div>
                  <Chip tone={item.tag === "Rumor" ? "acc" : "neutral"}>{item.tag}</Chip>
                </div>
              </Card>
            ))}
          </div>

          {/* Trending threads */}
          <SectionHead
            eyebrow="Community"
            title="Trending threads"
            action={
              <Link href="/community">
                <Button kind="outline" size="sm" icon={<ArrowRight size={12} />}>All threads</Button>
              </Link>
            }
          />
          <div className="space-y-2">
            {THREADS.map((t) => (
              <Link key={t.title} href="/community">
                <Card className="p-4 hover:bg-ink-800 transition cursor-pointer">
                  <div className="text-[14px] font-medium leading-snug">{t.title}</div>
                  <div className="flex items-center gap-3 mt-2 text-[11px] text-mute">
                    <span>{t.author}</span>
                    <span className="num">{t.replies} replies</span>
                    <span className="num">{t.upvotes} upvotes</span>
                  </div>
                </Card>
              </Link>
            ))}
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
              {MOVERS.slice(0, 4).map((p) => (
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
        </div>
      </div>
    </div>
  );
}
