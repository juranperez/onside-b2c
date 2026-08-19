import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Avatar } from "@/components/ui";
import { CallChipAuto } from "@/components/community/CallChipAuto";
import type { BoardDeal } from "@/lib/community/queries";

/**
 * The homepage's one thing to DO.
 *
 * Everything else above and below it is something to read. This is the only place a
 * first-time visitor can act — and once the anonymous call path lands (plan Task 9) it
 * will need no account, which is the entire point of putting it here.
 */
/**
 * Takes no `signedIn` prop on purpose — see CallChipAuto. Accepting one would mean the
 * homepage had to read the session on the server, which forces the whole route dynamic.
 */
export function CallOfTheDay({ deal }: { deal: BoardDeal }) {
  return (
    <section className="border-b border-line">
      <div className="max-w-[1440px] mx-auto px-6 py-12">
        <div className="max-w-[720px] mx-auto rounded-2xl border border-acc/30 bg-ink-850 p-7">
          <div className="text-[11px] uppercase tracking-[0.18em] text-acc/90 num mb-4">
            Today&apos;s call
          </div>
          <div className="flex items-start gap-4">
            <Avatar name={deal.player.name} clubBg={deal.player.clubBg} clubColor={deal.player.clubColor} src={deal.player.photoUrl} size={48} />
            <div className="min-w-0 flex-1">
              <Link href={`/transfers/${deal.id}`} className="block">
                <div className="display text-[22px] leading-tight tracking-tight hover:text-acc transition">
                  {deal.player.name} → {deal.toClub}
                </div>
              </Link>
              <p className="text-[13px] text-mute mt-1.5 leading-relaxed line-clamp-2">{deal.summary}</p>
              <div className="num text-[13px] mt-3">
                Onside says <span className="text-acc font-semibold">{deal.confidence.pct}%</span> this happens.
              </div>
            </div>
          </div>

          <div className="mt-5">
            <CallChipAuto subjectId={deal.id} houseConfidencePct={deal.confidence.pct} />
          </div>

          <Link href="/community" className="inline-flex items-center gap-1.5 text-[12px] text-mute hover:text-acc transition mt-5">
            See every live deal <ArrowRight size={12} />
          </Link>
        </div>
      </div>
    </section>
  );
}
