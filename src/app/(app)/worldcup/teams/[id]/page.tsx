"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, Trophy, Users, Star } from "lucide-react";
import { Card, SectionHead, Avatar, Delta, Chip } from "@/components/ui";
import { fmtVal } from "@/lib/utils";

const TEAM = {
  name: "Brazil",
  code: "BRA",
  flag: "🇧🇷",
  group: "G",
  rank: 5,
  confederation: "CONMEBOL",
  manager: "Dorival Júnior",
  squadVal: 1120,
  avgAge: 26.2,
  wcTitles: 5,
  odds: "+800",
};

const SQUAD = [
  { name: "Vinícius Jr", pos: "LW", age: 25, val: 180.0, dWeek: 4.2, club: "Real Madrid", clubBg: "#FEBE10", clubColor: "#00529F" },
  { name: "Rodrygo", pos: "RW", age: 25, val: 98.0, dWeek: 2.1, club: "Real Madrid", clubBg: "#FEBE10", clubColor: "#00529F" },
  { name: "Endrick", pos: "ST", age: 19, val: 72.0, dWeek: 5.8, club: "Real Madrid", clubBg: "#FEBE10", clubColor: "#00529F" },
  { name: "Bruno Guimarães", pos: "CM", age: 27, val: 88.0, dWeek: 1.4, club: "Newcastle", clubBg: "#241F20", clubColor: "#fff" },
  { name: "Marquinhos", pos: "CB", age: 31, val: 38.0, dWeek: -0.8, club: "PSG", clubBg: "#004170", clubColor: "#DA291C" },
  { name: "Alisson", pos: "GK", age: 33, val: 32.0, dWeek: 0.5, club: "Liverpool", clubBg: "#C8102E", clubColor: "#fff" },
  { name: "Raphinha", pos: "LW", age: 29, val: 72.0, dWeek: 2.8, club: "Barcelona", clubBg: "#A50044", clubColor: "#EDBB00" },
  { name: "Gabriel Martinelli", pos: "LW", age: 24, val: 68.0, dWeek: 3.2, club: "Arsenal", clubBg: "#EF0107", clubColor: "#fff" },
];

const GROUP_MATCHES = [
  { vs: "Serbia", date: "Jun 12", venue: "MetLife Stadium", result: null },
  { vs: "Switzerland", date: "Jun 17", venue: "AT&T Stadium", result: null },
  { vs: "Cameroon", date: "Jun 22", venue: "Hard Rock Stadium", result: null },
];

export default function NationalTeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-8">
      <Link href="/worldcup" className="inline-flex items-center gap-1.5 text-[13px] text-mute hover:text-white transition mb-6">
        <ArrowLeft size={14} /> World Cup 2026
      </Link>

      <div className="flex items-center gap-5 mb-8">
        <span className="text-[64px]">{TEAM.flag}</span>
        <div>
          <h1 className="display text-[clamp(28px,4vw,40px)] tracking-tight">{TEAM.name}</h1>
          <div className="flex items-center gap-3 mt-1 text-[13px] text-mute">
            <Chip tone="acc">Group {TEAM.group}</Chip>
            <span>FIFA #{TEAM.rank}</span>
            <span className="w-1 h-1 rounded-full bg-line" />
            <span>{TEAM.confederation}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
        {[
          { label: "Squad value", value: `€${TEAM.squadVal}M` },
          { label: "Avg age", value: TEAM.avgAge.toString() },
          { label: "Manager", value: TEAM.manager },
          { label: "WC titles", value: TEAM.wcTitles.toString() },
          { label: "Win odds", value: TEAM.odds },
        ].map((m) => (
          <Card key={m.label} className="p-4">
            <div className="text-[10px] text-mute-soft uppercase tracking-wider">{m.label}</div>
            <div className="text-[16px] font-semibold mt-1">{m.value}</div>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-[1fr_340px] gap-6">
        <div className="space-y-6">
          {/* Squad */}
          <Card className="overflow-hidden">
            <div className="px-5 py-3 border-b border-line">
              <SectionHead eyebrow="26-man roster" title="Squad" />
            </div>
            <div className="grid grid-cols-[1.5fr_60px_50px_90px_80px] px-4 py-2.5 text-[10px] uppercase tracking-wider text-mute-soft num border-b border-line bg-ink-900">
              <span>Player</span><span>Pos</span><span>Age</span>
              <span className="text-right">Value</span><span className="text-right">Week</span>
            </div>
            {SQUAD.map((p) => (
              <div key={p.name} className="grid grid-cols-[1.5fr_60px_50px_90px_80px] px-4 py-3 items-center border-b border-line last:border-0">
                <div className="flex items-center gap-3">
                  <Avatar name={p.name} clubBg={p.clubBg} clubColor={p.clubColor} size={28} />
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium truncate">{p.name}</div>
                    <div className="text-[11px] text-mute truncate">{p.club}</div>
                  </div>
                </div>
                <span className="num text-[12px] text-mute">{p.pos}</span>
                <span className="num text-[12px] text-mute">{p.age}</span>
                <span className="num text-[13px] text-right font-semibold">{fmtVal(p.val)}</span>
                <span className="text-right"><Delta value={p.dWeek} /></span>
              </div>
            ))}
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="text-[13px] font-semibold flex items-center gap-1.5 mb-3">
              <Trophy size={13} /> Group {TEAM.group} fixtures
            </h3>
            <div className="space-y-3">
              {GROUP_MATCHES.map((m) => (
                <div key={m.vs} className="flex items-center justify-between py-2 border-b border-line last:border-0">
                  <div>
                    <div className="text-[13px] font-medium">vs {m.vs}</div>
                    <div className="text-[11px] text-mute">{m.venue}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[12px] num">{m.date}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-[13px] font-semibold flex items-center gap-1.5 mb-3">
              <Star size={13} /> Key stats
            </h3>
            <div className="space-y-2 text-[12px]">
              {[
                { label: "Goals in qualifying", val: "22" },
                { label: "Clean sheets", val: "8" },
                { label: "Avg possession", val: "62%" },
                { label: "Top scorer", val: "Vinícius (7)" },
              ].map((s) => (
                <div key={s.label} className="flex items-center justify-between">
                  <span className="text-mute">{s.label}</span>
                  <span className="num font-semibold">{s.val}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
