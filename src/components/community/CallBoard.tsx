import Link from "next/link";
import { MessageSquare, Lock } from "lucide-react";
import { Card, Avatar } from "@/components/ui";
import { CallChipAuto } from "@/components/community/CallChipAuto";
import type { BoardDeal } from "@/lib/community/queries";

/**
 * One row per live deal: who is moving where, what Onside thinks, and a one-tap
 * disagreement. The chip is the point — a board you can only read is a list.
 */
/**
 * Takes no `signedIn` prop: CallChipAuto resolves both the session and any existing call
 * in the browser, so every surface that renders a chip behaves identically whether or not
 * its page can read cookies during render.
 */
export function CallBoard({ deals }: { deals: BoardDeal[] }) {
  return (
    <div className="space-y-2.5">
      {deals.map((d) => (
        <Card key={d.id} className="p-4">
          <div className="flex items-start gap-3">
            <Avatar name={d.player.name} clubBg={d.player.clubBg} clubColor={d.player.clubColor} src={d.player.photoUrl} size={38} />
            <div className="min-w-0 flex-1">
              <Link href={`/transfers/${d.id}`} className="block">
                <div className="text-[14px] font-semibold truncate hover:text-acc transition">
                  {d.player.name} → {d.toClub}
                </div>
                <div className="text-[12px] text-mute truncate mt-0.5">{d.summary}</div>
              </Link>
              <div className="flex items-center gap-3 mt-1.5 text-[11px] text-mute-soft num">
                <span>Onside says {d.confidence.pct}%</span>
                {d.calls > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <Lock size={10} /> {d.calls}
                  </span>
                )}
                {d.comments > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <MessageSquare size={10} /> {d.comments}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="mt-3">
            <CallChipAuto subjectId={d.id} houseConfidencePct={d.confidence.pct} />
          </div>
        </Card>
      ))}
    </div>
  );
}
