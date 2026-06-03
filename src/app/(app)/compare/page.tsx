import type { Metadata } from "next";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Card, Avatar, Delta, Chip, SectionHead, Button } from "@/components/ui";
import { getPlayerBySlug, getTopPlayers } from "@/lib/queries";
import type { PlayerProfile, PlayerListItem } from "@/lib/queries/map";

export const metadata: Metadata = {
  title: "Compare players — Onside",
  description:
    "Put two players head to head: Onside valuations, confidence bands, value pillars and key season stats, side by side.",
};

// EUR → "€xx.xM"
function eurM(v: number): string {
  return `€${(v / 1e6).toFixed(1)}M`;
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  const { a, b } = await searchParams;

  // Both picked → render the head-to-head.
  if (a && b) {
    const [pa, pb] = await Promise.all([
      getPlayerBySlug(a).catch(() => null),
      getPlayerBySlug(b).catch(() => null),
    ]);

    if (!pa || !pb) {
      return (
        <div className="max-w-[1200px] mx-auto px-6 py-8">
          <ComparHeader />
          <Card className="px-6 py-12 text-center mt-2">
            <h2 className="display text-[22px] tracking-tight mb-1.5">We couldn&apos;t load that match-up</h2>
            <p className="text-mute text-[13px] mb-6">
              One of those players isn&apos;t in our universe. Pick two from the board instead.
            </p>
            <Link href="/compare">
              <Button kind="primary">Start a new comparison</Button>
            </Link>
          </Card>
        </div>
      );
    }

    return <Comparison a={pa} b={pb} />;
  }

  // Otherwise → the picker (with partial selection if `a` is already set).
  const players = await getTopPlayers(24).catch(() => [] as PlayerListItem[]);
  return <Picker players={players} firstPick={a ?? null} />;
}

function ComparHeader() {
  return (
    <div className="text-center mb-8">
      <div className="text-[11px] uppercase tracking-[0.18em] text-mute-soft mb-2 num">Head to head</div>
      <h1 className="display text-[clamp(28px,4vw,40px)] tracking-tight">
        Compare <span className="font-serif italic text-acc">players</span>
      </h1>
    </div>
  );
}

// ─────────────────────────── Picker ───────────────────────────

function Picker({ players, firstPick }: { players: PlayerListItem[]; firstPick: string | null }) {
  const picked = firstPick ? players.find((p) => p.slug === firstPick) ?? null : null;

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-8">
      <div className="text-center mb-8">
        <div className="text-[11px] uppercase tracking-[0.18em] text-mute-soft mb-2 num">Head to head</div>
        <h1 className="display text-[clamp(28px,4vw,40px)] tracking-tight">
          {firstPick ? (
            <>
              Now pick the <span className="font-serif italic text-acc">challenger</span>
            </>
          ) : (
            <>
              Pick two <span className="font-serif italic text-acc">players</span>
            </>
          )}
        </h1>
        <p className="text-[13px] text-mute mt-2">
          {firstPick && picked
            ? `${picked.name} is in. Choose who they go up against.`
            : "Choose your first player, then a second, to put them head to head."}
        </p>
      </div>

      {firstPick && (
        <div className="flex items-center justify-center gap-3 mb-6">
          {picked ? (
            <Chip tone="acc" icon={<span className="num">A</span>}>
              {picked.name}
            </Chip>
          ) : (
            <Chip tone="acc">Player A selected</Chip>
          )}
          <Link href="/compare" className="text-[12px] text-mute hover:text-white transition">
            Reset
          </Link>
        </div>
      )}

      {players.length === 0 ? (
        <Card className="px-6 py-12 text-center">
          <h2 className="display text-[22px] tracking-tight mb-1.5">No players to compare yet</h2>
          <p className="text-mute text-[13px]">The valuation universe is still loading. Check back in a moment.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {players.map((p) => {
            const isPicked = p.slug === firstPick;
            // First pick sets ?a=; second pick appends &b=.
            const href = firstPick
              ? `/compare?a=${encodeURIComponent(firstPick)}&b=${encodeURIComponent(p.slug)}`
              : `/compare?a=${encodeURIComponent(p.slug)}`;
            const card = (
              <div
                className={cn(
                  "rounded-2xl bg-ink-850 transition border p-5 text-left relative overflow-hidden h-full",
                  isPicked ? "border-acc/50 opacity-60" : "border-line hover:bg-ink-800 cursor-pointer",
                )}
              >
                <div
                  className="absolute inset-0 opacity-25 pointer-events-none"
                  style={{ background: `linear-gradient(160deg, ${p.clubBg} 0%, transparent 70%)` }}
                />
                <div className="relative">
                  <div className="flex items-start justify-between mb-4">
                    <Avatar name={p.name} clubBg={p.clubBg} clubColor={p.clubColor} size={48} />
                    {isPicked ? <Chip tone="acc">Picked</Chip> : <Delta value={p.dWeek} big />}
                  </div>
                  <div className="text-[15px] font-semibold leading-tight">{p.name}</div>
                  <div className="text-[11.5px] text-mute mt-1 flex items-center gap-1.5">
                    <div
                      className="w-3 h-3 rounded-[3px] grid place-items-center text-[6px] font-bold num"
                      style={{ background: p.clubBg, color: p.clubColor }}
                    >
                      {p.clubShort.slice(0, 1)}
                    </div>
                    {p.club} &middot; {p.pos}
                  </div>
                  <div className="mt-4 num display text-[24px] leading-none">€{p.val.toFixed(1)}M</div>
                </div>
              </div>
            );
            return isPicked ? (
              <div key={p.id}>{card}</div>
            ) : (
              <Link key={p.id} href={href}>
                {card}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────── Comparison ───────────────────────────

function StatRow({ label, a, b }: { label: string; a: number; b: number }) {
  const aWins = a > b;
  const bWins = b > a;
  return (
    <div className="border-b border-line pb-3 last:border-0">
      <div className="text-[10px] text-mute-soft uppercase tracking-wider mb-2 text-center">{label}</div>
      <div className="flex items-center justify-between px-2">
        <span className={cn("num text-[16px] font-semibold", aWins && "text-up")}>{a}</span>
        <span className={cn("num text-[16px] font-semibold", bWins && "text-up")}>{b}</span>
      </div>
    </div>
  );
}

function Comparison({ a, b }: { a: PlayerProfile; b: PlayerProfile }) {
  // Pair pillars by label across both players (union, preserving A's order then B-only).
  const pillarLabels: string[] = [];
  for (const p of a.pillars) if (!pillarLabels.includes(p.label)) pillarLabels.push(p.label);
  for (const p of b.pillars) if (!pillarLabels.includes(p.label)) pillarLabels.push(p.label);
  const pillarMapA = new Map(a.pillars.map((p) => [p.label, p.value]));
  const pillarMapB = new Map(b.pillars.map((p) => [p.label, p.value]));

  const aRating = a.stats?.rating ?? 0;
  const bRating = b.stats?.rating ?? 0;

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-8">
      <ComparHeader />

      {/* Player headers */}
      <div className="grid grid-cols-[1fr_60px_1fr] sm:grid-cols-[1fr_80px_1fr] gap-4 mb-8">
        <PlayerHeadCard p={a} badge="A" highlight={a.value >= b.value} />
        <div className="flex items-center justify-center">
          <span className="display text-[24px] text-mute-soft">VS</span>
        </div>
        <PlayerHeadCard p={b} badge="B" highlight={b.value > a.value} />
      </div>

      {/* Pillar comparison bars */}
      {pillarLabels.length > 0 && (
        <Card className="p-6">
          <SectionHead eyebrow="What drives the value" title="Valuation pillars" />
          <div className="space-y-4">
            {pillarLabels.map((label) => {
              const av = pillarMapA.get(label) ?? 0;
              const bv = pillarMapB.get(label) ?? 0;
              const aWins = av > bv;
              const bWins = bv > av;
              return (
                <div key={label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={cn("num text-[13px] font-semibold", aWins && "text-up")}>{av}</span>
                    <span className="text-[12px] text-mute">{label}</span>
                    <span className={cn("num text-[13px] font-semibold", bWins && "text-up")}>{bv}</span>
                  </div>
                  <div className="flex gap-1 h-2">
                    <div className="flex-1 flex justify-end">
                      <div
                        className={cn("h-full rounded-l-full", aWins ? "bg-up" : "bg-ink-600")}
                        style={{ width: `${av}%` }}
                      />
                    </div>
                    <div className="flex-1">
                      <div
                        className={cn("h-full rounded-r-full", bWins ? "bg-up" : "bg-ink-600")}
                        style={{ width: `${bv}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Key season stats */}
      <Card className="p-6 mt-4">
        <SectionHead
          eyebrow={a.stats && b.stats ? `Season ${a.stats.season}/${(a.stats.season + 1) % 100}` : "This season"}
          title="Key stats"
        />
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <StatRow label="Goals" a={a.stats?.goals ?? 0} b={b.stats?.goals ?? 0} />
          <StatRow label="Assists" a={a.stats?.assists ?? 0} b={b.stats?.assists ?? 0} />
          <StatRow label="Minutes" a={a.stats?.minutes ?? 0} b={b.stats?.minutes ?? 0} />
          {/* Rating uses 2dp, so render it on its own (not via the integer StatRow). */}
          <div className="border-b border-line pb-3 last:border-0">
            <div className="text-[10px] text-mute-soft uppercase tracking-wider mb-2 text-center">Rating</div>
            <div className="flex items-center justify-between px-2">
              <span className={cn("num text-[16px] font-semibold", aRating > bRating && "text-up")}>
                {aRating ? aRating.toFixed(2) : "—"}
              </span>
              <span className={cn("num text-[16px] font-semibold", bRating > aRating && "text-up")}>
                {bRating ? bRating.toFixed(2) : "—"}
              </span>
            </div>
          </div>
        </div>
      </Card>

      <div className="text-center mt-6">
        <Link href="/compare" className="text-[13px] text-mute hover:text-white transition">
          Compare a different pair
        </Link>
      </div>
    </div>
  );
}

function PlayerHeadCard({ p, badge, highlight }: { p: PlayerProfile; badge: string; highlight: boolean }) {
  return (
    <Link href={`/players/${p.slug}`} className="block">
      <Card className={cn("p-5 text-center h-full transition hover:bg-ink-800", highlight && "ring-1 ring-up/40")}>
        <div className="flex justify-center mb-3">
          <Avatar name={p.name} clubBg={p.clubBg} clubColor={p.clubColor} size={64} ring />
        </div>
        <div className="text-[10px] uppercase tracking-[0.18em] text-mute-soft num">{badge}</div>
        <div className="mt-1 text-[16px] font-semibold">{p.name}</div>
        <div className="text-[12px] text-mute">
          {p.club?.name ?? "Free agent"} &middot; {p.position}
        </div>
        <div className={cn("num display text-[28px] mt-2", highlight && "text-up")}>{eurM(p.value)}</div>
        <div className="flex justify-center mt-1">
          <Delta value={Math.round((p.dWeek / 1e6) * 10) / 10} big />
        </div>
        <div className="text-[11px] text-mute-soft mt-2 num">
          {p.confidence}% confidence &middot; {eurM(p.bandLow)}–{eurM(p.bandHigh)}
        </div>
      </Card>
    </Link>
  );
}
