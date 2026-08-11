import type { Metadata } from "next";
import Link from "next/link";
import { Card, SectionHead, Button } from "@/components/ui";
import { getAccuracyReport } from "@/lib/queries/insights";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "The Onside Accuracy Report — how the Confidence % performs | Onside",
  description:
    "Transparency on the Onside Confidence %: the share of rumours we rated highly that went on to be confirmed, graded as the feed resolves.",
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-5 text-center">
      <div className="display text-[40px] num leading-none text-acc">{value}</div>
      <div className="text-[11px] uppercase tracking-[0.14em] text-mute-soft mt-2">{label}</div>
    </Card>
  );
}

export default async function AccuracyReportPage() {
  const a = await getAccuracyReport().catch(() => null);
  const hasData = a && a.resolved > 0;

  return (
    <div className="max-w-[760px] mx-auto px-6 py-8">
      <div className="mb-8">
        <div className="text-[11px] uppercase tracking-[0.18em] text-mute-soft mb-2 num">Insights · Transparency</div>
        <h1 className="display text-[clamp(26px,4vw,40px)] tracking-tight leading-[1.05] mb-3">
          The Onside Accuracy Report
        </h1>
        <p className="text-mute text-[15px] leading-relaxed max-w-[620px]">
          We grade our own Confidence %. As rumours resolve — confirmed or dead — we check how the score we gave them
          held up. The track record is public, on the record.
          {hasData && a.highBandRate != null && (
            <>
              {" "}
              So far, <span className="num text-up">{a.highBandRate}%</span> of rumours we rated 70%+ were confirmed.
            </>
          )}
        </p>
      </div>

      {!hasData ? (
        <Card className="p-12 text-center text-mute text-[13px] leading-relaxed">
          The track record builds as rumours resolve. Once confirmed and dead outcomes accumulate in the feed, this
          report grades how the Confidence % performed — by band and overall.
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 mb-8">
            <Stat label="Rumours resolved" value={String(a.resolved)} />
            <Stat label="Overall hit rate" value={a.hitRate != null ? `${a.hitRate}%` : "—"} />
            <Stat label="70%+ hit rate" value={a.highBandRate != null ? `${a.highBandRate}%` : "—"} />
          </div>

          <SectionHead eyebrow="By confidence band" title="How each band performed" />
          <Card className="overflow-hidden">
            <div className="grid grid-cols-[1fr_90px_90px_80px] px-4 py-2 text-[10px] uppercase tracking-wider text-mute-soft num border-b border-line bg-ink-900">
              <span>Band</span>
              <span className="text-right">Resolved</span>
              <span className="text-right">Confirmed</span>
              <span className="text-right">Rate</span>
            </div>
            {a.bands.map((b) => (
              <div key={b.band} className="grid grid-cols-[1fr_90px_90px_80px] px-4 py-3 items-center border-b border-line last:border-0">
                <span className="text-[13px] font-medium">{b.label}</span>
                <span className="num text-[13px] text-right text-mute">{b.total}</span>
                <span className="num text-[13px] text-right text-mute">{b.confirmed}</span>
                <span className="num text-[13px] text-right font-semibold text-up">{b.rate != null ? `${b.rate}%` : "—"}</span>
              </div>
            ))}
          </Card>
        </>
      )}

      <p className="text-[11px] text-mute-soft mt-6 leading-relaxed">
        Each rumour&apos;s Confidence % is snapshotted at the moment it resolves. &ldquo;Hit rate&rdquo; is the share
        that ended up confirmed. A calibrated model confirms most of its high-confidence calls and few of its low ones.
      </p>
      <div className="mt-6">
        <Link href="/insights">
          <Button kind="outline" size="sm">← All insights</Button>
        </Link>
      </div>
    </div>
  );
}
