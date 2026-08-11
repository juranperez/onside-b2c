"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface MatchState {
  status: string;
  scoreHome: number | null;
  scoreAway: number | null;
}

/**
 * Self-updating scoreline for the match centre. Polls the tiny state endpoint
 * every 45s while a match is live (or within the pre-kickoff hour so the flip
 * to live is caught), and goes quiet once it's finished. The DB behind it is
 * refreshed every 5 minutes by the score cron, so this is honest near-live.
 */
export function LiveScore({ id, initial, kickoff }: { id: string; initial: MatchState; kickoff: string | null }) {
  const [state, setState] = useState<MatchState>(initial);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const shouldPoll = () => {
      if (state.status === "live") return true;
      if (state.status !== "scheduled" || !kickoff) return false;
      const dt = new Date(kickoff).getTime() - Date.now();
      return dt < 3600_000 && dt > -3 * 3600_000; // pre-kickoff hour through a played window
    };
    if (!shouldPoll()) return;

    timer.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/match-state?id=${encodeURIComponent(id)}`);
        if (res.ok) {
          const next = (await res.json()) as MatchState;
          setState(next);
          if (next.status === "finished" && timer.current) clearInterval(timer.current);
        }
      } catch {
        // transient — next tick retries
      }
    }, 45_000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [id, kickoff, state.status]);

  const live = state.status === "live";
  const showScore = state.scoreHome != null && state.scoreAway != null && state.status !== "scheduled";

  return (
    <span className="inline-flex flex-col items-center">
      {showScore ? (
        <span className={cn("display num text-[38px] md:text-[48px] tracking-tight", live && "text-up")}>
          {state.scoreHome}–{state.scoreAway}
        </span>
      ) : (
        <span className="display num text-[24px] text-mute-soft">vs</span>
      )}
      {live && (
        <span className="mt-1 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold text-up num">
          <span className="w-1.5 h-1.5 rounded-full bg-up animate-pulse" /> Live
        </span>
      )}
    </span>
  );
}
