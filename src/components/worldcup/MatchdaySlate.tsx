import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionHead, Card } from "@/components/ui";
import { CodeTile } from "./CodeTile";
import { nationCode } from "./nation-code";
import type { WcFixture } from "@/lib/queries";
import type { PlayerListItem } from "@/lib/queries/map";
import type { Forecast, ForecastVerdict } from "@/lib/forecast/onside-forecast";

const ET = "America/New_York";

function fmtTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: ET,
  }).format(new Date(iso));
}

/** Compact result/verdict line for one fixture. */
function resultLine(
  f: WcFixture,
  homeCode: string,
  awayCode: string,
): React.ReactNode {
  if (f.status === "finished" && f.verdict) {
    const v: ForecastVerdict = f.verdict;
    return (
      <span
        className={cn(
          "text-[10px] uppercase tracking-[0.12em] font-bold num",
          v.hit ? "text-up" : "text-mute",
        )}
      >
        {v.hit ? "✓ Onside called it" : "✗ Against the call"}
      </span>
    );
  }
  const fc: Forecast | null =
    f.status === "live" ? f.live : f.forecast;
  if (!fc) return null;
  const fav =
    fc.home >= fc.away
      ? `${homeCode} ${fc.home}%`
      : `${awayCode} ${fc.away}%`;
  return (
    <span className="text-[10.5px] text-mute-soft num">Onside: {fav}</span>
  );
}

function scoreOrTime(f: WcFixture): string {
  if (f.status === "scheduled")
    return f.kickoff ? fmtTime(f.kickoff) : "TBD";
  return `${f.scoreHome ?? 0}–${f.scoreAway ?? 0}`;
}

function WatchChips({ players }: { players: PlayerListItem[] }) {
  if (players.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {players.map((p) => (
        <Link
          key={p.slug}
          href={`/players/${p.slug}`}
          className="inline-flex items-center gap-1 rounded-md bg-overlay/5 border border-line px-2 py-1 text-[11px] text-mute hover:text-fg hover:border-mute transition"
        >
          <span className="truncate max-w-[110px]">{p.displayName}</span>
          <span className="num text-acc">€{p.val.toFixed(0)}M</span>
        </Link>
      ))}
    </div>
  );
}

export function MatchdaySlate({
  label,
  isToday,
  fixtures,
  watch,
}: {
  label: string;
  isToday: boolean;
  fixtures: WcFixture[];
  watch: Record<string, PlayerListItem[]>;
}) {
  if (fixtures.length === 0) return null;

  return (
    <section className="mb-12">
      <SectionHead
        eyebrow={isToday ? `${label} · today` : `${label} · up next`}
        title="Match centre"
        action={
          <Link
            href="/worldcup/schedule"
            className="inline-flex items-center gap-1 text-[12px] text-acc hover:underline"
          >
            Full schedule <ArrowRight size={12} />
          </Link>
        }
      />
      <div className="grid gap-2">
        {fixtures.map((f) => {
          const homeCode = nationCode(f.home.slug, f.home.name);
          const awayCode = nationCode(f.away.slug, f.away.name);
          const live = f.status === "live";
          const homePlayers = watch[f.home.slug] ?? [];
          const awayPlayers = watch[f.away.slug] ?? [];
          const hasWatch = homePlayers.length > 0 || awayPlayers.length > 0;

          return (
            <Card key={f.id} className={cn("p-4", live && "border-acc/40")}>
              {/* Teams + score row */}
              <div className="flex items-center gap-3">
                {/* Home team */}
                <Link
                  href={`/worldcup/teams/${f.home.slug}`}
                  className="flex items-center gap-2 flex-1 min-w-0 justify-end group"
                >
                  <span className="text-[13px] font-medium truncate group-hover:text-acc transition text-right">
                    {f.home.name}
                  </span>
                  <CodeTile slug={f.home.slug} name={f.home.name} size={24} />
                </Link>

                {/* Score / time */}
                <div className="shrink-0 text-center min-w-[68px]">
                  <div
                    className={cn(
                      "num text-[14px] font-bold",
                      live ? "text-fg" : "text-mute",
                    )}
                  >
                    {scoreOrTime(f)}
                  </div>
                  {live && (
                    <span className="text-[9px] uppercase tracking-wider text-acc font-bold">
                      Live
                    </span>
                  )}
                </div>

                {/* Away team */}
                <Link
                  href={`/worldcup/teams/${f.away.slug}`}
                  className="flex items-center gap-2 flex-1 min-w-0 group"
                >
                  <CodeTile slug={f.away.slug} name={f.away.name} size={24} />
                  <span className="text-[13px] font-medium truncate group-hover:text-acc transition">
                    {f.away.name}
                  </span>
                </Link>
              </div>

              {/* Forecast / verdict line */}
              <div className="mt-2 flex items-center justify-center">
                {resultLine(f, homeCode, awayCode)}
              </div>

              {/* Players to watch */}
              {hasWatch && (
                <div className="mt-3 pt-3 border-t border-line">
                  <div className="text-[9px] uppercase tracking-[0.14em] text-mute-soft num mb-2">
                    Players to watch
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <WatchChips players={homePlayers} />
                    <WatchChips players={awayPlayers} />
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </section>
  );
}
