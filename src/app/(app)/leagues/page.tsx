import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, Button } from "@/components/ui";
import { fmtVal } from "@/lib/utils";

const LEAGUES = [
  { slug: "premier-league", name: "Premier League", country: "England", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", clubs: 20, totalVal: 12800, avgAge: 26.4, topScorer: "Haaland (28)", topAssist: "Saka (14)" },
  { slug: "la-liga", name: "La Liga", country: "Spain", flag: "🇪🇸", clubs: 20, totalVal: 9200, avgAge: 26.8, topScorer: "Mbappé (24)", topAssist: "Yamal (16)" },
  { slug: "bundesliga", name: "Bundesliga", country: "Germany", flag: "🇩🇪", clubs: 18, totalVal: 7400, avgAge: 25.9, topScorer: "Kane (26)", topAssist: "Wirtz (12)" },
  { slug: "serie-a", name: "Serie A", country: "Italy", flag: "🇮🇹", clubs: 20, totalVal: 7100, avgAge: 27.1, topScorer: "Lautaro (22)", topAssist: "Lookman (10)" },
  { slug: "ligue-1", name: "Ligue 1", country: "France", flag: "🇫🇷", clubs: 18, totalVal: 5200, avgAge: 25.6, topScorer: "Doué (15)", topAssist: "Ramos (8)" },
];

export default function LeaguesPage() {
  return (
    <div className="max-w-[1440px] mx-auto px-6 py-8">
      <div className="mb-7">
        <div className="text-[11px] uppercase tracking-[0.18em] text-mute-soft mb-2 num">Leagues</div>
        <h1 className="display text-[clamp(28px,4vw,40px)] leading-[1] tracking-[-0.04em]">
          The Big <span className="num">5</span>.{" "}
          <span className="font-serif italic text-acc">Compared.</span>
        </h1>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {LEAGUES.map((league) => (
          <Link key={league.slug} href={`/leagues/${league.slug}`}>
            <Card className="p-6 hover:bg-ink-800 transition cursor-pointer h-full">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">{league.flag}</span>
                <div>
                  <div className="text-[16px] font-semibold">{league.name}</div>
                  <div className="text-[12px] text-mute">{league.country}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <div className="num display text-[28px] leading-none text-up">{fmtVal(league.totalVal)}</div>
                  <div className="text-[10px] text-mute-soft mt-1">Total market value</div>
                </div>
                <div>
                  <div className="num display text-[28px] leading-none">{league.clubs}</div>
                  <div className="text-[10px] text-mute-soft mt-1">Clubs</div>
                </div>
              </div>

              <div className="space-y-1.5 text-[12px]">
                <div className="flex justify-between"><span className="text-mute">Avg age</span><span className="num">{league.avgAge}</span></div>
                <div className="flex justify-between"><span className="text-mute">Top scorer</span><span className="num">{league.topScorer}</span></div>
                <div className="flex justify-between"><span className="text-mute">Top assists</span><span className="num">{league.topAssist}</span></div>
              </div>

              <Button kind="ghost" size="sm" className="w-full mt-4" icon={<ArrowRight size={12} />}>
                View league
              </Button>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
