import type { Metadata } from "next";
import { getClubsRanked, type ClubSummary } from "@/lib/queries";
import { ClubsBrowser } from "@/components/clubs/ClubsBrowser";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Clubs — Onside",
  description:
    "The most valuable squads, ranked. Every club's combined Onside valuation, live, across Europe's leading leagues.",
};

export default async function ClubsPage() {
  let clubs: ClubSummary[] = [];
  try {
    clubs = await getClubsRanked(120);
  } catch (e) {
    // A transient data issue must never crash the build/page — degrade to empty state.
    console.error("[clubs] data unavailable at render:", e);
  }
  return <ClubsBrowser clubs={clubs} />;
}
