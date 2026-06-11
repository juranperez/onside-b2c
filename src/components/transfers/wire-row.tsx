import Link from "next/link";
import { ArrowRight, MessageSquare, BadgeCheck, XCircle, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, Chip } from "@/components/ui";
import { ConfidenceBadge } from "./confidence-badge";
import { stageOf, stageTone } from "@/lib/rumours/stage";
import type { RumourItem } from "@/lib/queries/rumours";

function timeAgo(iso: string): string {
  const mins = (Date.now() - new Date(iso).getTime()) / 60_000;
  if (mins < 60) return `${Math.max(1, Math.floor(mins))}m`;
  if (mins < 60 * 24) return `${Math.floor(mins / 60)}h`;
  const days = Math.floor(mins / (60 * 24));
  return days < 14 ? `${days}d` : `${Math.floor(days / 7)}w`;
}

function feeTone(feeM: number | null, valueM: number): { label: string; cls: string } | null {
  if (feeM == null || valueM <= 0) return null;
  const r = feeM / valueM;
  if (r <= 1.1) return { label: "fair", cls: "text-up" };
  if (r <= 1.8) return { label: "above value", cls: "text-acc" };
  return { label: "overpay", cls: "text-down" };
}

/** One story on the Wire: who, where, how far along, how credible, priced against the model. */
export function WireRow({ r, comments = 0 }: { r: RumourItem; comments?: number }) {
  const ageH = (Date.now() - new Date(r.lastUpdate).getTime()) / 3_600_000;
  const breaking = r.status === "rumour" && r.sourceTier <= 2 && ageH < 2;
  const stage = stageOf(r.summary, r.status);
  const verdict = feeTone(r.reportedFeeM, r.onsideValueM);
  const dead = r.status === "dead";

  return (
    <div
      className={cn(
        "relative rounded-xl border bg-ink-850 px-4 py-3.5 transition hover:bg-ink-800",
        breaking ? "border-acc/40" : "border-line",
        dead && "opacity-55",
      )}
    >
      {breaking && (
        <span className="absolute -top-2 left-3 inline-flex items-center gap-1 rounded-full bg-acc text-ink-950 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider">
          <Zap size={9} strokeWidth={3} /> Breaking
        </span>
      )}
      <div className="flex items-start gap-3">
        <Avatar name={r.player.name} clubBg={r.player.clubBg} clubColor={r.player.clubColor} src={r.player.photoUrl} size={38} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <Link
              href={`/players/${r.player.slug}`}
              className={cn("text-[13.5px] font-semibold hover:text-acc transition truncate", dead && "line-through")}
            >
              {r.player.name}
            </Link>
            <span className="inline-flex items-center gap-1 text-[12px] text-mute min-w-0">
              <span className="truncate max-w-[120px]">{r.player.fromClub}</span>
              <ArrowRight size={11} className="text-mute-soft shrink-0" />
              <span className={cn("truncate max-w-[140px] font-medium", r.toClub === "—" ? "text-mute-soft" : "text-fg")}>
                {r.toClub === "—" ? "destination open" : r.toClub}
              </span>
            </span>
          </div>

          <p className="text-[12px] text-mute mt-1 leading-snug line-clamp-2">{r.summary}</p>

          <div className="flex items-center gap-2 mt-2 flex-wrap text-[10.5px] text-mute-soft">
            <Chip tone={stageTone(stage)} className="!px-2 !py-0.5 !text-[10px]">{stage}</Chip>
            <span className="truncate max-w-[160px]">{r.source}</span>
            {r.corroborations > 1 && <span className="num">+{r.corroborations - 1} sources</span>}
            {r.league && <span className="truncate max-w-[110px]">{r.league}</span>}
            <span className="num">{timeAgo(r.lastUpdate)} ago</span>
            <Link href={`/transfers/${r.id}`} className="inline-flex items-center gap-1 text-mute hover:text-acc transition ml-auto">
              <MessageSquare size={11} />
              <span className="num">{comments}</span>
            </Link>
          </div>
        </div>

        <div className="shrink-0 flex flex-col items-end gap-1.5">
          {r.status === "confirmed" ? (
            <span className="inline-flex items-center gap-1 px-2 h-6 rounded-full bg-up/15 text-up border border-up/30 text-[10px] font-bold uppercase tracking-wide">
              <BadgeCheck size={11} /> Done
            </span>
          ) : dead ? (
            <span className="inline-flex items-center gap-1 px-2 h-6 rounded-full bg-down/10 text-down border border-down/30 text-[10px] font-bold uppercase tracking-wide">
              <XCircle size={11} /> Dead
            </span>
          ) : (
            <ConfidenceBadge pct={r.confidence.pct} band={r.confidence.band} />
          )}
          <div className="text-right text-[11px] leading-tight">
            {r.reportedFeeM != null ? (
              <div className="num font-semibold">€{r.reportedFeeM}M</div>
            ) : (
              <div className="text-mute-soft">no fee yet</div>
            )}
            <div className="text-mute-soft num">
              vs €{r.onsideValueM}M{verdict && <span className={cn("ml-1 font-semibold", verdict.cls)}>{verdict.label}</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
