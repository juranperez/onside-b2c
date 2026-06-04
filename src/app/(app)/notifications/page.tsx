import type { Metadata } from "next";
import Link from "next/link";
import { Bell, TrendingUp, TrendingDown, Bookmark } from "lucide-react";
import { Card, Avatar, Delta, Button, SectionHead } from "@/components/ui";
import { cn } from "@/lib/utils";
import { getSessionUser } from "@/lib/db/supabase-server";
import { getWatchlist } from "@/lib/watchlist/actions";
import { getMovers } from "@/lib/queries";
import type { PlayerListItem } from "@/lib/queries/map";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Notifications — Onside",
  description: "Value alerts from your watchlist and the week's biggest market movers.",
};

function FeedRow({ p, note }: { p: PlayerListItem; note: string }) {
  const up = p.dWeek >= 0;
  return (
    <Link href={`/players/${p.slug}`}>
      <div className="flex items-center gap-3 px-4 py-3.5 hover:bg-overlay/[0.03] transition border-b border-line last:border-0 cursor-pointer">
        <div
          className={cn(
            "w-8 h-8 rounded-full grid place-items-center shrink-0",
            up ? "bg-up/12 text-up" : "bg-down/12 text-down",
          )}
        >
          {up ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
        </div>
        <Avatar name={p.name} clubBg={p.clubBg} clubColor={p.clubColor} size={30} />
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-medium truncate">{p.name}</div>
          <div className="text-[11px] text-mute truncate">{note}</div>
        </div>
        <div className="text-right shrink-0">
          <div className="num text-[13px] font-semibold">€{p.val.toFixed(1)}M</div>
          <Delta value={p.dWeek} />
        </div>
      </div>
    </Link>
  );
}

export default async function NotificationsPage() {
  const user = await getSessionUser().catch(() => null);
  const watch = user ? await getWatchlist().catch(() => []) : [];
  const alerts = watch
    .filter((p) => Math.abs(p.dWeek) >= 0.5)
    .sort((a, b) => Math.abs(b.dWeek) - Math.abs(a.dWeek));
  const movers = await getMovers(8, "all").catch(() => []);

  return (
    <div className="max-w-[760px] mx-auto px-6 py-8">
      <div className="flex items-center gap-2.5 mb-6">
        <Bell size={18} className="text-acc" />
        <h1 className="display text-[28px]">Notifications</h1>
      </div>

      {/* Watchlist value alerts */}
      {user ? (
        alerts.length > 0 ? (
          <div className="mb-8">
            <SectionHead eyebrow="From your watchlist" title="Value alerts" />
            <Card className="overflow-hidden">
              {alerts.map((p) => (
                <FeedRow key={p.id} p={p} note={`Your watched player ${p.dWeek >= 0 ? "rose" : "fell"} this week`} />
              ))}
            </Card>
          </div>
        ) : (
          <Card className="p-6 mb-8 text-center text-mute text-[13px]">
            {watch.length === 0 ? (
              <>
                You&apos;re not watching anyone yet.{" "}
                <Link href="/players" className="text-acc hover:underline">Add players</Link> to get value alerts.
              </>
            ) : (
              <>
                No big moves across your {watch.length} watched {watch.length === 1 ? "player" : "players"} this week —
                we&apos;ll flag the next one.
              </>
            )}
          </Card>
        )
      ) : (
        <Card className="p-6 mb-8 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="text-[14px] font-semibold mb-0.5">Get personalized alerts</div>
            <div className="text-[12px] text-mute">Sign in to track players and get notified when their value moves.</div>
          </div>
          <Link href="/login">
            <Button kind="primary" size="sm" icon={<Bookmark size={13} />}>Sign in</Button>
          </Link>
        </Card>
      )}

      {/* Market-wide movers — useful to everyone */}
      <SectionHead eyebrow="Across the market" title="Biggest movers this week" />
      <Card className="overflow-hidden">
        {movers.map((p) => (
          <FeedRow key={p.id} p={p} note={`${p.club} · ${p.pos}`} />
        ))}
      </Card>
    </div>
  );
}
