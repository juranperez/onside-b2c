import Link from "next/link";
import { Check, X, Lock, ArrowRight } from "lucide-react";
import { Card, Avatar } from "@/components/ui";
import type { ReceiptCall } from "@/lib/receipts/queries";

const PICK_LABEL: Record<string, string> = {
  will: "Will happen",
  wont: "Won't happen",
  higher: "Fee higher than value",
  lower: "Fee lower than value",
};

function timeAgo(iso: string): string {
  const mins = (Date.now() - new Date(iso).getTime()) / 60_000;
  if (mins < 60) return `${Math.max(1, Math.floor(mins))}m`;
  if (mins < 60 * 24) return `${Math.floor(mins / 60)}h`;
  const days = Math.floor(mins / (60 * 24));
  return days < 14 ? `${days}d` : `${Math.floor(days / 7)}w`;
}

function CallRow({ c, self }: { c: ReceiptCall; self: boolean }) {
  const pick = PICK_LABEL[c.pick] ?? c.pick;
  const s = c.subject;
  const inner = (
    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3.5 border-b border-line last:border-0 hover:bg-overlay/[0.03] transition">
      <Avatar name={s?.player ?? "?"} src={s?.photoUrl ?? undefined} size={34} />
      <div className="min-w-0">
        <div className="text-[13.5px] font-semibold truncate">{s?.player ?? "Unknown saga"}</div>
        <div className="text-[11.5px] text-mute truncate">
          {s ? (
            <>
              {s.fromClub} <ArrowRight size={10} className="inline -mt-0.5 text-mute-soft" /> {s.toClub}
            </>
          ) : (
            c.subject?.id
          )}
          <span className="text-mute-soft"> · </span>
          {self ? "you called" : "called"} <span className="text-fg font-medium">{pick}</span>
          {c.houseConfidencePct != null && (
            <span className="text-mute-soft num"> · house {c.houseConfidencePct}%</span>
          )}
        </div>
      </div>
      <div className="text-right shrink-0">
        {c.status === "won" ? (
          <span className="inline-flex items-center gap-1 text-up text-[12px] font-bold">
            <Check size={13} /> Called it <span className="num">+{c.points}</span>
          </span>
        ) : c.status === "lost" ? (
          <span className="inline-flex items-center gap-1 text-down text-[12px] font-bold">
            <X size={13} /> Missed <span className="num">{c.points}</span>
          </span>
        ) : c.status === "open" ? (
          <span className="inline-flex items-center gap-1 text-mute-soft text-[11px] num">
            <Lock size={11} /> open · {timeAgo(c.lockedAt)}
          </span>
        ) : (
          <span className="text-mute-soft text-[11px]">no result</span>
        )}
      </div>
    </div>
  );
  return s ? <Link href={`/transfers/${s.id}`} className="block">{inner}</Link> : <div>{inner}</div>;
}

/**
 * Open calls then settled calls, shared by `/record` and `/u/[username]`. Renders
 * nothing when there are no calls at all — the caller owns the empty state, since
 * "no calls yet" (self) and "no calls on record" (public) read differently.
 */
export function CallLog({ calls, self }: { calls: ReceiptCall[]; self: boolean }) {
  const open = calls.filter((c) => c.status === "open");
  const resolved = calls.filter((c) => c.status !== "open");

  return (
    <>
      {open.length > 0 && (
        <section className="mb-8">
          <h2 className="text-[12px] uppercase tracking-[0.14em] text-mute-soft num mb-2.5">
            Open calls <span className="text-mute">· settle when each saga does</span>
          </h2>
          <Card className="overflow-hidden">
            {open.map((c) => <CallRow key={c.id} c={c} self={self} />)}
          </Card>
        </section>
      )}
      {resolved.length > 0 && (
        <section>
          <h2 className="text-[12px] uppercase tracking-[0.14em] text-mute-soft num mb-2.5">Settled calls</h2>
          <Card className="overflow-hidden">
            {resolved.map((c) => <CallRow key={c.id} c={c} self={self} />)}
          </Card>
        </section>
      )}
    </>
  );
}
