"use client";

import { Card, SectionHead, Avatar, Delta, Chip } from "@/components/ui";
import { fmtVal } from "@/lib/utils";

const EXPIRING = [
  { name: "Alexander-Arnold", club: "Liverpool", pos: "RB", val: 68.0, expiry: "Jun 2026", clubBg: "#C8102E", clubColor: "#fff" },
  { name: "Mohamed Salah", club: "Liverpool", pos: "RW", val: 42.0, expiry: "Jun 2026", clubBg: "#C8102E", clubColor: "#fff" },
  { name: "Alphonso Davies", club: "Bayern Munich", pos: "LB", val: 55.0, expiry: "Jun 2026", clubBg: "#DC052D", clubColor: "#fff" },
  { name: "Jonathan David", club: "Lille", pos: "ST", val: 52.0, expiry: "Jun 2026", clubBg: "#E2001A", clubColor: "#fff" },
  { name: "Son Heung-min", club: "Tottenham", pos: "LW", val: 28.0, expiry: "Jun 2026", clubBg: "#132257", clubColor: "#fff" },
  { name: "Leroy Sané", club: "Bayern Munich", pos: "RW", val: 35.0, expiry: "Jun 2026", clubBg: "#DC052D", clubColor: "#fff" },
];

const LONGEST = [
  { name: "Lamine Yamal", club: "Barcelona", pos: "RW", val: 215.0, expiry: "Jun 2030", salary: "€180K/wk", clubBg: "#A50044", clubColor: "#EDBB00" },
  { name: "Jude Bellingham", club: "Real Madrid", pos: "CM", val: 131.4, expiry: "Jun 2029", salary: "€290K/wk", clubBg: "#FEBE10", clubColor: "#00529F" },
  { name: "Erling Haaland", club: "Man City", pos: "ST", val: 165.0, expiry: "Jun 2034", salary: "€420K/wk", clubBg: "#6CABDD", clubColor: "#1C2C5B" },
  { name: "Bukayo Saka", club: "Arsenal", pos: "RW", val: 142.0, expiry: "Jun 2029", salary: "€300K/wk", clubBg: "#EF0107", clubColor: "#fff" },
  { name: "Phil Foden", club: "Man City", pos: "AM", val: 112.0, expiry: "Jun 2029", salary: "€280K/wk", clubBg: "#6CABDD", clubColor: "#1C2C5B" },
  { name: "Pedri", club: "Barcelona", pos: "CM", val: 98.0, expiry: "Jun 2030", salary: "€200K/wk", clubBg: "#A50044", clubColor: "#EDBB00" },
];

const BIGGEST_SALARIES = [
  { name: "Erling Haaland", club: "Man City", salary: "€420K/wk", annual: "€21.8M", clubBg: "#6CABDD", clubColor: "#1C2C5B" },
  { name: "Kylian Mbappé", club: "Real Madrid", salary: "€380K/wk", annual: "€19.8M", clubBg: "#FEBE10", clubColor: "#00529F" },
  { name: "Bukayo Saka", club: "Arsenal", salary: "€300K/wk", annual: "€15.6M", clubBg: "#EF0107", clubColor: "#fff" },
  { name: "Jude Bellingham", club: "Real Madrid", salary: "€290K/wk", annual: "€15.1M", clubBg: "#FEBE10", clubColor: "#00529F" },
  { name: "Kevin De Bruyne", club: "Man City", salary: "€350K/wk", annual: "€18.2M", clubBg: "#6CABDD", clubColor: "#1C2C5B" },
];

export default function ContractsPage() {
  return (
    <div className="max-w-[1440px] mx-auto px-6 py-8">
      <div className="mb-8">
        <div className="text-[11px] uppercase tracking-[0.18em] text-mute-soft mb-2 num">Contract intelligence</div>
        <h1 className="display text-[clamp(28px,4vw,40px)] tracking-tight">
          <span className="font-serif italic text-acc">Contracts</span> & salaries
        </h1>
        <p className="text-[13px] text-mute mt-2">Contract expirations, salary data, and market leverage insights.</p>
      </div>

      <div className="grid lg:grid-cols-[1fr_380px] gap-6">
        <div className="space-y-6">
          {/* Expiring soon */}
          <Card className="overflow-hidden">
            <div className="px-5 py-3 border-b border-line">
              <SectionHead eyebrow="Summer 2026" title="Expiring contracts" />
            </div>
            <div className="grid grid-cols-[1.5fr_60px_100px_90px] px-4 py-2.5 text-[10px] uppercase tracking-wider text-mute-soft num border-b border-line bg-ink-900">
              <span>Player</span><span>Pos</span><span>Current club</span><span className="text-right">Value</span>
            </div>
            {EXPIRING.map((p) => (
              <div key={p.name} className="grid grid-cols-[1.5fr_60px_100px_90px] px-4 py-3 items-center border-b border-line last:border-0 hover:bg-white/[0.03] transition cursor-pointer">
                <div className="flex items-center gap-3">
                  <Avatar name={p.name} clubBg={p.clubBg} clubColor={p.clubColor} size={28} />
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium truncate">{p.name}</div>
                    <Chip tone="down">Expiring</Chip>
                  </div>
                </div>
                <span className="num text-[12px] text-mute">{p.pos}</span>
                <span className="text-[12px] text-mute">{p.club}</span>
                <span className="num text-[13px] text-right font-semibold">{fmtVal(p.val)}</span>
              </div>
            ))}
          </Card>

          {/* Longest contracts */}
          <Card className="overflow-hidden">
            <div className="px-5 py-3 border-b border-line">
              <SectionHead eyebrow="Locked in" title="Longest remaining" />
            </div>
            <div className="grid grid-cols-[1.5fr_80px_90px_90px] px-4 py-2.5 text-[10px] uppercase tracking-wider text-mute-soft num border-b border-line bg-ink-900">
              <span>Player</span><span>Expiry</span><span>Salary</span><span className="text-right">Value</span>
            </div>
            {LONGEST.map((p) => (
              <div key={p.name} className="grid grid-cols-[1.5fr_80px_90px_90px] px-4 py-3 items-center border-b border-line last:border-0 hover:bg-white/[0.03] transition cursor-pointer">
                <div className="flex items-center gap-3">
                  <Avatar name={p.name} clubBg={p.clubBg} clubColor={p.clubColor} size={28} />
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium truncate">{p.name}</div>
                    <div className="text-[11px] text-mute">{p.club}</div>
                  </div>
                </div>
                <span className="num text-[12px]">{p.expiry}</span>
                <span className="num text-[12px] text-mute">{p.salary}</span>
                <span className="num text-[13px] text-right font-semibold">{fmtVal(p.val)}</span>
              </div>
            ))}
          </Card>
        </div>

        {/* Salary leaderboard sidebar */}
        <Card className="p-5 h-fit">
          <SectionHead eyebrow="Top earners" title="Biggest salaries" />
          <div className="space-y-4 mt-4">
            {BIGGEST_SALARIES.map((p, i) => (
              <div key={p.name} className="flex items-center gap-3">
                <span className={`num text-[13px] font-semibold w-4 ${i < 3 ? "text-acc" : "text-mute"}`}>{i + 1}</span>
                <Avatar name={p.name} clubBg={p.clubBg} clubColor={p.clubColor} size={28} />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium truncate">{p.name}</div>
                  <div className="text-[11px] text-mute">{p.club}</div>
                </div>
                <div className="text-right">
                  <div className="num text-[13px] font-semibold">{p.salary}</div>
                  <div className="num text-[10px] text-mute-soft">{p.annual}/yr</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
