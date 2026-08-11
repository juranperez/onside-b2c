import Link from "next/link";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Card, SectionHead } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { ClubWindow as ClubWindowData, WindowDeal } from "@/lib/clubs/window";

const money = (m: number) => (Math.abs(m) >= 1000 ? `€${(m / 1000).toFixed(2)}B` : `€${Math.round(m)}M`);

function Superlative({
  deal,
  kind,
}: {
  deal: WindowDeal;
  kind: "overpay" | "bargain";
}) {
  const overpay = kind === "overpay";
  return (
    <Link href={`/players/${deal.playerSlug}`} className="block">
      <Card className="p-4 hover:bg-ink-800 transition h-full">
        <div className="flex items-center gap-1.5 text-mute-soft mb-2">
          {overpay ? <TrendingUp size={13} className="text-down" /> : <TrendingDown size={13} className="text-up" />}
          <span className="text-[10px] uppercase tracking-[0.14em] num">
            {overpay ? "Biggest overpay" : "Biggest bargain"}
          </span>
        </div>
        <div className="text-[15px] font-semibold truncate">{deal.player}</div>
        <div className="text-[12px] text-mute num mt-0.5">
          {money(deal.feeM)} paid · we had him at {money(deal.valueM)}
        </div>
        <div className={cn("num text-[13px] font-bold mt-1", overpay ? "text-down" : "text-up")}>
          {overpay ? "+" : "−"}
          {money(Math.abs(deal.diffM))}
        </div>
      </Card>
    </Link>
  );
}

/**
 * The club's window read against our own valuations.
 *
 * Rendered only when there is something to measure — `clubWindowFrom` returns null when
 * a club has no priced confirmed incoming deals, which is most clubs. A zeroed panel
 * would read as a finding ("they spent nothing") when the truth is that we have no data.
 */
export function ClubWindow({ w, clubName }: { w: ClubWindowData; clubName: string }) {
  const over = w.netM > 0;
  return (
    <div>
      <SectionHead eyebrow="The window" title={`What ${clubName} paid vs what we had them at`} />
      <div className="grid gap-3 md:grid-cols-3">
        <Card className="p-4">
          <div className="text-[10px] uppercase tracking-[0.14em] text-mute-soft num mb-2">Spent</div>
          <div className="display num text-[24px] leading-none">{money(w.spendM)}</div>
          <div className="text-[11px] text-mute-soft mt-1.5 num">
            {w.dealCount} priced {w.dealCount === 1 ? "signing" : "signings"}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-[10px] uppercase tracking-[0.14em] text-mute-soft num mb-2">Our valuation</div>
          <div className="display num text-[24px] leading-none">{money(w.valueM)}</div>
          <div className="text-[11px] text-mute-soft mt-1.5">for the same players</div>
        </Card>
        <Card className="p-4">
          <div className="text-[10px] uppercase tracking-[0.14em] text-mute-soft num mb-2">Net</div>
          <div className={cn("display num text-[24px] leading-none", over ? "text-down" : "text-up")}>
            {over ? "+" : "−"}
            {money(Math.abs(w.netM))}
          </div>
          <div className="text-[11px] text-mute-soft mt-1.5">{over ? "over our number" : "under our number"}</div>
        </Card>
      </div>
      {(w.biggestOverpay || w.biggestBargain) && (
        <div className="grid gap-3 md:grid-cols-2 mt-3">
          {w.biggestOverpay && <Superlative deal={w.biggestOverpay} kind="overpay" />}
          {w.biggestBargain && <Superlative deal={w.biggestBargain} kind="bargain" />}
        </div>
      )}
      <p className="text-[11px] text-mute-soft mt-3">
        Confirmed incoming deals with a reported fee only. Undisclosed fees are excluded — an unknown
        fee tells us nothing about spend.
        {w.unvaluedCount > 0 && (
          <>
            {" "}
            <span className="text-mute">
              A further {w.unvaluedCount} {w.unvaluedCount === 1 ? "signing" : "signings"} worth{" "}
              {money(w.unvaluedSpendM)} {w.unvaluedCount === 1 ? "is" : "are"} left out of these figures
              entirely — we carry no valuation for {w.unvaluedCount === 1 ? "that player" : "those players"},
              and scoring {w.unvaluedCount === 1 ? "him" : "them"} at zero would invent an overpay.
            </span>
          </>
        )}{" "}
        Valuations are live Onside model estimates, not market quotes.
      </p>
    </div>
  );
}
