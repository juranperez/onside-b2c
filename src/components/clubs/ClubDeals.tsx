import { ArrowDownLeft, ArrowUpRight, MessageSquare, Lock } from "lucide-react";
import { SectionHead } from "@/components/ui";
import { RumourCard } from "@/components/transfers/rumour-card";
import type { ClubDealItem } from "@/lib/queries/rumours";

/**
 * Live deals for one club, ranked by argument.
 *
 * "Argument" is calls + comments — the deals people are actually contesting float up,
 * and the tie-break falls through to confidence then recency so the order is still
 * sensible while engagement is near zero (which it is today: 11 calls and 2 comments
 * across the whole platform).
 *
 * The call chip deliberately lives on the deal page rather than here. Rendering it per
 * card would need each viewer's existing call for every deal on the page, and a chip is
 * a commitment device — it belongs where someone has read the story, not on a grid.
 */
export function ClubDeals({ deals, clubName }: { deals: ClubDealItem[]; clubName: string }) {
  const incoming = deals.filter((d) => d.direction === "in").length;
  const outgoing = deals.length - incoming;

  return (
    <div>
      <SectionHead
        eyebrow="Transfer room"
        title={`${deals.length} live ${deals.length === 1 ? "deal" : "deals"} around ${clubName}`}
      />
      <div className="flex items-center gap-4 text-[11.5px] text-mute-soft mb-3 num">
        {incoming > 0 && (
          <span className="inline-flex items-center gap-1">
            <ArrowDownLeft size={12} className="text-up" /> {incoming} in
          </span>
        )}
        {outgoing > 0 && (
          <span className="inline-flex items-center gap-1">
            <ArrowUpRight size={12} className="text-down" /> {outgoing} out
          </span>
        )}
        <span className="text-mute-soft">Most argued first</span>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        {deals.map((d) => (
          <div key={d.id}>
            <RumourCard r={d} />
            {d.argument > 0 && (
              <div className="flex items-center gap-3 px-4 py-1.5 text-[11px] text-mute-soft num">
                {d.calls > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <Lock size={11} /> {d.calls} {d.calls === 1 ? "call" : "calls"}
                  </span>
                )}
                {d.comments > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <MessageSquare size={11} /> {d.comments}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
