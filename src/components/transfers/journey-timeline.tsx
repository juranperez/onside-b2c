import { ExternalLink } from "lucide-react";
import { Card, SectionHead } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { RumourSourceItem } from "@/lib/queries/rumours";

const TIER_LABEL: Record<number, string> = { 1: "Tier-1", 2: "Established", 3: "Outlet", 4: "Secondary" };

function fmt(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(new Date(iso));
}

/**
 * The saga as a chronological timeline — each report a beat in the story, oldest
 * first. This is the part that visibly GROWS as the deal develops: one entry when
 * it breaks, the full arc by the time it's done.
 */
export function JourneyTimeline({ sources }: { sources: RumourSourceItem[] }) {
  if (!sources.length) return null;
  const ordered = [...sources].sort((a, b) => new Date(a.seenAt).getTime() - new Date(b.seenAt).getTime());

  return (
    <Card className="p-6 mt-6">
      <SectionHead eyebrow="The journey" title="How the saga unfolded" />
      <ol className="mt-3 relative">
        {ordered.map((s, i) => {
          const tier = Math.min(4, Math.max(1, s.tier));
          const last = i === ordered.length - 1;
          return (
            <li key={s.url} className="relative flex gap-3 pb-5 last:pb-0">
              {!last && <span aria-hidden className="absolute left-[4px] top-4 -bottom-1 w-px bg-line" />}
              <span
                className={cn(
                  "relative z-10 mt-1.5 w-2.5 h-2.5 rounded-full shrink-0",
                  tier <= 1 ? "bg-up" : tier === 2 ? "bg-acc" : "bg-overlay/40",
                )}
              />
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="flex-1 min-w-0 group"
              >
                <div className="flex items-center gap-2 text-[10px] num text-mute-soft uppercase tracking-wide">
                  <span>{TIER_LABEL[tier]}</span>
                  <span>·</span>
                  <span>{fmt(s.seenAt)}</span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[13px] font-medium truncate group-hover:text-acc transition">{s.source}</span>
                  <ExternalLink size={11} className="text-mute-soft group-hover:text-acc transition shrink-0" />
                </div>
              </a>
            </li>
          );
        })}
      </ol>
      <p className="text-[10.5px] text-mute-soft mt-2">
        Each report is a beat in the saga — newest at the bottom. Links open the original.
      </p>
    </Card>
  );
}
