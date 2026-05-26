"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, SectionHead, Chip } from "@/components/ui";

const BRACKET_ROUNDS = [
  {
    name: "Round of 32",
    matches: [
      { a: "1A", b: "3C/D/E", venue: "MetLife Stadium" },
      { a: "1B", b: "3A/D/E", venue: "AT&T Stadium" },
      { a: "1C", b: "3D/E/F", venue: "SoFi Stadium" },
      { a: "1D", b: "3A/B/C", venue: "Rose Bowl" },
      { a: "2A", b: "2C", venue: "Hard Rock Stadium" },
      { a: "2B", b: "2D", venue: "Lumen Field" },
      { a: "1E", b: "3G/H/I", venue: "Gillette Stadium" },
      { a: "1F", b: "3H/I/J", venue: "NRG Stadium" },
    ],
  },
  {
    name: "Round of 16",
    matches: [
      { a: "W1", b: "W2", venue: "MetLife Stadium" },
      { a: "W3", b: "W4", venue: "AT&T Stadium" },
      { a: "W5", b: "W6", venue: "SoFi Stadium" },
      { a: "W7", b: "W8", venue: "Hard Rock Stadium" },
    ],
  },
  {
    name: "Quarter-finals",
    matches: [
      { a: "QF1", b: "QF2", venue: "MetLife Stadium" },
      { a: "QF3", b: "QF4", venue: "AT&T Stadium" },
    ],
  },
  {
    name: "Semi-finals",
    matches: [
      { a: "SF1", b: "SF2", venue: "AT&T Stadium" },
    ],
  },
];

export default function BracketPage() {
  return (
    <div className="max-w-[1440px] mx-auto px-6 py-8">
      <Link href="/worldcup" className="inline-flex items-center gap-1.5 text-[13px] text-mute hover:text-white transition mb-6">
        <ArrowLeft size={14} /> World Cup 2026
      </Link>

      <div className="mb-8">
        <div className="text-[11px] uppercase tracking-[0.18em] text-mute-soft mb-2 num">Knockout stage</div>
        <h1 className="display text-[clamp(28px,4vw,40px)] tracking-tight">
          Tournament <span className="font-serif italic text-acc">bracket</span>
        </h1>
        <p className="text-[13px] text-mute mt-2">48 teams, expanded format. The bracket will update live as matches are played.</p>
      </div>

      {/* Final */}
      <Card className="p-6 mb-8 text-center border-acc/30">
        <div className="text-[10px] uppercase tracking-wider text-acc mb-2">Final</div>
        <div className="text-[18px] font-semibold">MetLife Stadium, New Jersey</div>
        <div className="text-[13px] text-mute mt-1">July 19, 2026</div>
        <div className="mt-4 flex items-center justify-center gap-6">
          <div className="w-16 h-16 rounded-xl bg-ink-800 border border-line grid place-items-center text-[12px] text-mute">TBD</div>
          <span className="display text-[20px] text-mute-soft">VS</span>
          <div className="w-16 h-16 rounded-xl bg-ink-800 border border-line grid place-items-center text-[12px] text-mute">TBD</div>
        </div>
      </Card>

      <div className="space-y-6">
        {BRACKET_ROUNDS.map((round) => (
          <div key={round.name}>
            <SectionHead eyebrow="Knockout" title={round.name} />
            <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3 mt-4">
              {round.matches.map((m, i) => (
                <Card key={i} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-full">
                      <div className="flex items-center justify-between py-2 border-b border-line">
                        <span className="text-[13px] font-medium">{m.a}</span>
                        <span className="text-[11px] text-mute">-</span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-[13px] font-medium">{m.b}</span>
                        <span className="text-[11px] text-mute">-</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-[10px] text-mute-soft">{m.venue}</div>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
