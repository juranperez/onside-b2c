import Link from "next/link";
import { ArrowRight, BadgeCheck, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui";
import { ConfidenceBadge } from "./confidence-badge";
import type { RumourItem } from "@/lib/queries/rumours";

function timeAgo(iso: string): string {
  const days = (Date.now() - new Date(iso).getTime()) / 86_400_000;
  if (days < 1) return "today";
  if (days < 2) return "1d ago";
  if (days < 14) return `${Math.floor(days)}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

function feeVerdict(feeM: number | null, valueM: number) {
  if (feeM == null || valueM <= 0) return null;
  const r = feeM / valueM;
  if (r <= 1.1) return { t: "Fair / bargain", c: "text-up" };
  if (r <= 1.8) return { t: "Above value", c: "text-acc" };
  return { t: "Overpay vs model", c: "text-down" };
}

export function RumourCard({ r }: { r: RumourItem }) {
  const confirmed = r.status === "confirmed";
  const dead = r.status === "dead";
  const verdict = feeVerdict(r.reportedFeeM, r.onsideValueM);

  return (
    <div className={cn("rounded-xl border bg-ink-850 p-4 transition", dead ? "border-line opacity-60" : "border-line hover:bg-ink-800")}>
      <div className="flex items-start gap-3">
        <Avatar name={r.player.name} clubBg={r.player.clubBg} clubColor={r.player.clubColor} src={r.player.photoUrl} size={40} />
        <div className="flex-1 min-w-0">
          <Link href={`/players/${r.player.slug}`} className={cn("text-[14px] font-semibold hover:text-acc transition block truncate", dead && "line-through")}>
            {r.player.name}
          </Link>
          <div className="flex items-center gap-1.5 text-[12px] text-mute mt-0.5 min-w-0">
            <span className="truncate">{r.player.fromClub}</span>
            <ArrowRight size={12} className="text-mute-soft shrink-0" />
            <span className="truncate text-fg font-medium">{r.toClub}</span>
          </div>
        </div>
        {confirmed ? (
          <span className="inline-flex items-center gap-1 px-2.5 h-7 rounded-full bg-up/15 text-up border border-up/30 text-[11px] font-bold uppercase tracking-wide shrink-0">
            <BadgeCheck size={13} /> Confirmed
          </span>
        ) : dead ? (
          <span className="inline-flex items-center gap-1 px-2.5 h-7 rounded-full bg-down/10 text-down border border-down/30 text-[11px] font-bold uppercase tracking-wide shrink-0">
            <XCircle size={13} /> Dead
          </span>
        ) : (
          <ConfidenceBadge pct={r.confidence.pct} band={r.confidence.band} big />
        )}
      </div>

      <p className="text-[12.5px] text-mute mt-3 leading-relaxed">{r.summary}</p>

      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-line text-[11px] flex-wrap">
        {r.reportedFeeM != null ? (
          <span className="num font-semibold">€{r.reportedFeeM}M</span>
        ) : (
          <span className="text-mute-soft">Fee undisclosed</span>
        )}
        <span className="text-mute-soft">vs</span>
        <span className="num text-mute">€{r.onsideValueM}M Onside</span>
        {verdict && <span className={cn("font-semibold ml-auto", verdict.c)}>{verdict.t}</span>}
      </div>

      <div className="flex items-center justify-between mt-2.5 text-[10.5px] text-mute-soft">
        <span className="truncate">
          {r.source}
          {r.corroborations > 1 ? ` +${r.corroborations - 1} more` : ""}
        </span>
        <div className="flex items-center gap-2.5 shrink-0">
          <span className="num">{timeAgo(r.firstSeen)}</span>
          <Link href={`/transfers/${r.id}`} className="text-acc hover:underline font-medium">
            Discuss →
          </Link>
        </div>
      </div>
    </div>
  );
}
