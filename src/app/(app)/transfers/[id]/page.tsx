import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BadgeCheck, XCircle } from "lucide-react";
import { Card, Avatar, SectionHead, Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { ConfidenceBadge } from "@/components/transfers/confidence-badge";
import { DiscussionThread } from "@/components/transfers/discussion-thread";
import { OnsideBrief, SourceTrail } from "@/components/transfers/onside-brief";
import { ShareButton } from "@/components/ui/share-button";
import { getRumourById, getRumourComments, getRumourSources, type RumourSourceItem } from "@/lib/queries/rumours";
import { getSessionUser } from "@/lib/db/supabase-server";

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

  const [comments, user, trail] = await Promise.all([
    getRumourComments(id).catch(() => []),
    getSessionUser().catch(() => null),
    getRumourSources(id).catch(() => [] as RumourSourceItem[]),
  ]);
  // Older rumours predate the sources table — fall back to the primary link.
  const sources: RumourSourceItem[] =
    trail.length > 0
      ? trail
      : r.url
        ? [{ url: r.url, source: r.source, tier: r.sourceTier, seenAt: r.lastUpdate }]
        : [];
  const nowTs = new Date().getTime();
  const confirmed = r.status === "confirmed";
  const dead = r.status === "dead";

  return (
    <div className="max-w-[760px] mx-auto px-6 py-8">
      <Link href="/transfers" className="inline-flex items-center gap-1.5 text-[13px] text-mute hover:text-fg transition mb-6">
        <ArrowLeft size={14} /> Transfer room
      </Link>

      <div className="flex items-start gap-4">
        <Avatar name={r.player.name} clubBg={r.player.clubBg} clubColor={r.player.clubColor} src={r.player.photoUrl} size={56} ring />
        <div className="flex-1 min-w-0">
          <Link href={`/players/${r.player.slug}`} className="display text-[clamp(22px,3.5vw,30px)] tracking-tight hover:text-acc transition block leading-tight">
            {r.player.name}
          </Link>
          <div className="flex items-center gap-2 text-[14px] text-mute mt-1 min-w-0">
            <span className="truncate">{r.player.fromClub}</span>
            <ArrowRight size={14} className="text-mute-soft shrink-0" />
            <span className="truncate text-fg font-medium">{r.toClub}</span>
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

      <p className="text-[15px] text-mute mt-4 leading-relaxed">{r.summary}</p>

      <div className="flex items-center gap-2 mt-4 text-[13px] flex-wrap">
        {r.reportedFeeM === 0 ? (
          <span className="num font-semibold text-up">Free transfer</span>
        ) : r.reportedFeeM != null ? (
          <span className="num font-semibold">€{r.reportedFeeM}M reported</span>
        ) : (
          <span className="text-mute-soft">Fee undisclosed</span>
        )}
        <span className="text-mute-soft">vs</span>
        <span className="num text-mute">€{r.onsideValueM}M Onside value</span>
        <span className="mx-1 text-mute-soft">·</span>
        <span className="text-mute-soft">
          {r.source}
          {r.corroborations > 1 ? ` +${r.corroborations - 1}` : ""}
        </span>
        <span className="ml-auto">
          <ShareButton title={`${r.player.name} → ${r.toClub} — ${r.confidence.pct}% Onside Confidence`} />
        </span>
      </div>

      {/* The Onside Brief — our own read on the saga, from tracked data */}
      <OnsideBrief r={r} />

      {/* Confidence breakdown */}
      {!confirmed && !dead && (
        <Card className="p-6 mt-6">
          <SectionHead eyebrow="How we scored it" title={`Onside Confidence ${r.confidence.pct}%`} />
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

      {/* The reporting trail — best sources, linked out */}
      <SourceTrail sources={sources} now={nowTs} />

      {/* Discussion */}
      <div className="mt-8">
        <SectionHead eyebrow="Community" title={`Discussion (${comments.length})`} />
        <DiscussionThread rumourId={id} comments={comments} signedIn={!!user} />
      </div>
    </div>
  );
}
