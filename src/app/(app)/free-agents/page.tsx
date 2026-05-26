"use client";

import { Card, SectionHead, Avatar, Delta, Chip } from "@/components/ui";
import { fmtVal } from "@/lib/utils";

const FREE_AGENTS = [
  { name: "Jonathan David", pos: "ST", age: 25, nationality: "🇨🇦", club: "Lille (expiring)", val: 52.0, dWeek: 3.8, clubBg: "#E2001A", clubColor: "#fff", interest: ["Barcelona", "Arsenal", "Bayern"] },
  { name: "Mohamed Salah", pos: "RW", age: 33, nationality: "🇪🇬", club: "Liverpool (expiring)", val: 42.0, dWeek: -2.1, clubBg: "#C8102E", clubColor: "#fff", interest: ["Al Hilal", "PSG"] },
  { name: "Alexander-Arnold", pos: "RB", age: 27, nationality: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", club: "Liverpool (expiring)", val: 68.0, dWeek: 1.2, clubBg: "#C8102E", clubColor: "#fff", interest: ["Real Madrid"] },
  { name: "Alphonso Davies", pos: "LB", age: 25, nationality: "🇨🇦", club: "Bayern (expiring)", val: 55.0, dWeek: -1.8, clubBg: "#DC052D", clubColor: "#fff", interest: ["Real Madrid", "Man City"] },
  { name: "Son Heung-min", pos: "LW", age: 33, nationality: "🇰🇷", club: "Tottenham (expiring)", val: 28.0, dWeek: -3.2, clubBg: "#132257", clubColor: "#fff", interest: ["Napoli", "Al Ahli"] },
  { name: "Leroy Sané", pos: "RW", age: 30, nationality: "🇩🇪", club: "Bayern (expiring)", val: 35.0, dWeek: -1.5, clubBg: "#DC052D", clubColor: "#fff", interest: ["Arsenal", "PSG"] },
  { name: "Ilkay Gündogan", pos: "CM", age: 35, nationality: "🇩🇪", club: "Barcelona (expiring)", val: 12.0, dWeek: -0.8, clubBg: "#A50044", clubColor: "#EDBB00", interest: ["Man City", "Retirement"] },
  { name: "Adrien Rabiot", pos: "CM", age: 31, nationality: "🇫🇷", club: "Marseille (expiring)", val: 18.0, dWeek: -0.5, clubBg: "#2FAEE0", clubColor: "#fff", interest: ["Milan", "Galatasaray"] },
];

export default function FreeAgentsPage() {
  return (
    <div className="max-w-[1440px] mx-auto px-6 py-8">
      <div className="mb-8">
        <div className="text-[11px] uppercase tracking-[0.18em] text-mute-soft mb-2 num">Summer 2026</div>
        <h1 className="display text-[clamp(28px,4vw,40px)] tracking-tight">
          Free <span className="font-serif italic text-acc">agents</span>
        </h1>
        <p className="text-[13px] text-mute mt-2">Players whose contracts expire this summer. Updated daily.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <Card className="p-4">
          <div className="text-[10px] text-mute-soft uppercase tracking-wider">Available</div>
          <div className="num display text-[28px] mt-1">{FREE_AGENTS.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-[10px] text-mute-soft uppercase tracking-wider">Total value</div>
          <div className="num display text-[28px] mt-1">{fmtVal(FREE_AGENTS.reduce((s, p) => s + p.val, 0))}</div>
        </Card>
        <Card className="p-4">
          <div className="text-[10px] text-mute-soft uppercase tracking-wider">Avg age</div>
          <div className="num display text-[28px] mt-1">{(FREE_AGENTS.reduce((s, p) => s + p.age, 0) / FREE_AGENTS.length).toFixed(1)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-[10px] text-mute-soft uppercase tracking-wider">Most valuable</div>
          <div className="text-[14px] font-semibold mt-1">Alexander-Arnold</div>
          <div className="num text-[12px] text-up">{fmtVal(68)}</div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="grid grid-cols-[1.5fr_60px_50px_100px_90px_1fr] px-4 py-2.5 text-[10px] uppercase tracking-wider text-mute-soft num border-b border-line bg-ink-900">
          <span>Player</span><span>Pos</span><span>Age</span>
          <span>Current club</span><span className="text-right">Value</span><span>Interested clubs</span>
        </div>
        {FREE_AGENTS.map((p) => (
          <div key={p.name} className="grid grid-cols-[1.5fr_60px_50px_100px_90px_1fr] px-4 py-3 items-center border-b border-line last:border-0 hover:bg-white/[0.03] transition">
            <div className="flex items-center gap-3">
              <Avatar name={p.name} clubBg={p.clubBg} clubColor={p.clubColor} size={32} />
              <div className="min-w-0">
                <div className="text-[13px] font-medium truncate">{p.name}</div>
                <div className="text-[11px] text-mute">{p.nationality}</div>
              </div>
            </div>
            <span className="num text-[12px] text-mute">{p.pos}</span>
            <span className="num text-[12px] text-mute">{p.age}</span>
            <span className="text-[12px] text-mute truncate">{p.club}</span>
            <div className="text-right">
              <span className="num text-[13px] font-semibold">{fmtVal(p.val)}</span>
              <Delta value={p.dWeek} />
            </div>
            <div className="flex flex-wrap gap-1">
              {p.interest.map((c) => (
                <Chip key={c} tone="neutral">{c}</Chip>
              ))}
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
