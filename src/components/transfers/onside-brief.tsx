import { ExternalLink, FileText } from "lucide-react";
import { Card, SectionHead, Chip } from "@/components/ui";
import { stageOf, stageTone, type DealStage } from "@/lib/rumours/stage";
import type { RumourItem, RumourSourceItem } from "@/lib/queries/rumours";

/**
 * The Onside Brief — our own written read on a saga, generated entirely from
 * tracked data (sources, stage, fee vs the live valuation, timeline). Every
 * sentence is templated from facts we hold; nothing is invented. This is the
 * start of Onside-generated editorial: the page stops being a pointer to other
 * people's journalism and becomes the analysis layer on top of it.
 */

const TIER_LABEL: Record<number, string> = { 1: "Tier-1", 2: "Established", 3: "Outlet", 4: "Secondary" };

function fmtDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long" }).format(new Date(iso));
}

function timeAgo(iso: string, now: number): string {
  const mins = (now - new Date(iso).getTime()) / 60_000;
  if (mins < 60) return `${Math.max(1, Math.floor(mins))}m ago`;
  if (mins < 60 * 24) return `${Math.floor(mins / 60)}h ago`;
  const days = Math.floor(mins / (60 * 24));
  return days < 14 ? `${days}d ago` : `${Math.floor(days / 7)}w ago`;
}

function stateOfPlay(r: RumourItem, stage: DealStage): string {
  const opened = fmtDate(r.firstSeen);
  const reports = r.corroborations === 1 ? "a single report" : `${r.corroborations} independent reports`;
  const lead = `led by ${r.source}`;
  if (r.status === "confirmed") {
    return `This one is done. Onside tracked the saga from ${opened} through ${reports} before it was confirmed.`;
  }
  if (r.status === "dead") {
    return `This saga is over — the move did not happen. Onside tracked it from ${opened} across ${reports}, ${lead}.`;
  }
  const stageLine: Record<DealStage, string> = {
    Done: "the deal is being reported as complete, with the official record to follow",
    Medical: "the player is at the medical stage — the final hurdle before an announcement",
    Agreed: "an agreement is in place per the latest reporting; a medical and the official announcement are the steps left",
    Bid: "a formal bid is on the table, which moves this beyond paper talk",
    Talks: "the clubs are talking, but nothing binding has been reported",
    Linked: "this is an early link — no bid, talks or agreement has been reported yet",
  };
  return `Onside has tracked this saga since ${opened}, across ${reports}, ${lead}. As of the latest report, ${stageLine[stage]}.`;
}

function moneyRead(r: RumourItem): string {
  const value = `Onside values ${r.player.name} at €${r.onsideValueM}M on the live board`;
  if (r.reportedFeeM === 0) {
    return `This is a free transfer — ${value}, which makes it pure value gain for ${r.toClub === "—" ? "the buying club" : r.toClub} if it completes.`;
  }
  if (r.reportedFeeM == null) {
    return `No fee has been reported yet. ${value}; expect any serious bid to start from that reference point.`;
  }
  const ratio = r.onsideValueM > 0 ? r.reportedFeeM / r.onsideValueM : null;
  if (ratio == null) return `The reported fee is €${r.reportedFeeM}M. ${value}.`;
  const pct = Math.abs(Math.round((ratio - 1) * 100));
  if (ratio <= 1.1) {
    return `The reported €${r.reportedFeeM}M sits right on the Onside valuation of €${r.onsideValueM}M — a fair price by our model, which adds credibility to the story.`;
  }
  if (ratio <= 1.8) {
    return `The reported €${r.reportedFeeM}M runs ${pct}% above the Onside valuation of €${r.onsideValueM}M — a market premium, common for in-demand profiles, and not in itself a red flag.`;
  }
  return `The reported €${r.reportedFeeM}M is ${pct}% above the Onside valuation of €${r.onsideValueM}M — an aggressive premium our model treats with caution; either the price is inflated or the market knows something the model doesn't yet.`;
}

export function OnsideBrief({ r }: { r: RumourItem }) {
  const stage = stageOf(r.summary, r.status);
  return (
    <Card className="p-6 mt-6">
      <SectionHead eyebrow="Onside analysis" title="The Onside Brief" action={<FileText size={15} className="text-acc" />} />
      <div className="flex items-center gap-2 mt-1 mb-3">
        <Chip tone={stageTone(stage)} className="!px-2 !py-0.5 !text-[10px]">{stage}</Chip>
        <span className="text-[11px] text-mute-soft num">
          {r.corroborations} source{r.corroborations === 1 ? "" : "s"} · since {fmtDate(r.firstSeen)}
        </span>
      </div>
      <div className="space-y-3 text-[13.5px] text-mute leading-relaxed">
        <p>{stateOfPlay(r, stage)}</p>
        <p>{moneyRead(r)}</p>
      </div>
      <p className="text-[10.5px] text-mute-soft mt-4">
        Written by the Onside data engine from tracked reporting, deal stage and the live valuation — updated as the
        saga moves.
      </p>
    </Card>
  );
}

/** The reporting trail — the best articles feeding this rumour, linked out. */
export function SourceTrail({ sources, now }: { sources: RumourSourceItem[]; now: number }) {
  if (!sources.length) return null;
  return (
    <Card className="p-6 mt-6">
      <SectionHead eyebrow="The reporting" title="Where this comes from" />
      <div className="mt-1">
        {sources.map((s) => (
          <a
            key={s.url}
            href={s.url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="flex items-center gap-3 py-2.5 border-b border-line last:border-0 group"
          >
            <span
              className={
                s.tier <= 1
                  ? "inline-flex shrink-0 items-center rounded-full border border-up/30 bg-up/10 text-up px-2 py-0.5 text-[10px] font-semibold num"
                  : s.tier === 2
                    ? "inline-flex shrink-0 items-center rounded-full border border-acc/30 bg-acc/10 text-acc px-2 py-0.5 text-[10px] font-semibold num"
                    : "inline-flex shrink-0 items-center rounded-full border border-line bg-overlay/5 text-mute px-2 py-0.5 text-[10px] font-semibold num"
              }
            >
              {TIER_LABEL[Math.min(4, Math.max(1, s.tier))]}
            </span>
            <span className="text-[13px] font-medium truncate flex-1 group-hover:text-acc transition">{s.source}</span>
            <span className="text-[11px] text-mute-soft num shrink-0">{timeAgo(s.seenAt, now)}</span>
            <ExternalLink size={12} className="text-mute-soft group-hover:text-acc transition shrink-0" />
          </a>
        ))}
      </div>
      <p className="text-[10.5px] text-mute-soft mt-3">
        External links open the original reporting. Onside Confidence weighs each source by track record.
      </p>
    </Card>
  );
}
