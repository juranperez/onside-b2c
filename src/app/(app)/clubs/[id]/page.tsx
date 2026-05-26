"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, TrendingUp, Users, Trophy, Calendar } from "lucide-react";
import { Card, SectionHead, Button, Avatar, Delta, Chip } from "@/components/ui";
import { fmtVal } from "@/lib/utils";

const CLUB = {
  name: "FC Barcelona",
  slug: "barcelona",
  short: "BAR",
  league: "La Liga",
  country: "Spain",
  bg: "#A50044",
  color: "#EDBB00",
  founded: 1899,
  stadium: "Spotify Camp Nou",
  capacity: "99,354",
  manager: "Hansi Flick",
  squadVal: 1420,
  avgAge: 24.8,
  rank: 2,
};

const SQUAD = [
  { name: "Lamine Yamal", pos: "RW", age: 17, val: 215.0, dWeek: 9.3, clubBg: "#A50044", clubColor: "#EDBB00" },
  { name: "Pedri", pos: "CM", age: 23, val: 98.0, dWeek: 3.2, clubBg: "#A50044", clubColor: "#EDBB00" },
  { name: "Gavi", pos: "CM", age: 21, val: 82.0, dWeek: 4.1, clubBg: "#A50044", clubColor: "#EDBB00" },
  { name: "Ronald Araújo", pos: "CB", age: 26, val: 68.0, dWeek: -1.2, clubBg: "#A50044", clubColor: "#EDBB00" },
  { name: "Raphinha", pos: "LW", age: 29, val: 72.0, dWeek: 2.8, clubBg: "#A50044", clubColor: "#EDBB00" },
  { name: "Fermín López", pos: "AM", age: 22, val: 58.0, dWeek: 5.4, clubBg: "#A50044", clubColor: "#EDBB00" },
  { name: "Pau Cubarsí", pos: "CB", age: 18, val: 65.0, dWeek: 6.1, clubBg: "#A50044", clubColor: "#EDBB00" },
  { name: "Marc-André ter Stegen", pos: "GK", age: 34, val: 22.0, dWeek: -0.5, clubBg: "#A50044", clubColor: "#EDBB00" },
];

const TRANSFERS_IN = [
  { name: "Nico Williams", from: "Athletic Club", fee: "€58M", date: "Jul 2025" },
  { name: "Jonathan David", from: "Lille", fee: "Free", date: "Jul 2025" },
];

const TRANSFERS_OUT = [
  { name: "Frenkie de Jong", to: "Manchester United", fee: "€65M", date: "Jul 2025" },
];

export default function ClubProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-8">
      <Link href="/clubs" className="inline-flex items-center gap-1.5 text-[13px] text-mute hover:text-white transition mb-6">
        <ArrowLeft size={14} /> All clubs
      </Link>

      {/* Club header */}
      <div className="flex items-center gap-5 mb-8">
        <div className="w-20 h-20 rounded-2xl grid place-items-center text-[28px] font-bold" style={{ background: CLUB.bg, color: CLUB.color }}>
          {CLUB.short}
        </div>
        <div>
          <h1 className="display text-[clamp(28px,4vw,40px)] tracking-tight">{CLUB.name}</h1>
          <div className="flex items-center gap-3 mt-1 text-[13px] text-mute">
            <span>{CLUB.league}</span>
            <span className="w-1 h-1 rounded-full bg-line" />
            <span>{CLUB.country}</span>
            <span className="w-1 h-1 rounded-full bg-line" />
            <span>Est. {CLUB.founded}</span>
          </div>
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
        {[
          { label: "Squad value", value: `€${CLUB.squadVal}M` },
          { label: "Avg age", value: CLUB.avgAge.toString() },
          { label: "Manager", value: CLUB.manager },
          { label: "Stadium", value: CLUB.stadium },
          { label: "Global rank", value: `#${CLUB.rank}` },
        ].map((m) => (
          <Card key={m.label} className="p-4">
            <div className="text-[10px] text-mute-soft uppercase tracking-wider">{m.label}</div>
            <div className="text-[16px] font-semibold mt-1 truncate">{m.value}</div>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        {/* Squad table */}
        <div>
          <Card className="overflow-hidden">
            <div className="px-5 py-3 border-b border-line">
              <SectionHead eyebrow="Roster" title="First team squad" />
            </div>
            <div className="grid grid-cols-[1.5fr_60px_50px_90px_80px] px-4 py-2.5 text-[10px] uppercase tracking-wider text-mute-soft num border-b border-line bg-ink-900">
              <span>Player</span><span>Pos</span><span>Age</span>
              <span className="text-right">Value</span><span className="text-right">Week</span>
            </div>
            {SQUAD.map((p) => (
              <Link key={p.name} href="/players/yamal">
                <div className="grid grid-cols-[1.5fr_60px_50px_90px_80px] px-4 py-3 items-center hover:bg-white/[0.03] transition border-b border-line last:border-0 cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Avatar name={p.name} clubBg={p.clubBg} clubColor={p.clubColor} size={28} />
                    <span className="text-[13px] font-medium truncate">{p.name}</span>
                  </div>
                  <span className="num text-[12px] text-mute">{p.pos}</span>
                  <span className="num text-[12px] text-mute">{p.age}</span>
                  <span className="num text-[13px] text-right font-semibold">{fmtVal(p.val)}</span>
                  <span className="text-right"><Delta value={p.dWeek} /></span>
                </div>
              </Link>
            ))}
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="text-[13px] font-semibold flex items-center gap-1.5 mb-3">
              <TrendingUp size={13} /> Transfers in
            </h3>
            <div className="space-y-3">
              {TRANSFERS_IN.map((t) => (
                <div key={t.name} className="flex items-center justify-between">
                  <div>
                    <div className="text-[13px] font-medium">{t.name}</div>
                    <div className="text-[11px] text-mute">From {t.from}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[12px] font-semibold text-up">{t.fee}</div>
                    <div className="text-[10px] text-mute-soft num">{t.date}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-[13px] font-semibold flex items-center gap-1.5 mb-3">
              <Users size={13} /> Transfers out
            </h3>
            <div className="space-y-3">
              {TRANSFERS_OUT.map((t) => (
                <div key={t.name} className="flex items-center justify-between">
                  <div>
                    <div className="text-[13px] font-medium">{t.name}</div>
                    <div className="text-[11px] text-mute">To {t.to}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[12px] font-semibold text-down">{t.fee}</div>
                    <div className="text-[10px] text-mute-soft num">{t.date}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-[13px] font-semibold flex items-center gap-1.5 mb-3">
              <Trophy size={13} /> Honours
            </h3>
            <div className="space-y-2 text-[12px]">
              {[
                { title: "La Liga", count: 27 },
                { title: "Champions League", count: 5 },
                { title: "Copa del Rey", count: 31 },
                { title: "Supercopa", count: 14 },
              ].map((h) => (
                <div key={h.title} className="flex items-center justify-between">
                  <span className="text-mute">{h.title}</span>
                  <span className="num font-semibold">{h.count}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
