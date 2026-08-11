import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { Card, SectionHead } from "@/components/ui";
import type { ClubCaller } from "@/lib/clubs/leaderboard";

/**
 * The best callers of this club's deals.
 *
 * Club-scoped, never global: a global board rewards the top 1% and tells everyone else
 * they are losing, while a club board is small, tribal and winnable. Rendered only when
 * `getClubLeaderboard` clears its minimum — it returns an empty array rather than a list
 * of one, so there is no "leaderboard" here with a single name on it.
 */
export function ClubLeaderboard({ callers, clubName }: { callers: ClubCaller[]; clubName: string }) {
  return (
    <div>
      <SectionHead eyebrow="Receipts" title={`Best callers of ${clubName} deals`} />
      <Card className="overflow-hidden">
        {callers.map((c, i) => (
          <Link
            key={c.username}
            href={`/u/${c.username}`}
            className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3 border-b border-line last:border-0 hover:bg-overlay/[0.03] transition"
          >
            <span className="num text-[12px] text-mute-soft w-5 text-right">{i + 1}</span>
            <span className="min-w-0">
              <span className="text-[13.5px] font-semibold truncate inline-flex items-center gap-1.5">
                {c.displayName ?? `@${c.username}`}
                {c.scoutBadge && <BadgeCheck size={13} className="text-acc shrink-0" />}
              </span>
              <span className="block text-[11.5px] text-mute-soft num">
                @{c.username} · {c.callsHere} {c.callsHere === 1 ? "call" : "calls"} here
              </span>
            </span>
            <span className="text-right shrink-0 num text-[12.5px]">
              <span className="font-semibold">
                {c.wins}–{c.losses}
              </span>
              {c.accuracyPct != null && <span className="text-mute-soft"> · {c.accuracyPct}%</span>}
            </span>
          </Link>
        ))}
      </Card>
    </div>
  );
}
