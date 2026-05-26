import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function fmtVal(m: number): string {
  if (m >= 1000) return `€${(m / 1000).toFixed(1)}B`;
  return `€${m.toFixed(1)}M`;
}

export function fmtDelta(d: number): string {
  return `${d >= 0 ? "+" : ""}${d.toFixed(1)}`;
}

export function fmtCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}
