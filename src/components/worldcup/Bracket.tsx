import { CodeTile } from "./CodeTile";
import { cn } from "@/lib/utils";
import type { Bracket, BracketSlot, BracketTeam } from "@/lib/worldcup/bracket";

function money(m: number): string {
  if (m >= 1000) return `€${(m / 1000).toFixed(2)}B`;
  if (m <= 0) return "—";
  return `€${m.toFixed(0)}M`;
}

const ROUND_LABEL: Record<string, string> = {
  "Round of 32": "Round of 32",
  "Round of 16": "Round of 16",
  "Quarter-finals": "Quarter-finals",
  "Semi-finals": "Semi-finals",
  "Final": "Final",
};

function TeamRow({ team, score, dim }: { team: BracketTeam | null; score: number | null; dim: boolean }) {
  if (!team) {
    return (
      <div className="flex items-center gap-2 h-8 px-2.5">
        <div className="w-[18px] h-[18px] rounded-full bg-ink-800 border border-line shrink-0" />
        <span className="text-[11px] text-mute-soft">TBD</span>
      </div>
    );
  }
  return (
    <div className={cn("flex items-center gap-2 h-8 px-2.5 transition-opacity", dim && "opacity-40")}>
      <CodeTile slug={team.slug} name={team.name} size={18} />
      <div className="min-w-0 flex-1">
        <div className="text-[11.5px] font-semibold truncate leading-none">{team.name}</div>
        <div className="text-[8.5px] text-mute-soft num leading-none mt-1">{money(team.valueM)}</div>
      </div>
      {score != null && <span className="num text-[13px] font-bold tabular-nums shrink-0">{score}</span>}
    </div>
  );
}

function Tie({ slot }: { slot: BracketSlot }) {
  const played = slot.status === "finished";
  const live = slot.status === "live";
  const showScore = played || live;
  const homeWon = played && (slot.scoreHome ?? 0) > (slot.scoreAway ?? 0);
  const awayWon = played && (slot.scoreAway ?? 0) > (slot.scoreHome ?? 0);
  const fc = slot.forecast;

  return (
    <div className={cn("rounded-lg border bg-ink-850 overflow-hidden w-[186px] shrink-0", live ? "border-up/50" : "border-line")}>
      <TeamRow team={slot.home} score={showScore ? slot.scoreHome : null} dim={awayWon} />
      <div className="h-px bg-line" />
      <TeamRow team={slot.away} score={showScore ? slot.scoreAway : null} dim={homeWon} />

      {fc && slot.home && slot.away ? (
        <div className="px-2.5 py-1.5 border-t border-line">
          <div className="flex h-1 rounded-full overflow-hidden bg-ink-700" title={`Onside: ${slot.home.name} ${fc.home}% · draw ${fc.draw}% · ${slot.away.name} ${fc.away}%`}>
            <div style={{ width: `${fc.home}%` }} className="bg-acc" />
            <div style={{ width: `${fc.draw}%` }} className="bg-ink-600" />
            <div style={{ width: `${fc.away}%` }} className="bg-fg/55" />
          </div>
          <div className="flex items-center justify-between text-[8px] text-mute-soft num mt-1">
            <span>{fc.home}%</span>
            <span className="text-mute uppercase tracking-wider text-[7.5px]">Onside</span>
            <span>{fc.away}%</span>
          </div>
        </div>
      ) : live ? (
        <div className="px-2.5 py-1 border-t border-line text-[8.5px] text-up num uppercase tracking-wider flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-up animate-pulse" /> Live
        </div>
      ) : played ? (
        <div className="px-2.5 py-1 border-t border-line text-[8.5px] text-mute-soft num uppercase tracking-wider">Full time</div>
      ) : null}
    </div>
  );
}

/** The knockout bracket — round columns left→right, ties space-distributed so the tree converges. */
export function BracketView({ bracket }: { bracket: Bracket }) {
  return (
    <div className="overflow-x-auto overflow-y-hidden -mx-6 px-6 pb-2">
      <div className="flex gap-5 md:gap-7 min-w-max items-stretch">
        {bracket.rounds.map((round) => (
          <div key={round.name} className="flex flex-col min-w-[186px]">
            <div className="text-[10px] uppercase tracking-[0.16em] text-mute-soft num mb-3 text-center">
              {ROUND_LABEL[round.name] ?? round.name}
            </div>
            <div className="flex flex-col flex-1 justify-around gap-3">
              {round.slots.map((slot) => (
                <Tie key={`${slot.round}-${slot.index}`} slot={slot} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
