import { getMovers, getCounts } from "@/lib/queries";
import { getRumours, type RumourItem } from "@/lib/queries/rumours";
import type { PlayerListItem } from "@/lib/queries/map";

export interface DigestData {
  risers: PlayerListItem[];
  fallers: PlayerListItem[];
  rumours: RumourItem[];
  counts: { players: number; clubs: number; leagues: number };
}

/** Assemble "The Board" — the week's movers + top rumours. Pure data. */
export async function buildDigest(): Promise<DigestData> {
  const [risers, fallers, rumours, counts] = await Promise.all([
    getMovers(5, "up").catch(() => []),
    getMovers(5, "down").catch(() => []),
    getRumours(30).catch(() => []),
    getCounts().catch(() => ({ players: 0, clubs: 0, leagues: 0 })),
  ]);
  const topRumours = rumours
    .filter((r) => r.status === "rumour")
    .sort((a, b) => b.confidence.pct - a.confidence.pct)
    .slice(0, 3);
  return { risers, fallers, rumours: topRumours, counts };
}

/** Minimal HTML email body for "The Board" (used by the send cron once SMTP is wired). */
export function buildDigestHtml(d: DigestData, baseUrl = "https://onsidemarket.com"): string {
  const row = (p: PlayerListItem) =>
    `<tr><td style="padding:6px 0;color:#e5e5e5;font:14px sans-serif"><a href="${baseUrl}/players/${p.slug}" style="color:#fff;text-decoration:none">${p.name}</a></td>` +
    `<td style="padding:6px 0;text-align:right;font:600 14px monospace;color:${p.dWeek >= 0 ? "#00E599" : "#FF4D63"}">${p.dWeek >= 0 ? "+" : ""}€${p.dWeek.toFixed(1)}M</td></tr>`;
  const rum = (r: RumourItem) =>
    `<tr><td style="padding:6px 0;color:#e5e5e5;font:14px sans-serif">${r.player.name} → ${r.toClub}</td>` +
    `<td style="padding:6px 0;text-align:right;font:600 14px monospace;color:#E8FF5A">${r.confidence.pct}%</td></tr>`;

  return `<div style="max-width:560px;margin:0 auto;background:#0A0A0B;padding:32px;border-radius:12px">
    <div style="font:800 22px sans-serif;color:#fff;letter-spacing:-.03em">Onside<span style="color:#00E599">.</span> · The Board</div>
    <p style="color:#8A8A93;font:14px sans-serif">This week on the board — across ${d.counts.players.toLocaleString()} players.</p>
    <h3 style="color:#fff;font:600 15px sans-serif;margin-top:24px">Biggest risers</h3>
    <table style="width:100%;border-collapse:collapse">${d.risers.map(row).join("")}</table>
    <h3 style="color:#fff;font:600 15px sans-serif;margin-top:20px">Biggest fallers</h3>
    <table style="width:100%;border-collapse:collapse">${d.fallers.map(row).join("")}</table>
    ${d.rumours.length ? `<h3 style="color:#fff;font:600 15px sans-serif;margin-top:20px">Top rumours · Onside Confidence %</h3><table style="width:100%;border-collapse:collapse">${d.rumours.map(rum).join("")}</table>` : ""}
    <p style="margin-top:28px"><a href="${baseUrl}/discover" style="color:#0A0A0B;background:#E8FF5A;padding:10px 16px;border-radius:8px;font:600 14px sans-serif;text-decoration:none">Open the board</a></p>
  </div>`;
}
