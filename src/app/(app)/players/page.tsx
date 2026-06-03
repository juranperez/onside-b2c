import type { Metadata } from "next";
import { getTopPlayers, getCounts } from "@/lib/queries";
import { PlayersBrowser } from "@/components/players/PlayersBrowser";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Players — Onside",
  description: "Every player, every valuation, live. Browse the most valuable footballers with Onside's model valuations.",
};

export default async function PlayersPage() {
  const [players, counts] = await Promise.all([getTopPlayers(120), getCounts()]);
  return <PlayersBrowser players={players} total={counts.players} />;
}
