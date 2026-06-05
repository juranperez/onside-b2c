import type { Metadata } from "next";
import Link from "next/link";
import { TrendingUp, TrendingDown, Mail } from "lucide-react";
import { Card, Avatar, Delta, SectionHead, Button } from "@/components/ui";
import { Sparkline } from "@/components/ui/sparkline";
import { RumourCard } from "@/components/transfers/rumour-card";
import { buildDigest } from "@/lib/digest/build";
import type { PlayerListItem } from "@/lib/queries/map";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "The Board — Onside's weekly digest",
  description: "The week on the board: the biggest valuation movers and the top transfer rumours by Onside Confidence %.",
};

function Row({ p }: { p: PlayerListItem }) {
  return (
    <Link href={`/players/${p.slug}`}>
      <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.03] transition border-b border-line last:border-0 cursor-pointer">
        <Avatar name={p.name} clubBg={p.clubBg} clubColor={p.clubColor} size={26} />
        <span className="text-[13px] font-medium truncate flex-1">{p.name}</span>
        <Sparkline points={p.spark} width={40} />
        <div className="text-right shrink-0 w-[72px]">
          <div className="num text-[12px] font-semibold">€{p.val.toFixed(1)}M</div>
          <Delta value={p.dWeek} />
        </div>
      </div>
    </Link>
  );
}

export default async function TheBoardPage() {
  const d = await buildDigest();

  return (
    <div className="max-w-[760px] mx-auto px-6 py-8">
      <div className="mb-8">
        <div className="text-[11px] uppercase tracking-[0.18em] text-mute-soft mb-2 num">Weekly digest</div>
        <h1 className="display text-[clamp(28px,4vw,44px)] tracking-tight leading-[1.05]">
          The <span className="font-serif italic text-acc">Board</span>.
        </h1>
        <p className="mt-3 text-mute text-[15px] max-w-[560px] leading-relaxed">
          The week on the board — the biggest valuation moves and the top rumours by Confidence %, across{" "}
          <span className="num text-fg">{d.counts.players.toLocaleString()}</span> players.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div>
          <SectionHead eyebrow="This week" title="Risers" action={<TrendingUp size={15} className="text-up" />} />
          <Card className="overflow-hidden">
            {d.risers.length ? d.risers.map((p) => <Row key={p.id} p={p} />) : <div className="p-6 text-center text-mute text-[13px]">Quiet week.</div>}
          </Card>
        </div>
        <div>
          <SectionHead eyebrow="This week" title="Fallers" action={<TrendingDown size={15} className="text-down" />} />
          <Card className="overflow-hidden">
            {d.fallers.length ? d.fallers.map((p) => <Row key={p.id} p={p} />) : <div className="p-6 text-center text-mute text-[13px]">Quiet week.</div>}
          </Card>
        </div>
      </div>

      {d.rumours.length > 0 && (
        <div className="mb-8">
          <SectionHead eyebrow="Transfer room" title="Top rumours this week" />
          <div className="grid md:grid-cols-2 gap-3">
            {d.rumours.map((r) => (
              <RumourCard key={r.id} r={r} />
            ))}
          </div>
        </div>
      )}

      <Card className="p-6 flex items-center justify-between gap-4 flex-wrap border-acc/20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-acc/12 text-acc grid place-items-center">
            <Mail size={17} />
          </div>
          <div>
            <div className="text-[14px] font-semibold">Get The Board in your inbox</div>
            <div className="text-[12px] text-mute">Every Monday — movers + the week&apos;s top rumours.</div>
          </div>
        </div>
        <Link href="/login">
          <Button kind="primary" size="sm">Sign in to subscribe</Button>
        </Link>
      </Card>
    </div>
  );
}
