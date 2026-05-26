"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Clock, DollarSign, TrendingUp } from "lucide-react";
import { Card, SectionHead, Tabs, Button, Delta, Chip } from "@/components/ui";
import { fmtVal } from "@/lib/utils";

const CONFIRMED = [
  { player: "Florian Wirtz", from: "Bayer Leverkusen", to: "Real Madrid", fee: 130, date: "Jun 2, 2026" },
  { player: "Alexander Isak", from: "Newcastle United", to: "Barcelona", fee: 95, date: "May 28, 2026" },
  { player: "Khvicha Kvaratskhelia", from: "Napoli", to: "PSG", fee: 82, date: "May 25, 2026" },
  { player: "Nico Williams", from: "Athletic Bilbao", to: "Chelsea", fee: 70, date: "May 22, 2026" },
  { player: "Amadou Onana", from: "Aston Villa", to: "Bayern Munich", fee: 55, date: "May 20, 2026" },
];

const RUMORS = [
  { player: "Viktor Gyökeres", from: "Sporting CP", to: "Manchester City", fee: 85, confidence: 72 },
  { player: "Xavi Simons", from: "PSG", to: "Bayern Munich", fee: 90, confidence: 55 },
  { player: "Désiré Doué", from: "PSG", to: "Liverpool", fee: 65, confidence: 40 },
  { player: "Jonathan David", from: "Lille", to: "Arsenal", fee: 45, confidence: 65 },
  { player: "Randal Kolo Muani", from: "PSG", to: "Juventus", fee: 40, confidence: 80 },
];

const SPEND_BY_LEAGUE = [
  { league: "Premier League", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", spend: 890, sales: 420 },
  { league: "La Liga", flag: "🇪🇸", spend: 520, sales: 380 },
  { league: "Bundesliga", flag: "🇩🇪", spend: 340, sales: 290 },
  { league: "Serie A", flag: "🇮🇹", spend: 280, sales: 310 },
  { league: "Ligue 1", flag: "🇫🇷", spend: 180, sales: 420 },
];

export default function TransfersPage() {
  const [tab, setTab] = useState("confirmed");

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-8">
      <div className="flex items-end justify-between mb-7 flex-wrap gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-mute-soft mb-2 num">Transfer window</div>
          <h1 className="display text-[clamp(28px,4vw,40px)] leading-[1] tracking-[-0.04em]">
            Summer <span className="num">2026</span>.{" "}
            <span className="font-serif italic text-acc">The board.</span>
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="num text-[11px] text-mute-soft">Window closes in</div>
            <div className="display text-[24px] num text-acc">42 days</div>
          </div>
          <Link href="/transfers/free-agents">
            <Button kind="outline" size="sm" icon={<ArrowRight size={12} />}>Free agents</Button>
          </Link>
        </div>
      </div>

      {/* Spend overview */}
      <div className="grid grid-cols-3 md:grid-cols-5 gap-2 mb-8">
        {SPEND_BY_LEAGUE.map((l) => (
          <Card key={l.league} className="p-4 text-center">
            <span className="text-2xl">{l.flag}</span>
            <div className="text-[11px] text-mute mt-1 truncate">{l.league}</div>
            <div className="num text-[16px] font-bold mt-1 text-down">{fmtVal(l.spend)}</div>
            <div className="text-[10px] text-mute-soft num">spent</div>
            <div className="num text-[12px] text-up mt-0.5">{fmtVal(l.sales)}</div>
            <div className="text-[10px] text-mute-soft num">sold</div>
          </Card>
        ))}
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "confirmed", label: "Confirmed", count: CONFIRMED.length },
          { id: "rumors", label: "Rumors", count: RUMORS.length },
        ]}
      />

      <div className="mt-4">
        {tab === "confirmed" && (
          <Card className="overflow-hidden">
            <div className="grid grid-cols-[1.2fr_1fr_1fr_80px_100px] px-4 py-3 text-[10px] uppercase tracking-wider text-mute-soft num border-b border-line bg-ink-900">
              <span>Player</span><span>From</span><span>To</span><span className="text-right">Fee</span><span className="text-right">Date</span>
            </div>
            {CONFIRMED.map((t) => (
              <div key={t.player} className="grid grid-cols-[1.2fr_1fr_1fr_80px_100px] px-4 py-3 items-center border-b border-line last:border-0 hover:bg-white/[0.03] transition">
                <span className="text-[13px] font-semibold">{t.player}</span>
                <span className="text-[12px] text-mute">{t.from}</span>
                <span className="text-[12px]">{t.to}</span>
                <span className="num text-[13px] font-semibold text-right">{fmtVal(t.fee)}</span>
                <span className="num text-[11px] text-mute text-right">{t.date}</span>
              </div>
            ))}
          </Card>
        )}

        {tab === "rumors" && (
          <Card className="overflow-hidden">
            <div className="grid grid-cols-[1.2fr_1fr_1fr_80px_100px] px-4 py-3 text-[10px] uppercase tracking-wider text-mute-soft num border-b border-line bg-ink-900">
              <span>Player</span><span>From</span><span>To</span><span className="text-right">Est. Fee</span><span className="text-right">Confidence</span>
            </div>
            {RUMORS.map((t) => (
              <div key={t.player} className="grid grid-cols-[1.2fr_1fr_1fr_80px_100px] px-4 py-3 items-center border-b border-line last:border-0 hover:bg-white/[0.03] transition">
                <span className="text-[13px] font-semibold">{t.player}</span>
                <span className="text-[12px] text-mute">{t.from}</span>
                <span className="text-[12px]">{t.to}</span>
                <span className="num text-[13px] font-semibold text-right">{fmtVal(t.fee)}</span>
                <div className="flex items-center justify-end gap-1.5">
                  <div className="w-12 h-1.5 bg-ink-700 rounded-full overflow-hidden">
                    <div className="h-full bg-acc rounded-full" style={{ width: `${t.confidence}%` }} />
                  </div>
                  <span className="num text-[11px] text-mute">{t.confidence}%</span>
                </div>
              </div>
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}
