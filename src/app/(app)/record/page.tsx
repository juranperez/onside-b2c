import type { Metadata } from "next";
import Link from "next/link";
import { Card, Button } from "@/components/ui";
import { getSessionUser } from "@/lib/db/supabase-server";
import { getReputation, getCallsFor } from "@/lib/receipts/queries";
import { getMyProfileBasics } from "@/lib/profiles/queries";
import { RecordStats } from "@/components/profile/RecordStats";
import { CallLog } from "@/components/profile/CallLog";
import { ClaimHandle } from "@/components/profile/ClaimHandle";
import { FavouriteClub } from "@/components/profile/FavouriteClub";

// Personal, signed-in record — never cached.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your record — Onside",
  description: "Your public, auto-scored track record of transfer calls — wins, accuracy, streak, and every call you've made.",
};

function SignInPrompt() {
  return (
    <div className="max-w-[560px] mx-auto px-6 py-24 text-center">
      <h1 className="display text-[30px] mb-2">Your record</h1>
      <p className="text-mute mb-6">
        Sign in to make calls on transfer sagas and build a public, auto-scored track record — your
        receipts, settled when each saga does.
      </p>
      <Link href="/login"><Button kind="primary">Sign in</Button></Link>
    </div>
  );
}

/**
 * Your record — the same surface strangers see at `/u/[username]`, plus the controls
 * only you get.
 *
 * Deliberately one render rather than two: `RecordStats` and `CallLog` are shared with
 * the public profile and take a `self` flag that switches person ("you called" vs
 * "called"). A second private call-log implementation here is how the two drift.
 */
export default async function RecordPage() {
  const user = await getSessionUser().catch(() => null);
  if (!user) return <SignInPrompt />;

  const [rep, calls, me] = await Promise.all([
    getReputation(user.id),
    getCallsFor(user.id),
    getMyProfileBasics(user.id),
  ]);
  const { username, favouriteClub } = me;
  const openCount = calls.filter((c) => c.status === "open").length;
  const scored = rep.wins + rep.losses;

  return (
    <div className="max-w-[860px] mx-auto px-6 py-8">
      <div className="mb-7">
        <div className="text-[11px] uppercase tracking-[0.18em] text-mute-soft mb-2 num">
          Your record
          {username && (
            <>
              <span className="text-mute-soft"> · </span>
              <Link href={`/u/${username}`} className="text-acc hover:underline">@{username}</Link>
            </>
          )}
        </div>
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

      {/* No handle, no public page — this is the control that gates everything else. */}
      {!username && <ClaimHandle />}
      <FavouriteClub current={favouriteClub} />

      <RecordStats rep={rep} openCount={openCount} self />

      {calls.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="text-[15px] font-semibold mb-1.5">No calls yet.</div>
          <p className="text-mute text-[13px] max-w-[420px] mx-auto mb-6">
            Every story on the Wire shows Onside&apos;s Confidence % — that&apos;s the house. Make your call
            on whether a deal happens; it locks now and scores itself when the saga settles.
          </p>
          <Link href="/transfers"><Button kind="primary">Find a saga to call</Button></Link>
        </Card>
      ) : (
        <CallLog calls={calls} self />
      )}
    </div>
  );
}
