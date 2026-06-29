import type { Metadata } from "next";
import Link from "next/link";
import { Check, X, Lock, BadgeCheck, ArrowRight, Trophy } from "lucide-react";
import { Card, Avatar, Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { getSessionUser } from "@/lib/db/supabase-server";
import { getReputation, getMyCalls, type ReceiptCall } from "@/lib/receipts/queries";

// Personal, signed-in record — never cached.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your record — Onside",
  description: "Your public, auto-scored track record of transfer calls — wins, accuracy, streak, and every call you've made.",
};

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

function CallRow({ c }: { c: ReceiptCall }) {
  const pick = PICK_LABEL[c.pick] ?? c.pick;
  const s = c.subject;
  const inner = (
    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3.5 border-b border-line last:border-0 hover:bg-overlay/[0.03] transition">
      <Avatar name={s?.player ?? "?"} src={s?.photoUrl ?? undefined} size={34} />
      <div className="min-w-0">
        <div className="text-[13.5px] font-semibold truncate">{s?.player ?? "Unknown saga"}</div>
        <div className="text-[11.5px] text-mute truncate">
          {s ? <>{s.fromClub} <ArrowRight size={10} className="inline -mt-0.5 text-mute-soft" /> {s.toClub}</> : c.subject?.id}
          <span className="text-mute-soft"> · </span>you called <span className="text-fg font-medium">{pick}</span>
          {c.houseConfidencePct != null && <span className="text-mute-soft num"> · house {c.houseConfidencePct}%</span>}
        </div>
      </div>
      <div className="text-right shrink-0">
        {c.status === "won" ? (
          <span className="inline-flex items-center gap-1 text-up text-[12px] font-bold"><Check size={13} /> Called it <span className="num">+{c.points}</span></span>
        ) : c.status === "lost" ? (
          <span className="inline-flex items-center gap-1 text-down text-[12px] font-bold"><X size={13} /> Missed <span className="num">{c.points}</span></span>
        ) : c.status === "open" ? (
          <span className="inline-flex items-center gap-1 text-mute-soft text-[11px] num"><Lock size={11} /> open · {timeAgo(c.lockedAt)}</span>
        ) : (
          <span className="text-mute-soft text-[11px]">no result</span>
        )}
      </div>
    </div>
  );
  return s ? <Link href={`/transfers/${s.id}`} className="block">{inner}</Link> : <div>{inner}</div>;
}

function SignInPrompt() {
  return (
    <div className="max-w-[560px] mx-auto px-6 py-24 text-center">
      <h1 className="display text-[30px] mb-2">Your record</h1>
      <p className="text-mute mb-6">
        Sign in to make calls on transfer sagas and build a public, auto-scored track record — your receipts, settled
        when each saga does.
      </p>
      <Link href="/login"><Button kind="primary">Sign in</Button></Link>
    </div>
  );
}

export default async function RecordPage() {
  const user = await getSessionUser().catch(() => null);
  if (!user) return <SignInPrompt />;

  const [rep, calls] = await Promise.all([getReputation(user.id), getMyCalls(user.id)]);
  const open = calls.filter((c) => c.status === "open");
  const resolved = calls.filter((c) => c.status !== "open");
  const scored = rep.wins + rep.losses;

  return (
    <div className="max-w-[860px] mx-auto px-6 py-8">
      <div className="mb-7">
        <div className="text-[11px] uppercase tracking-[0.18em] text-mute-soft mb-2 num">Your record</div>
        <h1 className="display text-[clamp(26px,4vw,38px)] leading-[1] tracking-[-0.04em]">
          {scored === 0 ? (
            <>Your record <span className="font-serif italic text-mute">starts here.</span></>
          ) : (
            <>
              <span className="num">{rep.wins}</span>–<span className="num">{rep.losses}</span>
              {rep.accuracyPct != null && (
                <span className="font-serif italic text-up"> · {rep.accuracyPct}% called right.</span>
              )}
            </>
          )}
        </h1>
      </div>

      {/* Reputation stats */}
      <div className="flex flex-wrap gap-2.5 mb-3">
        <Stat label="Record" value={`${rep.wins}–${rep.losses}`} />
        <Stat label="Accuracy" value={rep.accuracyPct != null ? `${rep.accuracyPct}%` : "—"} />
        <Stat label="Streak" value={rep.streak > 0 ? `W${rep.streak}` : rep.streak < 0 ? `L${-rep.streak}` : "—"} tone={rep.streak > 0 ? "up" : rep.streak < 0 ? "down" : undefined} />
        <Stat label="Open" value={String(open.length)} />
      </div>
      <div className="flex items-center gap-2 mb-8 text-[11.5px] text-mute-soft">
        {rep.scoutBadge ? (
          <span className="inline-flex items-center gap-1.5 text-acc font-semibold"><BadgeCheck size={14} /> Verified scout</span>
        ) : scored < 5 ? (
          <span>Make {5 - scored} more scored {5 - scored === 1 ? "call" : "calls"} to enter the rankings.</span>
        ) : (
          <span className="inline-flex items-center gap-1.5"><Trophy size={13} className="text-mute" /> Ranked — keep calling against the house to climb.</span>
        )}
      </div>

      {calls.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="text-[15px] font-semibold mb-1.5">No calls yet.</div>
          <p className="text-mute text-[13px] max-w-[420px] mx-auto mb-6">
            Every story on the Wire shows Onside&apos;s Confidence % — that&apos;s the house. Make your call on whether
            a deal happens; it locks now and scores itself when the saga settles.
          </p>
          <Link href="/transfers"><Button kind="primary">Find a saga to call</Button></Link>
        </Card>
      ) : (
        <>
          {open.length > 0 && (
            <section className="mb-8">
              <h2 className="text-[12px] uppercase tracking-[0.14em] text-mute-soft num mb-2.5">
                Open calls <span className="text-mute">· settle when each saga does</span>
              </h2>
              <Card className="overflow-hidden">{open.map((c) => <CallRow key={c.id} c={c} />)}</Card>
            </section>
          )}
          {resolved.length > 0 && (
            <section>
              <h2 className="text-[12px] uppercase tracking-[0.14em] text-mute-soft num mb-2.5">Settled calls</h2>
              <Card className="overflow-hidden">{resolved.map((c) => <CallRow key={c.id} c={c} />)}</Card>
            </section>
          )}
        </>
      )}
    </div>
  );
}
