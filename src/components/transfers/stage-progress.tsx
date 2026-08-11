import { cn } from "@/lib/utils";
import type { DealStage } from "@/lib/rumours/stage";

// Chronological lifecycle (early → late). stageOf returns where the saga is now.
const ORDER: DealStage[] = ["Linked", "Talks", "Bid", "Agreed", "Medical", "Done"];

/**
 * The deal's path along the lifecycle — stages up to the current one are lit, the
 * current one ringed. This is the "evolving" heart of the story page: it advances
 * every time the saga moves, with no extra data (derived from stageOf).
 */
export function StageProgress({ stage, dead = false }: { stage: DealStage; dead?: boolean }) {
  const idx = ORDER.indexOf(stage);
  return (
    <div className="mt-5" aria-label={`Deal stage: ${stage}`}>
      <div className="flex items-center">
        {ORDER.map((s, i) => {
          const reached = i <= idx;
          const current = i === idx;
          return (
            <div key={s} className="contents">
              <span
                aria-current={current ? "step" : undefined}
                className={cn(
                  "w-2.5 h-2.5 rounded-full shrink-0 transition",
                  dead
                    ? reached
                      ? "bg-down/60"
                      : "bg-ink-700"
                    : current
                      ? "bg-acc ring-4 ring-acc/20"
                      : reached
                        ? "bg-acc"
                        : "bg-ink-700",
                )}
              />
              {i < ORDER.length - 1 && (
                <span
                  className={cn(
                    "h-px flex-1 mx-1 rounded",
                    i < idx ? (dead ? "bg-down/40" : "bg-acc") : "bg-ink-700",
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-1.5">
        {ORDER.map((s, i) => (
          <span
            key={s}
            className={cn(
              "text-[9px] uppercase tracking-wide num",
              i === idx && !dead ? "text-acc font-bold" : i <= idx ? "text-mute" : "text-mute-soft",
            )}
          >
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}
