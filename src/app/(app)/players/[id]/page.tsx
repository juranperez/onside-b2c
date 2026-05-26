"use client";

import { useState } from "react";
import { use } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bookmark,
  Share2,
  TrendingUp,
  Shield,
  Sparkles,
  Lock,
  Calendar,
  Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fmtVal, fmtDelta } from "@/lib/utils";
import { Button, Card, Tabs, Avatar, Delta, Chip, SectionHead } from "@/components/ui";

const PLAYER_DATA: Record<string, {
  name: string; first: string; last: string; pos: string; age: number;
  nationality: string; flag: string; club: string; clubShort: string;
  clubBg: string; clubColor: string; league: string; val: number;
  dWeek: number; dMonth: number; peak: number; foot: string;
  contract: string; salary: string; shirt: number; height: string;
  bio: string; tags: string[];
  series: { m: string; v: number }[];
  form: { opp: string; result: string; rating: number }[];
  attrs: { label: string; value: number }[];
  annotations: { month: string; text: string }[];
}> = {
  bellingham: {
    name: "Jude Bellingham", first: "Jude", last: "Bellingham", pos: "CM", age: 22,
    nationality: "England", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", club: "Real Madrid", clubShort: "RMA",
    clubBg: "#FEBE10", clubColor: "#00529F", league: "La Liga", val: 131.4,
    dWeek: 2.1, dMonth: 6.8, peak: 142.0, foot: "Right", contract: "Jun 2029",
    salary: "€290K/wk", shirt: 5, height: "186cm",
    bio: "England international and Real Madrid midfielder. Broke through at Birmingham City aged 16, became a Bundesliga sensation at Dortmund, then signed for Real Madrid where he won La Liga and the Champions League in his debut season.",
    tags: ["Wonderkid", "Box-to-box", "Big-game player"],
    series: [
      { m: "Jun 24", v: 118.0 }, { m: "Jul 24", v: 120.5 }, { m: "Aug 24", v: 124.0 },
      { m: "Sep 24", v: 126.2 }, { m: "Oct 24", v: 122.8 }, { m: "Nov 24", v: 128.0 },
      { m: "Dec 24", v: 130.5 }, { m: "Jan 25", v: 135.0 }, { m: "Feb 25", v: 138.4 },
      { m: "Mar 25", v: 142.0 }, { m: "Apr 25", v: 136.2 }, { m: "May 25", v: 131.4 },
    ],
    form: [
      { opp: "Villarreal", result: "W 3-1", rating: 8.2 },
      { opp: "Sevilla", result: "D 1-1", rating: 6.8 },
      { opp: "Man City", result: "W 3-2", rating: 9.1 },
      { opp: "Atletico", result: "L 0-1", rating: 5.9 },
      { opp: "Girona", result: "W 4-0", rating: 7.4 },
      { opp: "Napoli", result: "W 2-1", rating: 8.5 },
      { opp: "Valencia", result: "W 2-0", rating: 7.1 },
      { opp: "Barcelona", result: "D 2-2", rating: 7.8 },
      { opp: "Bayern", result: "W 1-0", rating: 8.8 },
      { opp: "Betis", result: "W 3-1", rating: 7.6 },
    ],
    attrs: [
      { label: "Pace", value: 78 }, { label: "Shooting", value: 82 },
      { label: "Passing", value: 85 }, { label: "Dribbling", value: 83 },
      { label: "Defending", value: 72 }, { label: "Physical", value: 80 },
      { label: "Vision", value: 86 }, { label: "Composure", value: 88 },
    ],
    annotations: [
      { month: "Mar 25", text: "Peak valuation €142M after UCL quarter-final brace" },
      { month: "Oct 24", text: "Minor dip during ankle injury layoff" },
    ],
  },
  yamal: {
    name: "Lamine Yamal", first: "Lamine", last: "Yamal", pos: "RW", age: 17,
    nationality: "Spain", flag: "🇪🇸", club: "Barcelona", clubShort: "BAR",
    clubBg: "#A50044", clubColor: "#EDBB00", league: "La Liga", val: 215.0,
    dWeek: 9.3, dMonth: 18.6, peak: 215.0, foot: "Left", contract: "Jun 2030",
    salary: "€180K/wk", shirt: 19, height: "180cm",
    bio: "The youngest player ever to score at a European Championship. Barcelona academy graduate who became a first-team regular at 16, setting records in La Liga and the Champions League.",
    tags: ["Wonderkid", "Generational", "Record-breaker"],
    series: [
      { m: "Jun 24", v: 120.0 }, { m: "Jul 24", v: 135.0 }, { m: "Aug 24", v: 142.0 },
      { m: "Sep 24", v: 155.0 }, { m: "Oct 24", v: 162.0 }, { m: "Nov 24", v: 168.0 },
      { m: "Dec 24", v: 175.0 }, { m: "Jan 25", v: 182.0 }, { m: "Feb 25", v: 192.0 },
      { m: "Mar 25", v: 198.0 }, { m: "Apr 25", v: 205.7 }, { m: "May 25", v: 215.0 },
    ],
    form: [
      { opp: "Real Madrid", result: "W 2-1", rating: 9.2 },
      { opp: "Sevilla", result: "W 4-0", rating: 8.5 },
      { opp: "PSG", result: "W 3-1", rating: 9.4 },
      { opp: "Atletico", result: "D 1-1", rating: 7.2 },
      { opp: "Villarreal", result: "W 3-0", rating: 8.1 },
      { opp: "Inter", result: "W 2-0", rating: 8.8 },
      { opp: "Valencia", result: "W 5-1", rating: 9.0 },
      { opp: "Girona", result: "W 2-1", rating: 7.5 },
      { opp: "Dortmund", result: "D 1-1", rating: 7.8 },
      { opp: "Betis", result: "W 3-0", rating: 8.3 },
    ],
    attrs: [
      { label: "Pace", value: 92 }, { label: "Shooting", value: 78 },
      { label: "Passing", value: 84 }, { label: "Dribbling", value: 93 },
      { label: "Defending", value: 34 }, { label: "Physical", value: 58 },
      { label: "Vision", value: 88 }, { label: "Composure", value: 82 },
    ],
    annotations: [
      { month: "May 25", text: "New all-time high €215M after UCL semi hat-trick" },
      { month: "Jul 24", text: "Euro 2024 breakout: youngest ever tournament scorer" },
    ],
  },
};

export default function PlayerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const player = PLAYER_DATA[id];
  const [activeTab, setActiveTab] = useState("overview");

  if (!player) {
    return (
      <div className="max-w-[1440px] mx-auto px-6 py-20 text-center">
        <h1 className="display text-[32px] mb-4">Player not found</h1>
        <p className="text-mute mb-6">This player profile hasn&apos;t been created yet in the mock data.</p>
        <Link href="/players">
          <Button kind="primary">Browse all players</Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-line">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: `linear-gradient(135deg, ${player.clubBg}40 0%, transparent 60%)` }}
        />
        <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />

        <div className="max-w-[1440px] mx-auto px-6 py-10 relative">
          <div className="flex items-start justify-between gap-8 flex-wrap">
            <div className="flex items-start gap-6">
              <Avatar name={player.name} clubBg={player.clubBg} clubColor={player.clubColor} size={80} ring />
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[12px] text-mute">{player.flag} {player.nationality}</span>
                  <span className="text-mute-soft">&middot;</span>
                  <span className="text-[12px] text-mute">{player.pos}</span>
                  <span className="text-mute-soft">&middot;</span>
                  <span className="text-[12px] text-mute num">#{player.shirt}</span>
                </div>
                <h1 className="display text-[clamp(28px,4vw,48px)] tracking-tight leading-[1.05]">
                  <span className="font-serif italic font-normal">{player.first}</span>{" "}
                  {player.last}
                </h1>
                <div className="flex items-center gap-2 mt-2 text-[13px] text-mute">
                  <div
                    className="w-5 h-5 rounded-[4px] grid place-items-center text-[8px] font-bold num"
                    style={{ background: player.clubBg, color: player.clubColor }}
                  >
                    {player.clubShort.slice(0, 2)}
                  </div>
                  {player.club} &middot; {player.league}
                </div>
                <div className="flex items-center gap-2 mt-3">
                  {player.tags.map((t) => (
                    <Chip key={t} tone="neutral">{t}</Chip>
                  ))}
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-[10px] uppercase tracking-[0.18em] text-mute-soft mb-1">
                ONSIDE Valuation
              </div>
              <div className="display text-[52px] leading-none num">
                {fmtVal(player.val)}
              </div>
              <div className="mt-2 flex items-center justify-end gap-3">
                <Delta value={player.dWeek} big />
                <span className="text-mute text-[11px]">this week</span>
              </div>
              <div className="mt-4 flex items-center gap-2 justify-end">
                <Button kind="ghost" size="sm" icon={<Bookmark size={13} />}>Watch</Button>
                <Button kind="ghost" size="sm" icon={<Share2 size={13} />}>Share</Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="border-b border-line bg-ink-900/50">
        <div className="max-w-[1440px] mx-auto px-6">
          <Tabs
            value={activeTab}
            onChange={setActiveTab}
            tabs={[
              { id: "overview", label: "Overview" },
              { id: "stats", label: "Stats" },
              { id: "career", label: "Career" },
              { id: "discussion", label: "Discussion" },
              { id: "news", label: "News" },
              { id: "similar", label: "Similar" },
            ]}
          />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1440px] mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-[1fr_340px] gap-6">
          {/* Main */}
          <div className="space-y-6">
            {/* Valuation chart */}
            <Card className="p-6">
              <SectionHead eyebrow="12-month history" title="Valuation trajectory" />
              <div className="h-[200px] flex items-end gap-1">
                {player.series.map((point, i) => {
                  const maxVal = Math.max(...player.series.map((s) => s.v));
                  const minVal = Math.min(...player.series.map((s) => s.v));
                  const range = maxVal - minVal || 1;
                  const height = ((point.v - minVal) / range) * 160 + 20;
                  const isLast = i === player.series.length - 1;
                  return (
                    <div key={point.m} className="flex-1 flex flex-col items-center gap-1">
                      <span className={cn("num text-[9px]", isLast ? "text-up font-semibold" : "text-mute-soft")}>
                        {point.v.toFixed(0)}
                      </span>
                      <div
                        className={cn("w-full rounded-t-sm transition-all", isLast ? "bg-up" : "bg-ink-700")}
                        style={{ height }}
                      />
                      <span className="num text-[8px] text-mute-soft">{point.m.slice(0, 3)}</span>
                    </div>
                  );
                })}
              </div>
              {player.annotations.length > 0 && (
                <div className="mt-4 space-y-2">
                  {player.annotations.map((a) => (
                    <div key={a.month} className="flex items-start gap-2 text-[11px]">
                      <span className="num text-mute-soft shrink-0 w-14">{a.month}</span>
                      <span className="text-mute">{a.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Form ribbon */}
            <Card className="p-6">
              <SectionHead eyebrow="Last 10 matches" title="Form" />
              <div className="grid grid-cols-10 gap-1">
                {player.form.map((f, i) => {
                  const color =
                    f.rating >= 8 ? "bg-up" : f.rating >= 7 ? "bg-up/60" : f.rating >= 6 ? "bg-ink-600" : "bg-down/60";
                  return (
                    <div key={i} className="text-center">
                      <div className={cn("rounded-lg py-3 mb-1", color)}>
                        <div className="num text-[14px] font-bold">{f.rating.toFixed(1)}</div>
                      </div>
                      <div className="text-[9px] text-mute truncate">{f.opp}</div>
                      <div className={cn("text-[8px] num", f.result[0] === "W" ? "text-up" : f.result[0] === "L" ? "text-down" : "text-mute")}>
                        {f.result}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Attributes */}
            <Card className="p-6">
              <SectionHead eyebrow="Ability" title="Strengths" />
              <div className="grid grid-cols-2 gap-3">
                {player.attrs.map((attr) => (
                  <div key={attr.label} className="flex items-center gap-3">
                    <span className="text-[12px] text-mute w-20">{attr.label}</span>
                    <div className="flex-1 h-2 bg-ink-700 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          attr.value >= 85 ? "bg-up" : attr.value >= 70 ? "bg-acc" : attr.value >= 50 ? "bg-mute" : "bg-down"
                        )}
                        style={{ width: `${attr.value}%` }}
                      />
                    </div>
                    <span className="num text-[12px] font-semibold w-8 text-right">{attr.value}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Predicted transfers */}
            <Card className="p-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-ink-850/80 backdrop-blur-sm z-10 grid place-items-center">
                <div className="text-center">
                  <span className="inline-flex items-center gap-1 rounded-full bg-acc/10 text-acc border border-acc/30 px-3 py-1 text-[11px] font-semibold mb-3">
                    <Lock size={11} /> Pro Feature
                  </span>
                  <div className="text-[15px] font-semibold">Predicted transfers</div>
                  <div className="text-[12px] text-mute mt-1">Upgrade to Pro to see transfer predictions</div>
                </div>
              </div>
              <SectionHead eyebrow="ML model" title="Predicted transfers" />
              <div className="space-y-3 opacity-30">
                {["Barcelona (stay)", "Manchester City", "Bayern Munich"].map((dest) => (
                  <div key={dest} className="p-3 rounded-xl bg-ink-800 border border-line">
                    <div className="text-[13px] font-medium">{dest}</div>
                    <div className="h-2 bg-ink-700 rounded-full mt-2 w-3/4" />
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <Card className="p-5">
              <h3 className="text-[13px] font-semibold mb-3">Key facts</h3>
              <div className="space-y-2.5 text-[12px]">
                {[
                  ["Age", `${player.age} years`],
                  ["Position", player.pos],
                  ["Foot", player.foot],
                  ["Height", player.height],
                  ["Nationality", `${player.flag} ${player.nationality}`],
                  ["Contract", player.contract],
                  ["Salary", player.salary],
                  ["Peak value", fmtVal(player.peak)],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-mute">{label}</span>
                    <span className="num font-medium">{value}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="text-[13px] font-semibold mb-2">About</h3>
              <p className="text-[12px] text-mute leading-relaxed">{player.bio}</p>
            </Card>

            <Card className="p-5">
              <h3 className="text-[13px] font-semibold mb-3">Quick compare</h3>
              <Link href="/compare">
                <Button kind="ghost" size="sm" className="w-full" icon={<ArrowRight size={12} />}>
                  Compare with another player
                </Button>
              </Link>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
