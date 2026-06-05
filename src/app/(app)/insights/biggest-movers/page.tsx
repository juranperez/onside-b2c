import type { Metadata } from "next";
import Link from "next/link";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Card, Avatar, Delta, SectionHead, Button } from "@/components/ui";
import { Sparkline } from "@/components/ui/sparkline";
import { getMovers } from "@/lib/queries";
import type { PlayerListItem } from "@/lib/queries/map";

export const revalidate = 1800;

export const metadata: Metadata = {
  title: "This Week's Biggest Movers — Onside Insights",
  description: "Who is rising and falling on the Onside board over the last week, and by how much.",
};

function MoverRow({ p }: { p: PlayerListItem }) {
  return (
    <Link href={`/players/${p.slug}`}>
      <div className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition border-b border-line last:border-0 cursor-pointer">
        <Avatar name={p.name} clubBg={p.clubBg} clubColor={p.clubColor} size={28} />
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-medium truncate">{p.name}</div>
          <div className="text-[11px] text-mute truncate">{p.club}</div>
        </div>
        <Sparkline points={p.spark} width={44} />
        <div className="text-right shrink-0 w-[78px]">
          <div className="num text-[13px] font-semibold">€{p.val.toFixed(1)}M</div>
          <Delta value={p.dWeek} />
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
  const top = risers[0];

  return (
    <div className="max-w-[960px] mx-auto px-6 py-8">
      <div className="mb-8">
        <div className="text-[11px] uppercase tracking-[0.18em] text-mute-soft mb-2 num">Insights · Weekly</div>
        <h1 className="display text-[clamp(26px,4vw,40px)] tracking-tight leading-[1.05] mb-3">
          This week&apos;s biggest movers
        </h1>
        <p className="text-mute text-[15px] leading-relaxed max-w-[620px]">
          Where the Onside board shifted over the last seven days.
          {top && (
            <>
              {" "}
              <Link href={`/players/${top.slug}`} className="text-acc hover:underline">{top.name}</Link> leads the
              risers, up <span className="num text-up">€{Math.abs(top.dWeek).toFixed(1)}M</span>.
            </>
          )}
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <SectionHead eyebrow="Trending up" title="Risers" action={<TrendingUp size={15} className="text-up" />} />
          <Card className="overflow-hidden">
            {risers.length === 0 ? (
              <div className="p-8 text-center text-mute text-[13px]">No risers to report.</div>
            ) : (
              risers.map((p) => <MoverRow key={p.id} p={p} />)
            )}
          </Card>
        </div>
        <div>
          <SectionHead eyebrow="Trending down" title="Fallers" action={<TrendingDown size={15} className="text-down" />} />
          <Card className="overflow-hidden">
            {fallers.length === 0 ? (
              <div className="p-8 text-center text-mute text-[13px]">No fallers to report.</div>
            ) : (
              fallers.map((p) => <MoverRow key={p.id} p={p} />)
            )}
          </Card>
        </div>
      </div>

      <div className="mt-8">
        <Link href="/insights">
          <Button kind="outline" size="sm">← All insights</Button>
        </Link>
      </div>
    </div>
  );
}
