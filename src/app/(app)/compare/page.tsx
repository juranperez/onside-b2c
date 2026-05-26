"use client";

import { Card, SectionHead, Button } from "@/components/ui";
import { Avatar, Delta } from "@/components/ui";
import { fmtVal } from "@/lib/utils";
import { cn } from "@/lib/utils";

const PLAYER_A = {
  name: "Lamine Yamal", pos: "RW", age: 17, club: "Barcelona", val: 215.0, dWeek: 9.3,
  clubBg: "#A50044", clubColor: "#EDBB00",
  attrs: [
    { label: "Pace", a: 92, b: 78 },
    { label: "Shooting", a: 78, b: 82 },
    { label: "Passing", a: 84, b: 85 },
    { label: "Dribbling", a: 93, b: 83 },
    { label: "Defending", a: 34, b: 72 },
    { label: "Physical", a: 58, b: 80 },
    { label: "Vision", a: 88, b: 86 },
    { label: "Composure", a: 82, b: 88 },
  ],
};

const PLAYER_B = {
  name: "Jude Bellingham", pos: "CM", age: 22, club: "Real Madrid", val: 131.4, dWeek: 2.1,
  clubBg: "#FEBE10", clubColor: "#00529F",
};

export default function ComparePage() {
  return (
    <div className="max-w-[1200px] mx-auto px-6 py-8">
      <div className="text-center mb-8">
        <div className="text-[11px] uppercase tracking-[0.18em] text-mute-soft mb-2 num">Head to head</div>
        <h1 className="display text-[clamp(28px,4vw,40px)] tracking-tight">
          Compare <span className="font-serif italic text-acc">players</span>
        </h1>
      </div>

      {/* Player headers */}
      <div className="grid grid-cols-[1fr_80px_1fr] gap-4 mb-8">
        <Card className="p-5 text-center">
          <Avatar name={PLAYER_A.name} clubBg={PLAYER_A.clubBg} clubColor={PLAYER_A.clubColor} size={64} />
          <div className="mt-3 text-[16px] font-semibold">{PLAYER_A.name}</div>
          <div className="text-[12px] text-mute">{PLAYER_A.club} &middot; {PLAYER_A.pos}</div>
          <div className="num display text-[28px] mt-2">{fmtVal(PLAYER_A.val)}</div>
          <Delta value={PLAYER_A.dWeek} big />
        </Card>
        <div className="flex items-center justify-center">
          <span className="display text-[24px] text-mute-soft">VS</span>
        </div>
        <Card className="p-5 text-center">
          <Avatar name={PLAYER_B.name} clubBg={PLAYER_B.clubBg} clubColor={PLAYER_B.clubColor} size={64} />
          <div className="mt-3 text-[16px] font-semibold">{PLAYER_B.name}</div>
          <div className="text-[12px] text-mute">{PLAYER_B.club} &middot; {PLAYER_B.pos}</div>
          <div className="num display text-[28px] mt-2">{fmtVal(PLAYER_B.val)}</div>
          <Delta value={PLAYER_B.dWeek} big />
        </Card>
      </div>

      {/* Stat comparison bars */}
      <Card className="p-6">
        <SectionHead eyebrow="Attributes" title="Stat comparison" />
        <div className="space-y-4">
          {PLAYER_A.attrs.map((attr) => {
            const aWins = attr.a > attr.b;
            const bWins = attr.b > attr.a;
            return (
              <div key={attr.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className={cn("num text-[13px] font-semibold", aWins && "text-up")}>{attr.a}</span>
                  <span className="text-[12px] text-mute">{attr.label}</span>
                  <span className={cn("num text-[13px] font-semibold", bWins && "text-up")}>{attr.b}</span>
                </div>
                <div className="flex gap-1 h-2">
                  <div className="flex-1 flex justify-end">
                    <div
                      className={cn("h-full rounded-l-full", aWins ? "bg-up" : "bg-ink-600")}
                      style={{ width: `${attr.a}%` }}
                    />
                  </div>
                  <div className="flex-1">
                    <div
                      className={cn("h-full rounded-r-full", bWins ? "bg-up" : "bg-ink-600")}
                      style={{ width: `${attr.b}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Quick facts comparison */}
      <Card className="p-6 mt-4">
        <SectionHead eyebrow="Overview" title="Key metrics" />
        <div className="grid grid-cols-3 gap-4 text-center">
          {[
            { label: "Age", a: "17", b: "22" },
            { label: "Goals/season", a: "14", b: "12" },
            { label: "Assists/season", a: "16", b: "8" },
            { label: "xG", a: "12.4", b: "10.8" },
            { label: "Contract", a: "Jun 2030", b: "Jun 2029" },
            { label: "Salary", a: "€180K/wk", b: "€290K/wk" },
          ].map((row) => (
            <div key={row.label} className="border-b border-line pb-3 last:border-0">
              <div className="text-[10px] text-mute-soft uppercase tracking-wider mb-2">{row.label}</div>
              <div className="flex items-center justify-between px-4">
                <span className="num text-[14px] font-semibold">{row.a}</span>
                <span className="num text-[14px] font-semibold">{row.b}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
