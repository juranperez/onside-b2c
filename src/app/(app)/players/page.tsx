import type { Metadata } from "next";
import { getBrowsePlayers, getCounts } from "@/lib/queries";
import { PlayersBrowser } from "@/components/players/PlayersBrowser";
import type { PlayerListItem } from "@/lib/queries/map";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Players — Onside",
  description:
    "Every player, every valuation, live. Browse the most valuable footballers with Onside's model valuations.",
};

export default async function PlayersPage() {
  let players: PlayerListItem[] = [];
  let total = 0;
  try {
    players = await getBrowsePlayers();
    total = (await getCounts()).players;
  } catch (e) {
    // Never let a transient data issue crash the build/page — degrade to empty state.
    console.error("[players] data unavailable at render:", e);
  }
  return <PlayersBrowser players={players} total={total} />;
}
