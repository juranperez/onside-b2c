import type { Metadata } from "next";
import Link from "next/link";
import { Search, Users, Building2, Globe } from "lucide-react";
import { Card, Avatar, Delta, Chip } from "@/components/ui";
import { searchAll, type SearchResults } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Search — Onside",
  description: "Search players, clubs and leagues across the Onside valuation universe.",
};

const SUGGESTIONS = ["Yamal", "Chelsea", "Real Madrid", "Premier League", "Bellingham"];

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const term = (q ?? "").trim();

  let results: SearchResults = { players: [], clubs: [], leagues: [] };
  if (term) {
    results = await searchAll(term).catch(() => ({ players: [], clubs: [], leagues: [] }));
  }

  const total = results.players.length + results.clubs.length + results.leagues.length;

  return (
    <div className="max-w-[900px] mx-auto px-6 py-8">
      {/* Search bar */}
      <div className="mb-8">
        <form action="/search" method="get" className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-mute pointer-events-none" />
          <input
            type="text"
            name="q"
            defaultValue={term}
            placeholder="Search players, clubs, leagues..."
            autoComplete="off"
            autoFocus
            className="w-full h-14 pl-12 pr-4 bg-ink-800 border border-line rounded-xl text-[15px] outline-none focus:border-acc/50 transition placeholder:text-mute-soft"
          />
        </form>
        <div className="flex flex-wrap gap-2 mt-3">
          {SUGGESTIONS.map((s) => (
            <Link
              key={s}
              href={`/search?q=${encodeURIComponent(s)}`}
              className="px-3 py-1.5 rounded-lg bg-ink-800 border border-line text-[12px] text-mute hover:text-fg transition"
            >
              {s}
            </Link>
          ))}
        </div>
      </div>

      {/* No query — friendly prompt */}
      {!term && (
        <Card className="px-6 py-12 text-center">
          <Search size={28} className="mx-auto text-mute-soft mb-3" />
          <h1 className="display text-[22px] tracking-tight mb-1.5">Search players, clubs and leagues</h1>
          <p className="text-mute text-[13px]">
            Start typing a name above, or pick one of the suggestions to explore the Onside valuation universe.
          </p>
        </Card>
      )}

      {/* Query, but nothing matched */}
      {term && total === 0 && (
        <Card className="px-6 py-12 text-center">
          <h1 className="display text-[22px] tracking-tight mb-1.5">No results for &ldquo;{term}&rdquo;</h1>
          <p className="text-mute text-[13px]">Try a different spelling, or search by club or league instead.</p>
        </Card>
      )}

      {/* Results */}
      {term && total > 0 && (
        <div className="space-y-6">
          {/* Players */}
          {results.players.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Users size={14} className="text-mute" />
                <span className="text-[13px] font-semibold">Players</span>
                <Chip tone="neutral">{results.players.length}</Chip>
              </div>
              <Card className="overflow-hidden">
                {results.players.map((p) => (
                  <Link
                    key={p.id}
                    href={`/players/${p.slug}`}
                    className="flex items-center gap-3 px-4 py-3 border-b border-line last:border-0 hover:bg-overlay/[0.03] transition"
                  >
                    <Avatar name={p.displayName} clubBg={p.clubBg} clubColor={p.clubColor} size={32} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium truncate">{p.displayName}</div>
                      <div className="text-[11px] text-mute truncate">
                        {p.club} &middot; {p.pos}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="num text-[13px] font-semibold">€{p.val.toFixed(1)}M</div>
                      <Delta value={p.dWeek} />
                    </div>
                  </Link>
                ))}
              </Card>
            </section>
          )}

          {/* Clubs */}
          {results.clubs.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Building2 size={14} className="text-mute" />
                <span className="text-[13px] font-semibold">Clubs</span>
                <Chip tone="neutral">{results.clubs.length}</Chip>
              </div>
              <Card className="overflow-hidden">
                {results.clubs.map((c) => (
                  <Link
                    key={c.slug}
                    href={`/clubs/${c.slug}`}
                    className="flex items-center gap-3 px-4 py-3 border-b border-line last:border-0 hover:bg-overlay/[0.03] transition"
                  >
                    <div
                      className="w-8 h-8 rounded-md grid place-items-center text-[10px] font-bold num shrink-0"
                      style={{ background: c.bg, color: c.color }}
                    >
                      {c.short.slice(0, 3)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium truncate">{c.name}</div>
                      <div className="text-[11px] text-mute truncate">{c.league}</div>
                    </div>
                    <span className="num text-[13px] font-semibold shrink-0">€{c.squadValueM}M</span>
                  </Link>
                ))}
              </Card>
            </section>
          )}

          {/* Leagues */}
          {results.leagues.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Globe size={14} className="text-mute" />
                <span className="text-[13px] font-semibold">Leagues</span>
                <Chip tone="neutral">{results.leagues.length}</Chip>
              </div>
              <Card className="overflow-hidden">
                {results.leagues.map((l) => (
                  <Link
                    key={l.slug}
                    href={`/leagues/${l.slug}`}
                    className="flex items-center gap-3 px-4 py-3 border-b border-line last:border-0 hover:bg-overlay/[0.03] transition"
                  >
                    <div className="w-8 h-8 rounded-md grid place-items-center bg-ink-700 border border-line shrink-0">
                      <Globe size={15} className="text-mute" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium truncate">{l.name}</div>
                      <div className="text-[11px] text-mute truncate">
                        {l.country ?? "—"} &middot; {l.clubCount} clubs
                      </div>
                    </div>
                    <span className="num text-[13px] font-semibold shrink-0">€{l.totalValueM}M</span>
                  </Link>
                ))}
              </Card>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
