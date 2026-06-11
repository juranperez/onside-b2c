import type { Metadata } from "next";
import Link from "next/link";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, Avatar, Delta, SectionHead, Button } from "@/components/ui";
import { Sparkline } from "@/components/ui/sparkline";
import { getMovers, getMoverReasons, type MoverReason } from "@/lib/queries";
import type { PlayerListItem } from "@/lib/queries/map";

export const revalidate = 1800;

export const metadata: Metadata = {
  title: "This Week's Biggest Movers — Onside Insights",
  description: "Who is rising and falling on the Onside board over the last week, by how much, and why.",
};

const REASON_STYLE: Record<MoverReason["kind"], string> = {
  rumour: "bg-acc/10 text-acc border-acc/25",
  confirmed: "bg-up/10 text-up border-up/25",
  injury: "bg-down/10 text-down border-down/25",
  worldcup: "bg-up/10 text-up border-up/25",
  model: "bg-overlay/5 text-mute-soft border-line",
};

function ReasonChip({ reason }: { reason?: MoverReason }) {
  if (!reason) return null;
  return (
    <span
      className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium truncate max-w-full", REASON_STYLE[reason.kind])}
      title={reason.kind === "model" ? "No external catalyst — the model is re-pricing within its confidence band." : undefined}
    >
      {reason.text}
    </span>
  );
}

/** Weekly move as a percentage of the starting value. */
function pctOf(p: PlayerListItem): number | null {
  const before = p.val - p.dWeek;
  if (before <= 0) return null;
  return Math.round((p.dWeek / before) * 1000) / 10;
}

function HeroMover({ p, label, reason }: { p: PlayerListItem; label: string; reason?: MoverReason }) {
  const up = p.dWeek >= 0;
  const pct = pctOf(p);
  return (
    <Link href={`/players/${p.slug}`} className="block">
      <Card className={cn("p-5 h-full hover:bg-ink-800 transition cursor-pointer border-l-2", up ? "border-l-up" : "border-l-down")}>
        <div className="flex items-center gap-2 mb-4 text-[10px] uppercase tracking-[0.16em] num font-bold text-mute-soft">
          {up ? <TrendingUp size={12} className="text-up" /> : <TrendingDown size={12} className="text-down" />}
          {label}
        </div>
        <div className="flex items-center gap-4">
          <Avatar name={p.displayName} clubBg={p.clubBg} clubColor={p.clubColor} src={p.photoUrl} size={56} ring />
          <div className="min-w-0 flex-1">
            <div className="text-[17px] font-bold tracking-tight truncate">{p.displayName}</div>
            <div className="text-[12px] text-mute truncate">{p.club} · {p.detailedPos ?? p.pos}</div>
            <div className="mt-1.5">
              <ReasonChip reason={reason} />
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="num text-[22px] font-bold leading-none">€{p.val.toFixed(1)}M</div>
            <div className="mt-1.5 flex items-center justify-end gap-1.5">
              <Delta value={p.dWeek} big />
              {pct != null && <span className={cn("num text-[11px] font-semibold", up ? "text-up" : "text-down")}>({pct > 0 ? "+" : ""}{pct}%)</span>}
            </div>
          </div>
        </div>
        <div className="mt-4">
          <Sparkline points={p.spark} width={280} />
        </div>
      </Card>
    </Link>
  );
}

function MoverRow({ p, rank, reason }: { p: PlayerListItem; rank: number; reason?: MoverReason }) {
  const pct = pctOf(p);
  const up = p.dWeek >= 0;
  return (
    <Link href={`/players/${p.slug}`}>
      <div className="flex items-center gap-3 px-4 py-3 hover:bg-overlay/[0.03] transition border-b border-line last:border-0 cursor-pointer">
        <span className="num text-[11px] text-mute-soft w-4 shrink-0">{rank}</span>
        <Avatar name={p.displayName} clubBg={p.clubBg} clubColor={p.clubColor} src={p.photoUrl} size={30} />
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-semibold truncate">{p.displayName}</div>
          <div className="flex items-center gap-2 mt-0.5 min-w-0">
            <span className="text-[11px] text-mute truncate shrink-0">{p.club}</span>
            <ReasonChip reason={reason} />
          </div>
        </div>
        <Sparkline points={p.spark} width={44} />
        <div className="text-right shrink-0 w-[96px]">
          <div className="num text-[13.5px] font-bold">€{p.val.toFixed(1)}M</div>
          <div className="flex items-center justify-end gap-1">
            <Delta value={p.dWeek} />
            {pct != null && <span className={cn("num text-[10px]", up ? "text-up" : "text-down")}>({pct > 0 ? "+" : ""}{pct}%)</span>}
          </div>
        </div>
      </div>
    </Link>
  );
}

export default async function BiggestMoversPage() {
  const [risers, fallers] = await Promise.all([
    getMovers(10, "up").catch(() => []),
    getMovers(10, "down").catch(() => []),
  ]);
  const reasons = await getMoverReasons([...risers, ...fallers].map((p) => p.id)).catch(() => ({} as Record<string, MoverReason>));
  const topRiser = risers[0];
  const topFaller = fallers[0];

  return (
    <div className="max-w-[1000px] mx-auto px-6 py-8">
      <div className="mb-7">
        <div className="text-[11px] uppercase tracking-[0.18em] text-mute-soft mb-2 num">Insights · Weekly</div>
        <h1 className="display text-[clamp(26px,4vw,40px)] tracking-tight leading-[1.05] mb-3">
          This week&apos;s biggest movers
        </h1>
        <p className="text-mute text-[15px] leading-relaxed max-w-[640px]">
          Where the Onside board shifted over the last seven days — and the real-world signal behind each move
          where one exists.
        </p>
      </div>

      {(topRiser || topFaller) && (
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          {topRiser && <HeroMover p={topRiser} label="Riser of the week" reason={reasons[topRiser.id]} />}
          {topFaller && <HeroMover p={topFaller} label="Faller of the week" reason={reasons[topFaller.id]} />}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <SectionHead eyebrow="Trending up" title="Risers" action={<TrendingUp size={15} className="text-up" />} />
          <Card className="overflow-hidden">
            {risers.length === 0 ? (
              <div className="p-8 text-center text-mute text-[13px]">No risers to report.</div>
            ) : (
              risers.map((p, i) => <MoverRow key={p.id} p={p} rank={i + 1} reason={reasons[p.id]} />)
            )}
          </Card>
        </div>
        <div>
          <SectionHead eyebrow="Trending down" title="Fallers" action={<TrendingDown size={15} className="text-down" />} />
          <Card className="overflow-hidden">
            {fallers.length === 0 ? (
              <div className="p-8 text-center text-mute text-[13px]">No fallers to report.</div>
            ) : (
              fallers.map((p, i) => <MoverRow key={p.id} p={p} rank={i + 1} reason={reasons[p.id]} />)
            )}
          </Card>
        </div>
      </div>

      <p className="text-[11px] text-mute-soft mt-6 leading-relaxed">
        Moves are weekly changes in the live Onside valuation. Chips show real catalysts — transfer talk, done deals,
        injuries, World Cup duty; &ldquo;Model re-pricing&rdquo; means the model adjusted within its confidence band
        with no external trigger.
      </p>

      <div className="mt-6">
        <Link href="/insights">
          <Button kind="outline" size="sm">← All insights</Button>
        </Link>
      </div>
    </div>
  );
}
