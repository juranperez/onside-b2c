import type { Metadata } from "next";
import { Bookmark } from "lucide-react";
import { ComingSoon } from "@/components/ui";

export const metadata: Metadata = {
  title: "Watchlist — Onside",
  description: "Track players and get value alerts. Sign-in and watchlists are coming soon to Onside.",
};

export default function WatchlistPage() {
  return (
    <ComingSoon
      icon={<Bookmark size={20} />}
      eyebrow="Your portfolio"
      title="Your watchlist"
      line="Sign-in and watchlists are coming soon — track players and get value alerts."
      cta={{ label: "Browse players", href: "/players" }}
    />
  );
}
