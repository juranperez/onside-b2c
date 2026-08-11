"use client";

import { useEffect, useState } from "react";

function split(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return {
    d: Math.floor(s / 86_400),
    h: Math.floor((s % 86_400) / 3_600),
    m: Math.floor((s % 3_600) / 60),
    s: s % 60,
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

function Cell({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center min-w-[58px]">
      <div className="display num text-[clamp(28px,5vw,44px)] leading-none text-acc tabular-nums">{value}</div>
      <div className="text-[10px] uppercase tracking-[0.18em] text-mute-soft mt-1.5">{label}</div>
    </div>
  );
}

/**
 * Live ticking countdown to a target instant. Renders a stable placeholder before
 * hydration (no SSR/client mismatch), then updates every second on the client.
 */
export function Countdown({ target }: { target: string }) {
  const targetMs = new Date(target).getTime();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (now !== null && targetMs - now <= 0) {
    return (
      <div className="inline-flex items-center gap-2 text-up text-[15px] font-semibold">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-up/70" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-up" />
        </span>
        Tournament under way
      </div>
    );
  }

  const p = now === null ? null : split(targetMs - now);
  return (
    <div className="flex items-end gap-3 sm:gap-5">
      <Cell value={p ? String(p.d) : "—"} label="Days" />
      <Cell value={p ? pad(p.h) : "—"} label="Hrs" />
      <Cell value={p ? pad(p.m) : "—"} label="Min" />
      <Cell value={p ? pad(p.s) : "—"} label="Sec" />
    </div>
  );
}
