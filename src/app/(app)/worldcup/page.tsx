import Link from "next/link";
import { ArrowRight, Globe, Calendar, Trophy, TrendingUp } from "lucide-react";
import { Button, Card, SectionHead, LiveDot } from "@/components/ui";

const GROUPS = [
  { id: "A", teams: [
    { name: "United States", code: "USA", flag: "🇺🇸", val: 890, rank: 11 },
    { name: "Wales", code: "WAL", flag: "🏴󠁧󠁢󠁷󠁬󠁳󠁿", val: 180, rank: 28 },
    { name: "Senegal", code: "SEN", flag: "🇸🇳", val: 240, rank: 17 },
    { name: "Qatar", code: "QAT", flag: "🇶🇦", val: 25, rank: 58 },
  ]},
  { id: "B", teams: [
    { name: "England", code: "ENG", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", val: 1650, rank: 4 },
    { name: "Denmark", code: "DEN", flag: "🇩🇰", val: 420, rank: 19 },
    { name: "Serbia", code: "SRB", flag: "🇷🇸", val: 290, rank: 25 },
    { name: "Costa Rica", code: "CRC", flag: "🇨🇷", val: 45, rank: 43 },
  ]},
  { id: "C", teams: [
    { name: "Argentina", code: "ARG", flag: "🇦🇷", val: 980, rank: 1 },
    { name: "Mexico", code: "MEX", flag: "🇲🇽", val: 280, rank: 15 },
    { name: "Poland", code: "POL", flag: "🇵🇱", val: 350, rank: 23 },
    { name: "Saudi Arabia", code: "KSA", flag: "🇸🇦", val: 30, rank: 56 },
  ]},
  { id: "D", teams: [
    { name: "France", code: "FRA", flag: "🇫🇷", val: 1480, rank: 2 },
    { name: "Australia", code: "AUS", flag: "🇦🇺", val: 120, rank: 24 },
    { name: "Peru", code: "PER", flag: "🇵🇪", val: 95, rank: 31 },
    { name: "Tunisia", code: "TUN", flag: "🇹🇳", val: 65, rank: 35 },
  ]},
  { id: "E", teams: [
    { name: "Spain", code: "ESP", flag: "🇪🇸", val: 1320, rank: 5 },
    { name: "Japan", code: "JPN", flag: "🇯🇵", val: 310, rank: 14 },
    { name: "Germany", code: "GER", flag: "🇩🇪", val: 1180, rank: 3 },
    { name: "New Zealand", code: "NZL", flag: "🇳🇿", val: 12, rank: 101 },
  ]},
  { id: "F", teams: [
    { name: "Brazil", code: "BRA", flag: "🇧🇷", val: 1290, rank: 6 },
    { name: "Switzerland", code: "SUI", flag: "🇨🇭", val: 380, rank: 16 },
    { name: "Cameroon", code: "CMR", flag: "🇨🇲", val: 180, rank: 33 },
    { name: "Ecuador", code: "ECU", flag: "🇪🇨", val: 160, rank: 29 },
  ]},
  { id: "G", teams: [
    { name: "Portugal", code: "POR", flag: "🇵🇹", val: 1100, rank: 7 },
    { name: "Uruguay", code: "URU", flag: "🇺🇾", val: 420, rank: 12 },
    { name: "South Korea", code: "KOR", flag: "🇰🇷", val: 280, rank: 22 },
    { name: "Ghana", code: "GHA", flag: "🇬🇭", val: 95, rank: 37 },
  ]},
  { id: "H", teams: [
    { name: "Belgium", code: "BEL", flag: "🇧🇪", val: 680, rank: 8 },
    { name: "Canada", code: "CAN", flag: "🇨🇦", val: 190, rank: 40 },
    { name: "Morocco", code: "MAR", flag: "🇲🇦", val: 350, rank: 13 },
    { name: "Croatia", code: "CRO", flag: "🇭🇷", val: 450, rank: 9 },
  ]},
  { id: "I", teams: [
    { name: "Netherlands", code: "NED", flag: "🇳🇱", val: 920, rank: 10 },
    { name: "Colombia", code: "COL", flag: "🇨🇴", val: 340, rank: 18 },
    { name: "Nigeria", code: "NGA", flag: "🇳🇬", val: 280, rank: 30 },
    { name: "Jamaica", code: "JAM", flag: "🇯🇲", val: 35, rank: 62 },
  ]},
  { id: "J", teams: [
    { name: "Italy", code: "ITA", flag: "🇮🇹", val: 980, rank: 11 },
    { name: "Turkey", code: "TUR", flag: "🇹🇷", val: 380, rank: 26 },
    { name: "Chile", code: "CHI", flag: "🇨🇱", val: 130, rank: 34 },
    { name: "Uzbekistan", code: "UZB", flag: "🇺🇿", val: 28, rank: 55 },
  ]},
  { id: "K", teams: [
    { name: "Austria", code: "AUT", flag: "🇦🇹", val: 350, rank: 20 },
    { name: "Ukraine", code: "UKR", flag: "🇺🇦", val: 320, rank: 21 },
    { name: "IR Iran", code: "IRN", flag: "🇮🇷", val: 60, rank: 38 },
    { name: "Honduras", code: "HON", flag: "🇭🇳", val: 20, rank: 72 },
  ]},
  { id: "L", teams: [
    { name: "Sweden", code: "SWE", flag: "🇸🇪", val: 280, rank: 27 },
    { name: "Scotland", code: "SCO", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", val: 210, rank: 32 },
    { name: "Egypt", code: "EGY", flag: "🇪🇬", val: 160, rank: 36 },
    { name: "Paraguay", code: "PAR", flag: "🇵🇾", val: 70, rank: 42 },
  ]},
];

const PLAYERS_TO_WATCH = [
  { name: "Lamine Yamal", club: "Barcelona", country: "🇪🇸 Spain", val: "€215.0M", age: 17 },
  { name: "Jude Bellingham", club: "Real Madrid", country: "🏴󠁧󠁢󠁥󠁮󠁧󠁿 England", val: "€131.4M", age: 22 },
  { name: "Kylian Mbappé", club: "Real Madrid", country: "🇫🇷 France", val: "€185.0M", age: 27 },
  { name: "Erling Haaland", club: "Manchester City", country: "🇳🇴 Norway", val: "€178.5M", age: 25 },
  { name: "Vinicius Jr", club: "Real Madrid", country: "🇧🇷 Brazil", val: "€198.0M", age: 25 },
  { name: "Florian Wirtz", club: "Bayer Leverkusen", country: "🇩🇪 Germany", val: "€140.5M", age: 22 },
];

function fmtVal(m: number): string {
  if (m >= 1000) return `€${(m / 1000).toFixed(1)}B`;
  return `€${m}M`;
}

export default function WorldCupPage() {
  const daysToKickoff = Math.max(0, Math.ceil((new Date("2026-06-11").getTime() - Date.now()) / 86400000));

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-8">
      {/* Hero */}
      <div className="relative rounded-2xl bg-ink-850 border border-line overflow-hidden mb-8">
        <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" />
        <div
          className="absolute -top-20 -right-10 w-[400px] h-[400px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(232,255,90,0.1) 0%, transparent 60%)" }}
        />
        <div className="relative p-8 md:p-12">
          <div className="flex items-center gap-2 mb-4">
            <Trophy size={16} className="text-acc" />
            <span className="text-[11px] uppercase tracking-[0.18em] text-acc num font-semibold">
              FIFA World Cup 2026
            </span>
          </div>
          <h1 className="display text-[clamp(32px,5vw,56px)] tracking-tight leading-[1.05] max-w-[600px]">
            48 teams. <span className="num">$16.2B</span> in talent.{" "}
            <span className="font-serif italic text-acc">One trophy.</span>
          </h1>
          <p className="mt-4 text-mute text-[16px] max-w-[500px]">
            United States, Canada, and Mexico host the first-ever 48-team World Cup. Every squad
            valued by the ONSIDE engine.
          </p>

          <div className="mt-8 flex items-center gap-6 flex-wrap">
            <div className="text-center">
              <div className="display text-[48px] num text-acc">{daysToKickoff}</div>
              <div className="text-[11px] text-mute-soft uppercase tracking-wider">Days to go</div>
            </div>
            <div className="w-px h-12 bg-line hidden md:block" />
            <div className="flex items-center gap-8">
              <Stat label="Teams" value="48" />
              <Stat label="Groups" value="12" />
              <Stat label="Venues" value="16" />
              <Stat label="Host nations" value="3" />
            </div>
          </div>

          <div className="mt-8 flex items-center gap-3">
            <Link href="/worldcup/groups">
              <Button kind="primary" icon={<Globe size={14} />}>View all groups</Button>
            </Link>
            <Link href="/worldcup/bracket">
              <Button kind="outline" icon={<Trophy size={14} />}>Knockout bracket</Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Most valuable squads */}
      <SectionHead
        eyebrow="Squad values"
        title="Most valuable squads"
        action={
          <div className="flex items-center gap-2">
            <LiveDot />
          </div>
        }
      />
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 mb-12">
        {GROUPS.flatMap((g) => g.teams)
          .sort((a, b) => b.val - a.val)
          .slice(0, 12)
          .map((team, i) => (
            <Card key={team.code} className="p-4 hover:bg-ink-800 transition cursor-pointer">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">{team.flag}</span>
                <span className="text-[10px] text-mute-soft num">#{i + 1}</span>
              </div>
              <div className="text-[13px] font-semibold truncate">{team.name}</div>
              <div className="num text-[16px] font-bold mt-1 text-up">{fmtVal(team.val)}</div>
              <div className="text-[10px] text-mute-soft num mt-0.5">FIFA #{team.rank}</div>
            </Card>
          ))}
      </div>

      {/* Groups */}
      <SectionHead
        eyebrow="Group stage"
        title="12 groups of fire"
        action={
          <Link href="/worldcup/groups">
            <Button kind="outline" size="sm" icon={<ArrowRight size={12} />}>All groups</Button>
          </Link>
        }
      />
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 mb-12">
        {GROUPS.map((group) => (
          <Card key={group.id} className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="display text-[18px]">Group {group.id}</span>
              <span className="text-[10px] text-mute-soft num">
                {fmtVal(group.teams.reduce((s, t) => s + t.val, 0))} total
              </span>
            </div>
            <div className="space-y-2">
              {group.teams
                .sort((a, b) => b.val - a.val)
                .map((team) => (
                  <div
                    key={team.code}
                    className="flex items-center justify-between py-1.5 border-b border-line last:border-0"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">{team.flag}</span>
                      <span className="text-[13px] font-medium">{team.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="num text-[12px] text-mute">{fmtVal(team.val)}</span>
                      <span className="num text-[10px] text-mute-soft w-8 text-right">#{team.rank}</span>
                    </div>
                  </div>
                ))}
            </div>
          </Card>
        ))}
      </div>

      {/* Players to watch */}
      <SectionHead eyebrow="Stars" title="Players to watch" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 mb-12">
        {PLAYERS_TO_WATCH.map((p) => (
          <Card key={p.name} className="p-4 hover:bg-ink-800 transition cursor-pointer">
            <div className="w-10 h-10 rounded-full bg-ink-700 grid place-items-center text-[13px] font-semibold mb-3">
              {p.name.split(" ").map((n) => n[0]).join("")}
            </div>
            <div className="text-[13px] font-semibold">{p.name}</div>
            <div className="text-[11px] text-mute mt-0.5">{p.country}</div>
            <div className="text-[11px] text-mute mt-0.5">{p.club}</div>
            <div className="num text-[15px] font-bold mt-2">{p.val}</div>
            <div className="text-[10px] text-mute-soft num">{p.age}y</div>
          </Card>
        ))}
      </div>

      {/* Key storylines */}
      <SectionHead eyebrow="Narratives" title="Key storylines" />
      <div className="grid md:grid-cols-2 gap-3 mb-8">
        {[
          {
            title: "Can Yamal become the youngest World Cup star ever?",
            desc: "At 17, Barcelona's prodigy carries Spain's hopes. His €215M valuation says the market already believes.",
          },
          {
            title: "Mbappé vs Haaland: the generational showdown",
            desc: "France and Norway both qualified. If they meet in the knockouts, it's the €363M clash everyone wants.",
          },
          {
            title: "Host advantage: USA's golden generation",
            desc: "Pulisic, McKennie, Reyna, Musah. The USA squad is the most valuable in American soccer history.",
          },
          {
            title: "The Group of Death: Group E",
            desc: "Spain, Germany, Japan, and New Zealand. Two of the top 5 most valuable squads in one group.",
          },
        ].map((s) => (
          <Card key={s.title} className="p-5 hover:bg-ink-800 transition cursor-pointer">
            <h3 className="text-[15px] font-semibold leading-snug">{s.title}</h3>
            <p className="text-[13px] text-mute mt-2 leading-relaxed">{s.desc}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="display text-[24px] num">{value}</div>
      <div className="text-[10px] text-mute-soft uppercase tracking-wider">{label}</div>
    </div>
  );
}
