"use client";

import { useState } from "react";
import Link from "next/link";
import { MessageCircle, TrendingUp, Award, ArrowUp } from "lucide-react";
import { Card, SectionHead, Tabs, Button, Chip } from "@/components/ui";

const THREADS = [
  { id: "1", title: "Is Yamal already better than Messi was at 17?", author: "@xG_Pedro", replies: 284, upvotes: 1842, tags: ["La Liga", "Wonderkid"], time: "2h ago", pinned: true },
  { id: "2", title: "Underrated CBs in Serie A — my watchlist for summer", author: "@ScoutVision", replies: 67, upvotes: 423, tags: ["Serie A", "Scouting"], time: "4h ago" },
  { id: "3", title: "World Cup 2026 dark horse predictions thread", author: "@TacticsBoard", replies: 156, upvotes: 891, tags: ["World Cup"], time: "6h ago" },
  { id: "4", title: "Wirtz to Real Madrid confirmed — was he undervalued?", author: "@ValuationNerd", replies: 342, upvotes: 2100, tags: ["Transfer", "Bundesliga"], time: "8h ago" },
  { id: "5", title: "Palmer vs Saka vs Wirtz — who's worth most by 2028?", author: "@FutureValue", replies: 198, upvotes: 1250, tags: ["Premier League", "Valuation"], time: "12h ago" },
  { id: "6", title: "Gyökeres: genuine €100M player or Sporting tax?", author: "@DataScout", replies: 89, upvotes: 567, tags: ["Liga Portugal", "Valuation"], time: "1d ago" },
  { id: "7", title: "The biggest market value drops of 2026 so far", author: "@MarketWatch", replies: 45, upvotes: 312, tags: ["Analysis"], time: "1d ago" },
  { id: "8", title: "Free agent XI — best squad you could sign for €0", author: "@SquadBuilder", replies: 234, upvotes: 1890, tags: ["Transfers", "Fun"], time: "2d ago" },
];

export default function CommunityPage() {
  const [tab, setTab] = useState("trending");

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-8">
      <div className="flex items-end justify-between mb-7 flex-wrap gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-mute-soft mb-2 num">Community</div>
          <h1 className="display text-[clamp(28px,4vw,40px)] leading-[1] tracking-[-0.04em]">
            The floor is <span className="font-serif italic text-acc">open.</span>
          </h1>
        </div>
        <Button kind="primary" icon={<MessageCircle size={14} />}>New thread</Button>
      </div>

      <div className="grid lg:grid-cols-[1fr_300px] gap-6">
        <div>
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { id: "trending", label: "Trending" },
              { id: "new", label: "New" },
              { id: "top", label: "Top" },
            ]}
          />
          <div className="mt-4 space-y-2">
            {THREADS.map((t) => (
              <Link key={t.id} href={`/community/${t.id}`}>
                <Card className="p-4 hover:bg-ink-800 transition cursor-pointer">
                  <div className="flex items-start gap-4">
                    <div className="flex flex-col items-center gap-0.5 min-w-[40px]">
                      <ArrowUp size={14} className="text-mute" />
                      <span className="num text-[12px] font-semibold">{t.upvotes > 1000 ? `${(t.upvotes/1000).toFixed(1)}k` : t.upvotes}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {t.pinned && <Chip tone="acc">Pinned</Chip>}
                        <h3 className="text-[14px] font-semibold leading-snug">{t.title}</h3>
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-[11px] text-mute">
                        <span>{t.author}</span>
                        <span className="num">{t.replies} replies</span>
                        <span className="num">{t.time}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-2">
                        {t.tags.map((tag) => (
                          <Chip key={tag} tone="neutral">{tag}</Chip>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="text-[13px] font-semibold flex items-center gap-1.5 mb-3">
              <Award size={13} className="text-acc" /> Reputation leaders
            </h3>
            <div className="space-y-2.5">
              {[
                { name: "@xG_Pedro", score: 12840, badge: "Verified Scout" },
                { name: "@ValuationNerd", score: 9420, badge: "Top Contributor" },
                { name: "@ScoutVision", score: 7650, badge: "Rising Star" },
                { name: "@TacticsBoard", score: 6200, badge: "Analyst" },
                { name: "@FutureValue", score: 4890, badge: "Predictor" },
              ].map((u, i) => (
                <div key={u.name} className="flex items-center gap-3">
                  <span className="num text-[11px] text-mute-soft w-4">{i + 1}</span>
                  <div className="w-7 h-7 rounded-full bg-ink-700 grid place-items-center text-[9px] font-bold">
                    {u.name.slice(1, 3).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-medium truncate">{u.name}</div>
                    <div className="text-[10px] text-mute">{u.badge}</div>
                  </div>
                  <span className="num text-[11px] text-acc">{(u.score/1000).toFixed(1)}k</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-[13px] font-semibold mb-3">Hot topics</h3>
            <div className="flex flex-wrap gap-1.5">
              {["World Cup 2026", "Summer Window", "Yamal", "Wirtz", "Free Agents", "Serie A", "Wonderkids", "AI Predictions"].map((t) => (
                <Chip key={t} tone="solid">{t}</Chip>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
