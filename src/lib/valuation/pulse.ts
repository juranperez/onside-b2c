// Onside Pulse — deterministic, bounded, path-independent daily movement around a
// player's model anchor value. Lets values "move" believably day to day without live
// match data, and never drifts away from the anchor. Labeled as a model estimate.

const TWO_PI = Math.PI * 2;
const DAY_MS = 86_400_000;

/** Fixed epoch so a calendar date maps to a stable day index across runs. */
export const PULSE_EPOCH_MS = Date.UTC(2026, 0, 1);

/** Deterministic 32-bit hash of a string seed -> float in [0, 1). */
function hash01(seed: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 15;
  h = Math.imul(h, 2246822519);
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}

export interface PulseEvent {
  dayIndex: number;
  pct: number; // e.g. +0.05 = a 5% re-rate
  halfLifeDays?: number; // decay; default 21
}

export function dayIndexFor(date: Date): number {
  return Math.floor((date.getTime() - PULSE_EPOCH_MS) / DAY_MS);
}

/** Bounded, deterministic value around the anchor for a given day index. */
export function valueOnDay(
  anchor: number,
  playerId: string,
  dayIndex: number,
  events: PulseEvent[] = [],
): number {
  const phase = hash01(playerId) * TWO_PI;
  const slow = Math.sin(dayIndex / 30 + phase) * 0.06; // multi-week swing, +/-6%
  const med = Math.sin(dayIndex / 7 + phase * 1.7) * 0.025; // weekly, +/-2.5%
  const fast = (hash01(`${playerId}:${dayIndex}`) - 0.5) * 2 * 0.018; // daily wobble, +/-1.8%
  let ev = 0;
  for (const e of events) {
    if (dayIndex < e.dayIndex) continue;
    ev += e.pct * Math.pow(0.5, (dayIndex - e.dayIndex) / (e.halfLifeDays ?? 21));
  }
  const mult = Math.min(1.4, Math.max(0.7, 1 + slow + med + fast + ev));
  return Math.round(anchor * mult);
}

/** Value for a calendar date (defaults to today). */
export function liveValue(anchor: number, playerId: string, date: Date = new Date(), events: PulseEvent[] = []): number {
  return valueOnDay(anchor, playerId, dayIndexFor(date), events);
}

/** Today's value minus yesterday's — drives the "movers" feed. */
export function dayDelta(anchor: number, playerId: string, date: Date = new Date(), events: PulseEvent[] = []): number {
  const d = dayIndexFor(date);
  return valueOnDay(anchor, playerId, d, events) - valueOnDay(anchor, playerId, d - 1, events);
}

/** Inclusive series of {dayIndex, value} — powers the valuation history chart. */
export function series(
  anchor: number,
  playerId: string,
  fromDay: number,
  toDay: number,
  events: PulseEvent[] = [],
): { dayIndex: number; value: number }[] {
  const out: { dayIndex: number; value: number }[] = [];
  for (let d = fromDay; d <= toDay; d++) out.push({ dayIndex: d, value: valueOnDay(anchor, playerId, d, events) });
  return out;
}
