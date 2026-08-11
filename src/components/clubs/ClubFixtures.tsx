import Link from "next/link";
import { cn } from "@/lib/utils";
import { Card, SectionHead } from "@/components/ui";
import type { ClubFixtureItem } from "@/lib/queries";

const RESULT_STYLE: Record<string, string> = {
  W: "bg-up/15 text-up border-up/30",
  D: "bg-overlay/10 text-mute border-line",
  L: "bg-down/10 text-down border-down/30",
};

function when(iso: string | null): string {
  if (!iso) return "TBD";
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) + " · " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) + " UTC";
}

function Row({ f }: { f: ClubFixtureItem }) {
  const finished = f.status === "finished";
  return (
    <Link href={`/matches/${f.id}`}>
      <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-overlay/[0.03] transition border-b border-line last:border-0 cursor-pointer">
        {finished && f.result ? (
          <span className={cn("w-6 h-6 rounded-md border grid place-items-center text-[11px] font-bold num shrink-0", RESULT_STYLE[f.result])}>{f.result}</span>
        ) : (
          <span className={cn("w-6 h-6 rounded-md border border-line grid place-items-center text-[9px] num shrink-0", f.status === "live" ? "text-acc border-acc/40" : "text-mute-soft")}>
            {f.status === "live" ? "LIVE" : "vs"}
          </span>
        )}
        <div className="flex-1 min-w-0 text-[13px]">
          <span className={cn("truncate", f.isHome ? "font-semibold" : "")}>{f.homeName}</span>
          <span className="text-mute-soft mx-1.5">
            {finished ? (
              <span className="num font-semibold text-fg">
                {f.scoreHome}–{f.scoreAway}
              </span>
            ) : (
              "v"
            )}
          </span>
          <span className={cn("truncate", !f.isHome ? "font-semibold" : "")}>{f.awayName}</span>
        </div>
        <span className="num text-[11px] text-mute-soft shrink-0">{finished ? when(f.kickoff).split(" · ")[0] : when(f.kickoff)}</span>
      </div>
    </Link>
  );
}

/** Results + upcoming for the club hub — rows click through to the match centre. */
export function ClubFixtures({ results, upcoming }: { results: ClubFixtureItem[]; upcoming: ClubFixtureItem[] }) {
  if (!results.length && !upcoming.length) return null;
  return (
    <div className="grid md:grid-cols-2 gap-4 mb-8">
      {results.length > 0 && (
        <Card className="overflow-hidden">
          <div className="px-5 py-3 border-b border-line">
            <SectionHead eyebrow="Most recent first" title="Results" />
          </div>
          {results.map((f) => (
            <Row key={f.id} f={f} />
          ))}
        </Card>
      )}
      {upcoming.length > 0 && (
        <Card className="overflow-hidden">
          <div className="px-5 py-3 border-b border-line">
            <SectionHead eyebrow="Next up" title="Fixtures" />
          </div>
          {upcoming.map((f) => (
            <Row key={f.id} f={f} />
          ))}
        </Card>
      )}
    </div>
  );
}
