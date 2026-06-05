import type { Metadata } from "next";
import Link from "next/link";
import { Radio, Gauge } from "lucide-react";
import { Card, Button, LiveDot } from "@/components/ui";
import { RumourCard } from "@/components/transfers/rumour-card";
import { getRumours, type RumourItem } from "@/lib/queries/rumours";

// Confidence carries a time-decay factor, so keep the feed fresh on every request.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Transfer rumours — live, rated by the Onside Confidence % | Onside",
  description:
    "Every transfer rumour, rated by the Onside Confidence % — a market-anchored credibility score that compares the reported fee to the player's live Onside valuation.",
};

const statusOrder = (s: string) => (s === "rumour" ? 0 : s === "confirmed" ? 1 : 2);

export default async function TransfersPage() {
  let rumours: RumourItem[] = [];
  try {
    rumours = await getRumours();
  } catch (e) {
    console.error("[transfers] data unavailable:", e);
  }
  const sorted = [...rumours].sort(
    (a, b) => statusOrder(a.status) - statusOrder(b.status) || b.confidence.pct - a.confidence.pct,
  );

  return (
    <div className="max-w-[1100px] mx-auto px-6 py-8">
      {/* Hero */}
      <div className="relative rounded-2xl bg-ink-850 border border-line overflow-hidden mb-8">
        <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" />
        <div className="relative p-8 md:p-10">
          <div className="flex items-center gap-2 mb-3">
            <Radio size={15} className="text-acc" />
            <span className="text-[11px] uppercase tracking-[0.18em] text-acc num font-semibold">Transfer room</span>
            <LiveDot />
          </div>
          <h1 className="display text-[clamp(26px,4vw,42px)] tracking-tight leading-[1.05] max-w-[640px]">
            Every rumour, rated. <span className="font-serif italic text-acc">The Onside Confidence&nbsp;%.</span>
          </h1>
          <p className="mt-4 text-mute text-[15px] max-w-[560px] leading-relaxed">
            A market-anchored credibility score on every story — weighing source quality, corroboration, contract
            situation, and crucially whether the reported fee lines up with the player&apos;s live Onside valuation.
            Something only we can compute.
          </p>
          <div className="mt-5 flex items-center gap-4 text-[12px] text-mute-soft flex-wrap">
            <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-up" /> 70%+ strong</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-acc" /> 40–69% watch</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-down" /> &lt;40% weak</span>
          </div>
        </div>
      </div>

      {sorted.length === 0 ? (
        <Card className="p-12 text-center">
          <Gauge size={26} className="mx-auto text-mute-soft mb-3" />
          <h2 className="display text-[22px] mb-1.5">The feed is warming up</h2>
          <p className="text-mute text-[13px] max-w-[440px] mx-auto leading-relaxed">
            Verified rumours will appear here the moment they&apos;re curated — each one scored live by the Onside
            Confidence&nbsp;% against the player&apos;s valuation. No fabricated stories, ever.
          </p>
          <Link href="/players" className="inline-block mt-5">
            <Button kind="primary">Browse players</Button>
          </Link>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {sorted.map((r) => (
            <RumourCard key={r.id} r={r} />
          ))}
        </div>
      )}

      <p className="text-[11px] text-mute-soft mt-6 leading-relaxed">
        Confidence % weights source credibility (45%), corroboration (20%), valuation alignment (20%), contract status
        (10%) and freshness (5%). Rumours are curated from public reporting; the score is a model estimate, not a
        guarantee.
      </p>
    </div>
  );
}
