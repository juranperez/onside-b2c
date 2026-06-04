import type { Metadata } from "next";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Card, Avatar, Delta, Button } from "@/components/ui";
import { getSessionUser } from "@/lib/db/supabase-server";
import { getWatchlist } from "@/lib/watchlist/actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your watchlist — Onside",
  description: "Track players, watch their Onside valuation move, and get alerts.",
};

export default async function WatchlistPage() {
  const user = await getSessionUser().catch(() => null);

  if (!user) {
    return (
      <div className="max-w-[560px] mx-auto px-6 py-24 text-center">
        <h1 className="display text-[30px] mb-2">Your watchlist</h1>
        <p className="text-mute mb-6">
          Sign in to track players, watch their value move overnight, and get value alerts.
        </p>
        <Link href="/login">
          <Button kind="primary">Sign in</Button>
        </Link>
      </div>
    );
  }

  const players = await getWatchlist().catch(() => []);
  const weekMoveM = players.reduce((s, p) => s + p.dWeek, 0);

  return (
    <div className="max-w-[1000px] mx-auto px-6 py-8">
      <div className="mb-7">
        <div className="text-[11px] uppercase tracking-[0.18em] text-mute-soft mb-2 num">Your watchlist</div>
        <h1 className="display text-[clamp(26px,4vw,38px)] leading-[1] tracking-[-0.04em]">
          <span className="num">{players.length}</span> {players.length === 1 ? "player" : "players"}.{" "}
          {players.length > 0 && (
            <span className={cn("font-serif italic", weekMoveM >= 0 ? "text-up" : "text-down")}>
              {weekMoveM >= 0 ? "+" : ""}€{weekMoveM.toFixed(1)}M this week.
            </span>
          )}
        </h1>
      </div>

      {players.length === 0 ? (
        <Card className="p-12 text-center text-mute">
          No players yet. <Link href="/players" className="text-acc hover:underline">Browse players</Link> and tap Watch
          to start tracking.
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="grid grid-cols-[1.5fr_64px_92px_84px] px-4 py-3 text-[10px] uppercase tracking-wider text-mute-soft num border-b border-line bg-ink-900">
            <span>Player</span>
            <span className="text-right">Pos</span>
            <span className="text-right">Value</span>
            <span className="text-right">Week</span>
          </div>
          {players.map((p) => (
            <Link key={p.id} href={`/players/${p.slug}`}>
              <div className="grid grid-cols-[1.5fr_64px_92px_84px] px-4 py-3 items-center hover:bg-overlay/[0.03] transition border-b border-line last:border-0 cursor-pointer">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={p.name} clubBg={p.clubBg} clubColor={p.clubColor} size={28} />
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium truncate">{p.name}</div>
                    <div className="text-[11px] text-mute truncate">{p.club}</div>
                  </div>
                </div>
                <span className="num text-[12px] text-right text-mute">{p.pos}</span>
                <span className="num text-[13px] text-right font-semibold">€{p.val.toFixed(1)}M</span>
                <span className="flex justify-end">
                  <Delta value={p.dWeek} />
                </span>
              </div>
            </Link>
          ))}
        </Card>
      )}
    </div>
  );
}
