"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { Check, Share2, Copy, RotateCcw, Trophy } from "lucide-react";
import { CodeTile } from "./CodeTile";
import { cn } from "@/lib/utils";
import type { Bracket } from "@/lib/worldcup/bracket";
import {
  resolveBracket, champion, isComplete, encodeSides, decodeSides,
  PREDICT_ROUNDS, TIE_COUNT, type Side, type ResolvedTie,
} from "@/lib/worldcup/predict";

function money(m: number): string {
  if (m >= 1000) return `€${(m / 1000).toFixed(2)}B`;
  if (m <= 0) return "—";
  return `€${m.toFixed(0)}M`;
}

/** The tie one flat index feeds into (its downstream parent), or -1 at the final. */
function parentOf(t: number): number {
  if (t < 16) return 16 + (t >> 1);
  if (t < 24) return 24 + ((t - 16) >> 1);
  if (t < 28) return 28 + ((t - 24) >> 1);
  if (t < 30) return 30;
  return -1;
}

function TeamRow({
  team, valueM, score, side, chosen, dimmed, onPick,
}: {
  team: { slug: string; name: string } | null;
  valueM: number | null;
  score: number | null;
  side: 0 | 1;
  chosen: boolean;
  dimmed: boolean;
  onPick: ((side: 0 | 1) => void) | null;
}) {
  if (!team) {
    return (
      <div className="flex items-center gap-2 h-8 px-2.5">
        <div className="w-[18px] h-[18px] rounded-full bg-ink-800 border border-line shrink-0" />
        <span className="text-[11px] text-mute-soft">TBD</span>
      </div>
    );
  }
  const inner = (
    <>
      <CodeTile slug={team.slug} name={team.name} size={18} />
      <div className="min-w-0 flex-1">
        <div className={cn("text-[11.5px] truncate leading-none", chosen ? "font-bold text-acc" : "font-semibold")}>{team.name}</div>
        {valueM != null && <div className="text-[8.5px] text-mute-soft num leading-none mt-1">{money(valueM)}</div>}
      </div>
      {score != null && <span className="num text-[13px] font-bold tabular-nums shrink-0">{score}</span>}
      {chosen && <Check size={12} className="text-acc shrink-0" />}
    </>
  );
  const base = cn("w-full flex items-center gap-2 h-8 px-2.5 text-left transition-colors", chosen && "bg-acc/10", dimmed && "opacity-40");
  if (onPick) {
    return (
      <button type="button" onClick={() => onPick(side)} className={cn(base, "hover:bg-overlay/[0.04] cursor-pointer")}>
        {inner}
      </button>
    );
  }
  return <div className={base}>{inner}</div>;
}

function PredTie({ tie, forecast, onPick }: { tie: ResolvedTie; forecast: Bracket["rounds"][number]["slots"][number]["forecast"]; onPick: (flat: number, side: 0 | 1) => void } ) {
  const live = tie.status === "live";
  const showScore = tie.status === "finished" || live;
  const pickHome = tie.pickable ? (s: 0 | 1) => onPick(tie.flat, s) : null;
  // A settled tie (locked or user-picked) highlights its winner and dims the loser.
  const winnerSide: Side = tie.lockedWinner != null ? tie.lockedWinner : tie.side;

  return (
    <div className={cn("rounded-lg border bg-ink-850 overflow-hidden w-[186px] shrink-0", live ? "border-up/50" : winnerSide != null ? "border-acc/40" : "border-line")}>
      <TeamRow
        team={tie.home} valueM={tie.home?.valueM ?? null} score={showScore ? tie.scoreHome : null}
        side={0} chosen={winnerSide === 0} dimmed={winnerSide === 1} onPick={pickHome}
      />
      <div className="h-px bg-line" />
      <TeamRow
        team={tie.away} valueM={tie.away?.valueM ?? null} score={showScore ? tie.scoreAway : null}
        side={1} chosen={winnerSide === 1} dimmed={winnerSide === 0} onPick={pickHome}
      />
      {forecast && tie.pickable && tie.side == null && !live ? (
        <div className="px-2.5 py-1.5 border-t border-line">
          <div className="flex h-1 rounded-full overflow-hidden bg-ink-700">
            <div style={{ width: `${forecast.home}%` }} className="bg-acc/70" />
            <div style={{ width: `${forecast.draw}%` }} className="bg-ink-600" />
            <div style={{ width: `${forecast.away}%` }} className="bg-fg/45" />
          </div>
          <div className="flex items-center justify-between text-[8px] text-mute-soft num mt-1">
            <span>{forecast.home}%</span>
            <span className="text-mute uppercase tracking-wider text-[7.5px]">Onside</span>
            <span>{forecast.away}%</span>
          </div>
        </div>
      ) : live ? (
        <div className="px-2.5 py-1 border-t border-line text-[8.5px] text-up num uppercase tracking-wider flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-up animate-pulse" /> Live · tap your winner
        </div>
      ) : tie.lockedWinner != null ? (
        <div className="px-2.5 py-1 border-t border-line text-[8.5px] text-mute-soft num uppercase tracking-wider">Full time</div>
      ) : null}
    </div>
  );
}

export function BracketPredictor({ initial }: { initial: Bracket }) {
  const [sides, setSides] = useState<Side[]>(() => new Array(TIE_COUNT).fill(null));
  const [hydrated, setHydrated] = useState(false);
  const [copied, setCopied] = useState(false);

  // Restore a shared bracket from the URL before anything writes back to it.
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("b");
    if (code) setSides(decodeSides(code));
    setHydrated(true);
  }, []);

  const resolved = useMemo(() => resolveBracket(initial, sides), [initial, sides]);
  const champ = champion(resolved);
  const complete = isComplete(resolved);

  // Keep the shareable URL in sync with the current picks (login-free).
  useEffect(() => {
    if (!hydrated) return;
    const url = new URL(window.location.href);
    if (sides.some((s) => s != null)) url.searchParams.set("b", encodeSides(sides));
    else url.searchParams.delete("b");
    window.history.replaceState(null, "", url.toString());
  }, [sides, hydrated]);

  const pick = useCallback((flat: number, side: 0 | 1) => {
    setSides((prev) => {
      const next = [...prev];
      next[flat] = side;
      // Changing a result invalidates every tie downstream of it — clear those picks.
      for (let p = parentOf(flat); p >= 0; p = parentOf(p)) next[p] = null;
      return next;
    });
    setCopied(false);
  }, []);

  const reset = useCallback(() => {
    setSides(new Array(TIE_COUNT).fill(null));
    setCopied(false);
  }, []);

  const shareText = champ ? `My World Cup 2026 bracket — 🏆 ${champ.name} lifting it. Build yours on Onside:` : "";
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  const doShare = useCallback(async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: "My World Cup bracket", text: shareText, url }); return; } catch { /* cancelled — fall through to copy */ }
    }
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2200); } catch { /* noop */ }
  }, [shareText]);

  const copyLink = useCallback(async () => {
    try { await navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 2200); } catch { /* noop */ }
  }, []);

  const anyPick = sides.some((s) => s != null);

  return (
    <div>
      {/* Status + share bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4 rounded-xl border border-line bg-ink-850 px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          {complete && champ ? (
            <>
              <CodeTile slug={champ.slug} name={champ.name} size={30} />
              <div className="min-w-0">
                <div className="text-[9px] uppercase tracking-[0.16em] text-mute-soft num">Your champion</div>
                <div className="text-[15px] font-bold truncate flex items-center gap-1.5">
                  <Trophy size={13} className="text-acc shrink-0" /> {champ.name}
                </div>
              </div>
            </>
          ) : (
            <div>
              <div className="text-[13px] font-semibold">Make your bracket</div>
              <div className="text-[11px] text-mute">Tap a team in each tie to send them through — all the way to the trophy.</div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {anyPick && (
            <button onClick={reset} type="button" className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[12px] text-mute hover:text-fg hover:bg-overlay/5 transition cursor-pointer">
              <RotateCcw size={13} /> Reset
            </button>
          )}
          <button
            onClick={doShare} type="button" disabled={!complete}
            className={cn(
              "inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg text-[12px] font-semibold transition",
              complete ? "bg-acc text-ink-950 hover:bg-acc/90 cursor-pointer" : "bg-overlay/5 text-mute-soft cursor-not-allowed",
            )}
          >
            <Share2 size={13} /> {copied ? "Copied!" : "Share my bracket"}
          </button>
        </div>
      </div>

      {complete && (
        <div className="flex items-center gap-2 flex-wrap mb-4 -mt-1 text-[11px]">
          <span className="text-mute-soft">Share to</span>
          <a href={`https://wa.me/?text=${encodeURIComponent(shareText + " " + shareUrl)}`} target="_blank" rel="noopener noreferrer" className="px-2.5 h-7 inline-flex items-center rounded-md border border-line text-mute hover:text-fg hover:border-mute transition">WhatsApp</a>
          <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer" className="px-2.5 h-7 inline-flex items-center rounded-md border border-line text-mute hover:text-fg hover:border-mute transition">X</a>
          <button onClick={copyLink} type="button" className="px-2.5 h-7 inline-flex items-center gap-1 rounded-md border border-line text-mute hover:text-fg hover:border-mute transition cursor-pointer">
            <Copy size={11} /> Copy link
          </button>
          <span className="text-mute-soft">— for Instagram / TikTok, copy the link or use Share.</span>
        </div>
      )}

      {/* Bracket */}
      <div className="overflow-x-auto overflow-y-hidden -mx-6 px-6 pb-2">
        <div className="flex gap-5 md:gap-7 min-w-max items-stretch">
          {PREDICT_ROUNDS.map((meta, r) => (
            <div key={meta.name} className="flex flex-col min-w-[186px]">
              <div className="text-[10px] uppercase tracking-[0.16em] text-mute-soft num mb-3 text-center">{meta.name}</div>
              <div className="flex flex-col flex-1 justify-around gap-3">
                {resolved.slice(meta.base, meta.base + meta.size).map((tie) => (
                  <PredTie key={tie.flat} tie={tie} forecast={initial.rounds[r]?.slots[tie.localIndex]?.forecast ?? null} onPick={pick} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
