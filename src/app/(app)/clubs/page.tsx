"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Card, Tabs, SectionHead, Delta } from "@/components/ui";
import { fmtVal } from "@/lib/utils";

const CLUBS = [
  { slug: "manchester-city", name: "Manchester City", short: "MCI", league: "Premier League", leagueSlug: "premier-league", bg: "#6CABDD", color: "#1C2C5B", val: 1280, delta: 24, pos: 1, avgAge: 27.2 },
  { slug: "real-madrid", name: "Real Madrid", short: "RMA", league: "La Liga", leagueSlug: "la-liga", bg: "#FEBE10", color: "#00529F", val: 1240, delta: 18, pos: 1, avgAge: 26.8 },
  { slug: "arsenal", name: "Arsenal", short: "ARS", league: "Premier League", leagueSlug: "premier-league", bg: "#EF0107", color: "#FFFFFF", val: 1180, delta: 32, pos: 2, avgAge: 25.4 },
  { slug: "barcelona", name: "Barcelona", short: "BAR", league: "La Liga", leagueSlug: "la-liga", bg: "#A50044", color: "#EDBB00", val: 1150, delta: 45, pos: 2, avgAge: 25.1 },
  { slug: "bayern-munich", name: "Bayern Munich", short: "BAY", league: "Bundesliga", leagueSlug: "bundesliga", bg: "#DC052D", color: "#0066B2", val: 1080, delta: -12, pos: 1, avgAge: 27.0 },
  { slug: "liverpool", name: "Liverpool", short: "LIV", league: "Premier League", leagueSlug: "premier-league", bg: "#C8102E", color: "#FFFFFF", val: 1020, delta: 15, pos: 3, avgAge: 26.5 },
  { slug: "chelsea", name: "Chelsea", short: "CHE", league: "Premier League", leagueSlug: "premier-league", bg: "#034694", color: "#DBA111", val: 960, delta: 28, pos: 5, avgAge: 24.2 },
  { slug: "paris-saint-germain", name: "Paris Saint-Germain", short: "PSG", league: "Ligue 1", leagueSlug: "ligue-1", bg: "#004170", color: "#DA291C", val: 920, delta: -35, pos: 1, avgAge: 25.8 },
  { slug: "inter-milan", name: "Inter Milan", short: "INT", league: "Serie A", leagueSlug: "serie-a", bg: "#010E80", color: "#FFFFFF", val: 780, delta: 8, pos: 1, avgAge: 28.1 },
  { slug: "borussia-dortmund", name: "Borussia Dortmund", short: "BVB", league: "Bundesliga", leagueSlug: "bundesliga", bg: "#FDE100", color: "#000000", val: 720, delta: 14, pos: 3, avgAge: 25.6 },
  { slug: "tottenham", name: "Tottenham Hotspur", short: "TOT", league: "Premier League", leagueSlug: "premier-league", bg: "#132257", color: "#FFFFFF", val: 680, delta: -8, pos: 6, avgAge: 25.9 },
  { slug: "atletico-madrid", name: "Atletico Madrid", short: "ATM", league: "La Liga", leagueSlug: "la-liga", bg: "#272E61", color: "#CB3524", val: 660, delta: 5, pos: 3, avgAge: 27.4 },
  { slug: "juventus", name: "Juventus", short: "JUV", league: "Serie A", leagueSlug: "serie-a", bg: "#000000", color: "#FFFFFF", val: 640, delta: -18, pos: 3, avgAge: 26.7 },
  { slug: "manchester-united", name: "Manchester United", short: "MUN", league: "Premier League", leagueSlug: "premier-league", bg: "#DA291C", color: "#FBE122", val: 620, delta: -22, pos: 8, avgAge: 26.1 },
  { slug: "bayer-leverkusen", name: "Bayer Leverkusen", short: "LEV", league: "Bundesliga", leagueSlug: "bundesliga", bg: "#E32221", color: "#000000", val: 580, delta: 38, pos: 2, avgAge: 25.3 },
  { slug: "napoli", name: "Napoli", short: "NAP", league: "Serie A", leagueSlug: "serie-a", bg: "#12A0D7", color: "#FFFFFF", val: 560, delta: -15, pos: 2, avgAge: 27.2 },
];

export default function ClubsPage() {
  const [league, setLeague] = useState("all");

  const filtered = CLUBS
    .filter((c) => league === "all" || c.leagueSlug === league)
    .sort((a, b) => b.val - a.val);

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-8">
      <div className="flex items-end justify-between mb-7 flex-wrap gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-mute-soft mb-2 num">Club rankings</div>
          <h1 className="display text-[clamp(28px,4vw,40px)] leading-[1] tracking-[-0.04em]">
            <span className="num">96</span> squads.{" "}
            <span className="font-serif italic text-acc">Ranked by value.</span>
          </h1>
        </div>
        <Tabs
          size="sm"
          value={league}
          onChange={setLeague}
          tabs={[
            { id: "all", label: "All" },
            { id: "premier-league", label: "PL" },
            { id: "la-liga", label: "Liga" },
            { id: "bundesliga", label: "BL" },
            { id: "serie-a", label: "SA" },
            { id: "ligue-1", label: "L1" },
          ]}
        />
      </div>

      <Card className="overflow-hidden">
        <div className="grid grid-cols-[40px_1.5fr_100px_80px_80px_90px] px-4 py-3 text-[10px] uppercase tracking-wider text-mute-soft num border-b border-line bg-ink-900">
          <span>#</span>
          <span>Club</span>
          <span className="text-right">League</span>
          <span className="text-right">Avg Age</span>
          <span className="text-right">Squad Val</span>
          <span className="text-right">Delta</span>
        </div>
        {filtered.map((c, i) => (
          <Link key={c.slug} href={`/clubs/${c.slug}`}>
            <div className="grid grid-cols-[40px_1.5fr_100px_80px_80px_90px] px-4 py-3 items-center hover:bg-white/[0.03] transition border-b border-line last:border-0 cursor-pointer">
              <span className="num text-[12px] text-mute-soft">{i + 1}</span>
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-8 h-8 rounded-[6px] grid place-items-center text-[10px] font-bold num shrink-0"
                  style={{ background: c.bg, color: c.color }}
                >
                  {c.short}
                </div>
                <div className="min-w-0">
                  <div className="text-[13.5px] font-semibold truncate">{c.name}</div>
                </div>
              </div>
              <span className="text-[11px] text-mute text-right">{c.league}</span>
              <span className="num text-[12px] text-right">{c.avgAge.toFixed(1)}</span>
              <span className="num text-[13px] text-right font-semibold">{fmtVal(c.val)}</span>
              <span className="text-right"><Delta value={c.delta} /></span>
            </div>
          </Link>
        ))}
      </Card>
    </div>
  );
}
