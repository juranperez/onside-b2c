"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, SectionHead, Chip } from "@/components/ui";

const GROUPS: { letter: string; teams: { name: string; flag: string; code: string; rank: number; pts: number; gd: number }[] }[] = [
  { letter: "A", teams: [
    { name: "USA", flag: "🇺🇸", code: "usa", rank: 11, pts: 0, gd: 0 },
    { name: "Morocco", flag: "🇲🇦", code: "mar", rank: 13, pts: 0, gd: 0 },
    { name: "Scotland", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", code: "sco", rank: 38, pts: 0, gd: 0 },
    { name: "Peru", flag: "🇵🇪", code: "per", rank: 32, pts: 0, gd: 0 },
  ]},
  { letter: "B", teams: [
    { name: "England", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", code: "eng", rank: 4, pts: 0, gd: 0 },
    { name: "Denmark", flag: "🇩🇰", code: "den", rank: 21, pts: 0, gd: 0 },
    { name: "Paraguay", flag: "🇵🇾", code: "par", rank: 42, pts: 0, gd: 0 },
    { name: "Slovenia", flag: "🇸🇮", code: "svn", rank: 52, pts: 0, gd: 0 },
  ]},
  { letter: "C", teams: [
    { name: "Argentina", flag: "🇦🇷", code: "arg", rank: 1, pts: 0, gd: 0 },
    { name: "Mexico", flag: "🇲🇽", code: "mex", rank: 15, pts: 0, gd: 0 },
    { name: "Japan", flag: "🇯🇵", code: "jpn", rank: 18, pts: 0, gd: 0 },
    { name: "Honduras", flag: "🇭🇳", code: "hon", rank: 72, pts: 0, gd: 0 },
  ]},
  { letter: "D", teams: [
    { name: "France", flag: "🇫🇷", code: "fra", rank: 2, pts: 0, gd: 0 },
    { name: "Colombia", flag: "🇨🇴", code: "col", rank: 12, pts: 0, gd: 0 },
    { name: "South Korea", flag: "🇰🇷", code: "kor", rank: 23, pts: 0, gd: 0 },
    { name: "Bahrain", flag: "🇧🇭", code: "bhr", rank: 81, pts: 0, gd: 0 },
  ]},
  { letter: "E", teams: [
    { name: "Spain", flag: "🇪🇸", code: "esp", rank: 3, pts: 0, gd: 0 },
    { name: "Netherlands", flag: "🇳🇱", code: "ned", rank: 7, pts: 0, gd: 0 },
    { name: "Australia", flag: "🇦🇺", code: "aus", rank: 24, pts: 0, gd: 0 },
    { name: "Indonesia", flag: "🇮🇩", code: "idn", rank: 89, pts: 0, gd: 0 },
  ]},
  { letter: "F", teams: [
    { name: "Germany", flag: "🇩🇪", code: "ger", rank: 8, pts: 0, gd: 0 },
    { name: "Uruguay", flag: "🇺🇾", code: "uru", rank: 9, pts: 0, gd: 0 },
    { name: "Canada", flag: "🇨🇦", code: "can", rank: 33, pts: 0, gd: 0 },
    { name: "New Zealand", flag: "🇳🇿", code: "nzl", rank: 95, pts: 0, gd: 0 },
  ]},
  { letter: "G", teams: [
    { name: "Brazil", flag: "🇧🇷", code: "bra", rank: 5, pts: 0, gd: 0 },
    { name: "Serbia", flag: "🇷🇸", code: "srb", rank: 29, pts: 0, gd: 0 },
    { name: "Switzerland", flag: "🇨🇭", code: "sui", rank: 19, pts: 0, gd: 0 },
    { name: "Cameroon", flag: "🇨🇲", code: "cmr", rank: 44, pts: 0, gd: 0 },
  ]},
  { letter: "H", teams: [
    { name: "Portugal", flag: "🇵🇹", code: "por", rank: 6, pts: 0, gd: 0 },
    { name: "Italy", flag: "🇮🇹", code: "ita", rank: 10, pts: 0, gd: 0 },
    { name: "Ecuador", flag: "🇪🇨", code: "ecu", rank: 30, pts: 0, gd: 0 },
    { name: "Bolivia", flag: "🇧🇴", code: "bol", rank: 78, pts: 0, gd: 0 },
  ]},
  { letter: "I", teams: [
    { name: "Belgium", flag: "🇧🇪", code: "bel", rank: 14, pts: 0, gd: 0 },
    { name: "Croatia", flag: "🇭🇷", code: "cro", rank: 16, pts: 0, gd: 0 },
    { name: "Chile", flag: "🇨🇱", code: "chi", rank: 35, pts: 0, gd: 0 },
    { name: "Nigeria", flag: "🇳🇬", code: "nga", rank: 40, pts: 0, gd: 0 },
  ]},
  { letter: "J", teams: [
    { name: "Poland", flag: "🇵🇱", code: "pol", rank: 22, pts: 0, gd: 0 },
    { name: "Senegal", flag: "🇸🇳", code: "sen", rank: 20, pts: 0, gd: 0 },
    { name: "Costa Rica", flag: "🇨🇷", code: "crc", rank: 48, pts: 0, gd: 0 },
    { name: "Saudi Arabia", flag: "🇸🇦", code: "ksa", rank: 56, pts: 0, gd: 0 },
  ]},
  { letter: "K", teams: [
    { name: "Turkey", flag: "🇹🇷", code: "tur", rank: 26, pts: 0, gd: 0 },
    { name: "Austria", flag: "🇦🇹", code: "aut", rank: 25, pts: 0, gd: 0 },
    { name: "Egypt", flag: "🇪🇬", code: "egy", rank: 34, pts: 0, gd: 0 },
    { name: "Jamaica", flag: "🇯🇲", code: "jam", rank: 61, pts: 0, gd: 0 },
  ]},
  { letter: "L", teams: [
    { name: "Sweden", flag: "🇸🇪", code: "swe", rank: 17, pts: 0, gd: 0 },
    { name: "Ukraine", flag: "🇺🇦", code: "ukr", rank: 28, pts: 0, gd: 0 },
    { name: "Ghana", flag: "🇬🇭", code: "gha", rank: 43, pts: 0, gd: 0 },
    { name: "Panama", flag: "🇵🇦", code: "pan", rank: 47, pts: 0, gd: 0 },
  ]},
];

export default function WorldCupGroupsPage() {
  return (
    <div className="max-w-[1440px] mx-auto px-6 py-8">
      <Link href="/worldcup" className="inline-flex items-center gap-1.5 text-[13px] text-mute hover:text-white transition mb-6">
        <ArrowLeft size={14} /> World Cup 2026
      </Link>

      <div className="mb-8">
        <div className="text-[11px] uppercase tracking-[0.18em] text-mute-soft mb-2 num">FIFA World Cup 2026</div>
        <h1 className="display text-[clamp(28px,4vw,40px)] tracking-tight">
          Group stage <span className="font-serif italic text-acc">draw</span>
        </h1>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {GROUPS.map((g) => (
          <Card key={g.letter} className="overflow-hidden">
            <div className="px-4 py-2.5 bg-ink-900 border-b border-line flex items-center gap-2">
              <Chip tone="acc">Group {g.letter}</Chip>
            </div>
            <div className="divide-y divide-line">
              {g.teams.map((t, i) => (
                <Link key={t.code} href={`/worldcup/teams/${t.code}`}>
                  <div className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition cursor-pointer">
                    <span className="num text-[11px] text-mute-soft w-4">{i + 1}</span>
                    <span className="text-[20px]">{t.flag}</span>
                    <div className="flex-1">
                      <div className="text-[13px] font-medium">{t.name}</div>
                      <div className="text-[11px] text-mute">FIFA #{t.rank}</div>
                    </div>
                    <span className="num text-[12px] text-mute">{t.pts} pts</span>
                  </div>
                </Link>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
