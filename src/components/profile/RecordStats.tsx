import { BadgeCheck, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReputationView } from "@/lib/receipts/queries";

function Stat({ label, value, tone }: { label: string; value: string; tone?: "up" | "down" }) {
  return (
    <div className="flex-1 min-w-[88px] rounded-xl border border-line bg-ink-850 px-4 py-3.5">
      <div className="text-[10px] uppercase tracking-[0.14em] text-mute-soft num mb-1.5">{label}</div>
      <div className={cn("num display text-[26px] leading-none", tone === "up" && "text-up", tone === "down" && "text-down")}>
        {value}
      </div>
    </div>
  );
}

/**
 * The stat tiles + standing line shared by the private `/record` page and the public
 * `/u/[username]` profile — the numbers are identical either way, only the phrasing of
 * the "not yet ranked" line switches between second person (`self`) and third person.
 */
export function RecordStats({ rep, openCount, self }: { rep: ReputationView; openCount: number; self: boolean }) {
  const scored = rep.wins + rep.losses;
  const remaining = 5 - scored;

  return (
    <>
      <div className="flex flex-wrap gap-2.5 mb-3">
        <Stat label="Record" value={`${rep.wins}–${rep.losses}`} />
        <Stat label="Accuracy" value={rep.accuracyPct != null ? `${rep.accuracyPct}%` : "—"} />
        <Stat
          label="Streak"
          value={rep.streak > 0 ? `W${rep.streak}` : rep.streak < 0 ? `L${-rep.streak}` : "—"}
          tone={rep.streak > 0 ? "up" : rep.streak < 0 ? "down" : undefined}
        />
        <Stat label="Open" value={String(openCount)} />
      </div>
      <div className="flex items-center gap-2 mb-8 text-[11.5px] text-mute-soft">
        {rep.scoutBadge ? (
          <span className="inline-flex items-center gap-1.5 text-acc font-semibold">
            <BadgeCheck size={14} /> Verified scout
          </span>
        ) : scored < 5 ? (
          <span>
            {self
              ? `Make ${remaining} more scored ${remaining === 1 ? "call" : "calls"} to enter the rankings.`
              : "Not yet ranked — fewer than five scored calls."}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5">
            <Trophy size={13} className="text-mute" />{" "}
            {self ? "Ranked — keep calling against the house to climb." : "Ranked"}
          </span>
        )}
      </div>
    </>
  );
}
