import type { Metadata } from "next";
import Link from "next/link";
import { Card, Avatar, SectionHead, Button } from "@/components/ui";
import { getUndervaluedXI, type ValueGap } from "@/lib/queries/insights";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "The Undervalued XI — where Onside sees more than the market | Onside Insights",
  description:
    "An XI of the players the Onside model values furthest above their market price — the biggest valuation gaps, position by position.",
};

const POS_LABEL: Record<string, string> = { GK: "Goalkeeper", DEF: "Defence", MID: "Midfield", FWD: "Attack" };

function Row({ p }: { p: ValueGap }) {
  return (
    <Link href={`/players/${p.slug}`}>
      <div className="grid grid-cols-[1.4fr_80px_80px_92px] items-center gap-2 px-4 py-3 hover:bg-white/[0.03] transition border-b border-line last:border-0 cursor-pointer">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar name={p.name} clubBg={p.clubBg} clubColor={p.clubColor} size={28} />
          <div className="min-w-0">
            <div className="text-[13px] font-medium truncate">{p.name}</div>
            <div className="text-[11px] text-mute truncate">{p.club}</div>
          </div>
        </div>
        <span className="num text-[12px] text-right text-mute">€{p.marketM}M</span>
        <span className="num text-[13px] text-right font-semibold">€{p.onsideM}M</span>
        <span className="num text-[12px] text-right text-up font-semibold">+{p.gapPct}%</span>
      </div>
    </Link>
  );
}

export default async function UndervaluedXiPage() {
  const xi = await getUndervaluedXI().catch(() => []);
  const all = xi.flatMap((g) => g.players);
  const headline = [...all].sort((a, b) => b.gapM - a.gapM)[0];

  return (
    <div className="max-w-[860px] mx-auto px-6 py-8">
      <div className="mb-8">
        <div className="text-[11px] uppercase tracking-[0.18em] text-mute-soft mb-2 num">Insights · Report</div>
        <h1 className="display text-[clamp(26px,4vw,40px)] tracking-tight leading-[1.05] mb-3">
          The Undervalued XI
        </h1>
        <p className="text-mute text-[15px] leading-relaxed max-w-[620px]">
          The players the Onside model rates furthest <span className="text-fg">above</span> their current market price —
          a starting XI of the market&apos;s biggest blind spots.
          {headline && (
            <>
              {" "}
              Leading the way: <Link href={`/players/${headline.slug}`} className="text-acc hover:underline">{headline.name}</Link>,
              valued <span className="num text-up">€{headline.gapM}M</span> above his market fee.
            </>
          )}
        </p>
      </div>

      {all.length === 0 ? (
        <Card className="p-12 text-center text-mute">
          Market-comparison data is loading. <Link href="/players" className="text-acc hover:underline">Browse players</Link> meanwhile.
        </Card>
      ) : (
        <div className="space-y-6">
          {xi.map(
            (g) =>
              g.players.length > 0 && (
                <div key={g.pos}>
                  <SectionHead eyebrow={POS_LABEL[g.pos] ?? g.pos} title="" />
                  <Card className="overflow-hidden">
                    <div className="grid grid-cols-[1.4fr_80px_80px_92px] px-4 py-2 text-[10px] uppercase tracking-wider text-mute-soft num border-b border-line bg-ink-900">
                      <span>Player</span>
                      <span className="text-right">Market</span>
                      <span className="text-right">Onside</span>
                      <span className="text-right">Gap</span>
                    </div>
                    {g.players.map((p) => (
                      <Row key={p.slug} p={p} />
                    ))}
                  </Card>
                </div>
              ),
          )}
        </div>
      )}

      <p className="text-[11px] text-mute-soft mt-6 leading-relaxed">
        &ldquo;Market&rdquo; is the reported transfer-market value; &ldquo;Onside&rdquo; is the live model valuation.
        Gap is how far Onside sits above the market, as a percentage. Model estimate, not a price quote.
      </p>
      <div className="mt-6">
        <Link href="/insights">
          <Button kind="outline" size="sm">← All insights</Button>
        </Link>
      </div>
    </div>
  );
}
