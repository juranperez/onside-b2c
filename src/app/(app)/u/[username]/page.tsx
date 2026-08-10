import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, Button } from "@/components/ui";
import { getPublicProfile } from "@/lib/profiles/queries";
import { getReputation, getCallsFor } from "@/lib/receipts/queries";
import { RecordStats } from "@/components/profile/RecordStats";
import { CallLog } from "@/components/profile/CallLog";

export const revalidate = 60;

function memberSince(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params;
  // Metadata generation must never take the page down — a title/description failure
  // here would otherwise 500 the whole route. Unlike the page body below, this catch
  // is deliberate: a missing/errored <head> is a much smaller loss than the page itself.
  const profile = await getPublicProfile(username).catch(() => null);
  if (!profile) return { title: "Profile — Onside" };
  const rep = await getReputation(profile.id).catch(() => null);
  const record = rep && rep.wins + rep.losses > 0 ? `${rep.wins}–${rep.losses}` : "no settled calls yet";
  return {
    title: `@${profile.username} — ${record} on Onside`,
    description: `${profile.displayName ?? profile.username}'s transfer calls on Onside: every call timestamped against the house number at the moment it locked.`,
  };
}

export default async function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  // Deliberately NOT caught, unlike generateMetadata above: getPublicProfile throws on a
  // genuine read failure and returns null only for an unclaimed/nonexistent handle. Letting
  // a real failure propagate 500s the page (which crawlers retry) instead of folding it into
  // notFound()'s 404 (which gets a shareable, search-indexed URL de-indexed). Preserve this
  // asymmetry — see the doc comment on getPublicProfile in src/lib/profiles/queries.ts.
  const profile = await getPublicProfile(username);
  if (!profile) notFound();

  const [rep, calls] = await Promise.all([getReputation(profile.id), getCallsFor(profile.id)]);
  const openCount = calls.filter((c) => c.status === "open").length;
  const scored = rep.wins + rep.losses;

  return (
    <div className="max-w-[860px] mx-auto px-6 py-8">
      <div className="mb-7">
        <div className="text-[11px] uppercase tracking-[0.18em] text-mute-soft mb-2 num">
          @{profile.username}
          {profile.favouriteClub && <span className="text-mute"> · {profile.favouriteClub}</span>}
          <span className="text-mute-soft"> · since {memberSince(profile.createdAt)}</span>
        </div>
        <h1 className="display text-[clamp(26px,4vw,38px)] leading-[1] tracking-[-0.04em]">
          {scored === 0 ? (
            <>
              {profile.displayName ?? `@${profile.username}`}{" "}
              <span className="font-serif italic text-mute">
                {calls.length > 0 ? "has calls on the record." : "hasn't called yet."}
              </span>
            </>
          ) : (
            <>
              <span className="num">{rep.wins}</span>–<span className="num">{rep.losses}</span>
              {rep.accuracyPct != null && <span className="font-serif italic text-up"> · {rep.accuracyPct}% called right.</span>}
            </>
          )}
        </h1>
      </div>

      <RecordStats rep={rep} openCount={openCount} self={false} />

      {calls.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="text-[15px] font-semibold mb-1.5">No calls on record.</div>
          <p className="text-mute text-[13px] max-w-[420px] mx-auto mb-6">
            Every story on the Wire shows Onside&apos;s Confidence % — that&apos;s the house. Make your own
            call and it locks now, scoring itself when the saga settles.
          </p>
          <Link href="/transfers"><Button kind="primary">Find a saga to call</Button></Link>
        </Card>
      ) : (
        <CallLog calls={calls} self={false} />
      )}
    </div>
  );
}
