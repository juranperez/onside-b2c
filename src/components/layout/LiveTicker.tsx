import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { getWcFixtures, type WcFixture } from "@/lib/queries";
import { tickerFixtures } from "@/lib/wc-day";
import { nationCode } from "@/components/worldcup/nation-code";
import { TickerClose } from "./TickerClose";

const ET = "America/New_York";
const fmtTime = (iso: string) =>
  new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: ET }).format(new Date(iso));

function score(f: WcFixture): string {
  if (f.status === "scheduled") return f.kickoff ? fmtTime(f.kickoff) : "TBD";
  if (f.status === "postponed") return "P–P"; // never played — don't fake a 0–0
  return `${f.scoreHome ?? 0}–${f.scoreAway ?? 0}`;
}

/** Slim match-day strip under the header. Renders nothing on days without fixtures. */
export async function LiveTicker() {
  let fixtures: WcFixture[] = [];
  try {
    fixtures = await getWcFixtures();
  } catch {
    return null; // ticker is best-effort; never break the page
  }
  const picks = tickerFixtures(fixtures, new Date());
  if (picks.length === 0) return null;
  const anyLive = picks.some((f) => f.status === "live");

  return (
    <div id="wc-ticker" className="border-b border-line bg-ink-850/60">
      <div className="max-w-[1440px] mx-auto px-4 md:px-6 h-9 flex items-center gap-4 overflow-x-auto">
        <span className="flex items-center gap-1.5 shrink-0">
          <span className={cn("w-1.5 h-1.5 rounded-full", anyLive ? "bg-acc pulse-dot" : "bg-mute-soft")} />
          <span className="text-[10px] uppercase tracking-[0.14em] num font-semibold text-acc">
            {anyLive ? "Live" : "Today"}
          </span>
        </span>
        {picks.map((f) => (
          <Link
            key={f.id}
            href={`/matches/${f.id}`}
            className="flex items-center gap-1.5 shrink-0 text-[12px] text-mute hover:text-fg transition num"
          >
            <span className={cn(f.status === "live" && "text-fg font-medium")}>
              {nationCode(f.home.slug, f.home.name)} {score(f)} {nationCode(f.away.slug, f.away.name)}
            </span>
          </Link>
        ))}
        <Link
          href="/worldcup/schedule"
          className="ml-auto shrink-0 flex items-center gap-1 text-[11px] text-mute-soft hover:text-acc transition"
        >
          All matches <ArrowRight size={11} />
        </Link>
        <TickerClose />
      </div>
    </div>
  );
}
