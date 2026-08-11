import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BadgeCheck, XCircle } from "lucide-react";
import { Card, Avatar, SectionHead, Button } from "@/components/ui";
import { ConfidenceBadge } from "@/components/transfers/confidence-badge";
import { DiscussionThread } from "@/components/transfers/discussion-thread";
import { OnsideBrief } from "@/components/transfers/onside-brief";
import { StageProgress } from "@/components/transfers/stage-progress";
import { FeeValueBar } from "@/components/transfers/fee-value-bar";
import { JourneyTimeline } from "@/components/transfers/journey-timeline";
import { TrackDealButton } from "@/components/transfers/TrackDealButton";
import { ShareButton } from "@/components/ui/share-button";
import { stageOf } from "@/lib/rumours/stage";
import { getRumourById, getRumourComments, getRumourSources, type RumourSourceItem } from "@/lib/queries/rumours";
import { getFollowedRumourIds } from "@/lib/rumours/follow-actions";
import { getSessionUser } from "@/lib/db/supabase-server";
import { CallChip } from "@/components/transfers/CallChip";
import { getMyOutcomeCall } from "@/lib/receipts/queries";
import { getAuthorReceipts } from "@/lib/profiles/queries";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const r = await getRumourById(id).catch(() => null);
  if (!r) return { title: "Rumour — Onside" };
  return {
    title: `${r.player.name} → ${r.toClub} — ${r.confidence.pct}% Onside Confidence`,
    description: `${r.summary} ${r.reportedFeeM === 0 ? "Free transfer" : r.reportedFeeM != null ? `€${r.reportedFeeM}M reported` : "Fee undisclosed"} vs €${r.onsideValueM}M Onside value.`,
  };
}

export default async function RumourDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await getRumourById(id).catch(() => null);

  if (!r) {
    return (
      <div className="max-w-[760px] mx-auto px-6 py-20 text-center">
        <h1 className="display text-[28px] mb-2">Rumour not found</h1>
        <p className="text-mute mb-6">It may have been removed. See the live feed instead.</p>
        <Link href="/transfers">
          <Button kind="primary">Back to the transfer room</Button>
        </Link>
      </div>
    );
  }

  const [comments, user, trail, followedIds] = await Promise.all([
    getRumourComments(id).catch(() => []),
    getSessionUser().catch(() => null),
    getRumourSources(id).catch(() => [] as RumourSourceItem[]),
    getFollowedRumourIds().catch(() => [] as string[]),
  ]);
  // Sequential by necessity: the receipt join is keyed by the comment authors, so it
  // cannot join the Promise.all above. One extra round trip, three batched reads inside.
  // The catch matters — a failed join degrades every author to "No call on record",
  // which reads as a correct empty state rather than taking down the whole deal page.
  const receipts = Object.fromEntries(
    await getAuthorReceipts(id, comments.map((c) => c.profileId)).catch(() => new Map()),
  );
  // Older rumours predate the sources table — fall back to the primary link.
  const sources: RumourSourceItem[] =
    trail.length > 0
      ? trail
      : r.url
        ? [{ url: r.url, source: r.source, tier: r.sourceTier, seenAt: r.lastUpdate }]
        : [];
  const confirmed = r.status === "confirmed";
  const dead = r.status === "dead";
  const stage = stageOf(r.summary, r.status);
  const following = followedIds.includes(id);
  const myCall = user ? await getMyOutcomeCall(id, user.id).catch(() => null) : null;

  return (
    <div className="max-w-[760px] mx-auto px-6 py-8">
      <Link href="/transfers" className="inline-flex items-center gap-1.5 text-[13px] text-mute hover:text-fg transition mb-6">
        <ArrowLeft size={14} /> Transfer room
      </Link>

      {/* Hero */}
      <div className="flex items-start gap-4">
        <Avatar name={r.player.name} clubBg={r.player.clubBg} clubColor={r.player.clubColor} src={r.player.photoUrl} size={56} ring />
        <div className="flex-1 min-w-0">
          <Link href={`/players/${r.player.slug}`} className="display text-[clamp(22px,3.5vw,30px)] tracking-tight hover:text-acc transition block leading-tight">
            {r.player.name}
          </Link>
          <div className="flex items-center gap-2 text-[14px] text-mute mt-1 min-w-0">
            <span className="truncate">{r.player.fromClub}</span>
            <ArrowRight size={14} className="text-mute-soft shrink-0" />
            <span className="truncate text-fg font-medium">{r.toClub === "—" ? "destination open" : r.toClub}</span>
          </div>
        </div>
        {confirmed ? (
          <span className="inline-flex items-center gap-1 px-3 h-8 rounded-full bg-up/15 text-up border border-up/30 text-[12px] font-bold uppercase shrink-0">
            <BadgeCheck size={14} /> Confirmed
          </span>
        ) : dead ? (
          <span className="inline-flex items-center gap-1 px-3 h-8 rounded-full bg-down/10 text-down border border-down/30 text-[12px] font-bold uppercase shrink-0">
            <XCircle size={14} /> Dead
          </span>
        ) : (
          <ConfidenceBadge pct={r.confidence.pct} band={r.confidence.band} big />
        )}
      </div>

      {/* The evolving lifecycle rail */}
      <StageProgress stage={stage} dead={dead} />

      {/* One-line state of play */}
      <p className="text-[15px] text-mute mt-5 leading-relaxed">{r.summary}</p>

      {/* Actions */}
      <div className="flex items-center gap-5 mt-4">
        {r.status === "rumour" && <TrackDealButton rumourId={id} initialFollowing={following} />}
        <ShareButton title={`${r.player.name} → ${r.toClub} — ${r.confidence.pct}% Onside Confidence`} />
      </div>

      {/* The money read — reported fee vs the live valuation */}
      <div className="mt-6 rounded-xl border border-line bg-ink-850 p-5">
        <div className="text-[11px] uppercase tracking-wider text-mute-soft num mb-3">The money read</div>
        <FeeValueBar feeM={r.reportedFeeM} valueM={r.onsideValueM} />
        <div className="mt-3 text-[11px] text-mute-soft">
          {r.source}
          {r.corroborations > 1 ? ` · +${r.corroborations - 1} more ${r.corroborations === 2 ? "source" : "sources"}` : ""}
        </div>
      </div>

      {/* Your call — inline "you vs the house" receipt (live sagas only, not Here We Go) */}
      {r.status === "rumour" && r.sourceTier !== 0 && (
        <CallChip subjectId={id} houseConfidencePct={r.confidence.pct} signedIn={!!user} myCall={myCall} />
      )}

      {/* The Onside Brief — our written read on the saga, from tracked data */}
      <OnsideBrief r={r} />

      {/* Why we rate it — the confidence factors */}
      {!confirmed && !dead && (
        <Card className="p-6 mt-6">
          <SectionHead eyebrow="Why we rate it" title={`Onside Confidence ${r.confidence.pct}%`} />
          <div className="mt-1">
            {r.confidence.factors.map((f) => (
              <div key={f.key} className="py-2.5 border-b border-line last:border-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[13px] font-medium">{f.label}</span>
                  <span className="text-[11px] text-mute-soft num">{Math.round(f.weight * 100)}% weight</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-ink-700 rounded-full overflow-hidden">
                    <div className="h-full bg-acc rounded-full" style={{ width: `${Math.round(f.score * 100)}%` }} />
                  </div>
                  <span className="text-[11px] text-mute w-[34px] text-right num">{Math.round(f.score * 100)}</span>
                </div>
                <p className="text-[11px] text-mute-soft mt-1">{f.detail}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* The journey — the reporting arc, oldest to newest */}
      <JourneyTimeline sources={sources} />

      {/* Discussion */}
      <div className="mt-8">
        <SectionHead eyebrow="Community" title={`Discussion (${comments.length})`} />
        <DiscussionThread rumourId={id} comments={comments} signedIn={!!user} receipts={receipts} />
      </div>
    </div>
  );
}
