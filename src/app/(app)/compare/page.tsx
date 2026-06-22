import type { Metadata } from "next";
import Link from "next/link";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, Avatar, Delta, Chip, SectionHead, Button } from "@/components/ui";
import { ShareButton } from "@/components/ui/share-button";
import { CompareRadar } from "@/components/players/PerformanceRadar";
import { getPlayerBySlug, getTopPlayers } from "@/lib/queries";
import type { PlayerProfile, PlayerListItem } from "@/lib/queries/map";

export const metadata: Metadata = {
  title: "Compare players — Onside",
  description:
    "Put up to four players head to head: Onside valuations, confidence bands, performance radar against elite benchmarks, value pillars and key season stats.",
};

const MAX = 4;
// Slot colors: accent first, then distinct overlay hues that survive both themes.
const SLOT_COLORS = ["#E8FF5A", "#00E599", "#7DD3FC", "#F0ABFC"];

// EUR → "€xx.xM"
function eurM(v: number): string {
  return `€${(v / 1e6).toFixed(1)}M`;
}

/** Selected slugs: new ?p=a,b,c,d form, with legacy ?a&?b still honoured. */
function parseSlugs(sp: { p?: string; a?: string; b?: string }): string[] {
  const fromP = (sp.p ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const legacy = [sp.a, sp.b].filter((s): s is string => Boolean(s));
  return [...new Set([...fromP, ...legacy])].slice(0, MAX);
}

const compareHref = (slugs: string[]) => (slugs.length ? `/compare?p=${slugs.map(encodeURIComponent).join(",")}` : "/compare");

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ p?: string; a?: string; b?: string; add?: string }>;
}) {
  const sp = await searchParams;
  const slugs = parseSlugs(sp);

  if (slugs.length >= 2 && sp.add !== "1") {
    const loaded = await Promise.all(slugs.map((s) => getPlayerBySlug(s).catch(() => null)));
    const players = loaded.filter((p): p is PlayerProfile => p !== null);
    if (players.length >= 2) return <Comparison players={players} slugs={slugs} />;
    return (
      <div className="max-w-[1200px] mx-auto px-6 py-8">
        <CompareHeader />
        <Card className="px-6 py-12 text-center mt-2">
          <h2 className="display text-[22px] tracking-tight mb-1.5">We couldn&apos;t load that match-up</h2>
          <p className="text-mute text-[13px] mb-6">Someone in that line-up isn&apos;t in our universe. Pick again from the board.</p>
          <Link href="/compare">
            <Button kind="primary">Start a new comparison</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const players = await getTopPlayers(24).catch(() => [] as PlayerListItem[]);
  return <Picker players={players} picked={slugs} />;
}

function CompareHeader() {
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

function Picker({ players, picked }: { players: PlayerListItem[]; picked: string[] }) {
  const pickedItems = picked.map((s) => players.find((p) => p.slug === s) ?? null);

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-8">
      <div className="text-center mb-8">
        <div className="text-[11px] uppercase tracking-[0.18em] text-mute-soft mb-2 num">Head to head</div>
        <h1 className="display text-[clamp(28px,4vw,40px)] tracking-tight">
          {picked.length ? (
            <>
              Add a <span className="font-serif italic text-acc">challenger</span>
            </>
          ) : (
            <>
              Pick up to four <span className="font-serif italic text-acc">players</span>
            </>
          )}
        </h1>
        <p className="text-[13px] text-mute mt-2">
          {picked.length
            ? `${picked.length} in. Add up to ${MAX - picked.length} more, then start the comparison.`
            : "Choose your first player — two unlocks the head-to-head, four fills the board."}
        </p>
      </div>

      {picked.length > 0 && (
        <div className="flex items-center justify-center gap-2.5 mb-6 flex-wrap">
          {picked.map((slug, i) => (
            <span key={slug} className="inline-flex items-center gap-1.5">
              <Chip tone="acc" icon={<span className="num">{String.fromCharCode(65 + i)}</span>}>
                {pickedItems[i]?.displayName ?? slug}
              </Chip>
              <Link
                href={compareHref(picked.filter((s) => s !== slug))}
                aria-label={`Remove ${pickedItems[i]?.displayName ?? slug}`}
                className="text-mute-soft hover:text-fg transition"
              >
                <X size={13} />
              </Link>
            </span>
          ))}
          {picked.length >= 2 && (
            <Link href={compareHref(picked)}>
              <Button kind="primary" size="sm">Compare {picked.length}</Button>
            </Link>
          )}
          <Link href="/compare" className="text-[12px] text-mute hover:text-fg transition ml-1">
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
            const isPicked = picked.includes(p.slug);
            const full = picked.length >= MAX;
            const href = compareHref([...picked, p.slug]);
            const card = (
              <div
                className={cn(
                  "rounded-2xl bg-ink-850 transition border p-5 text-left relative overflow-hidden h-full",
                  isPicked ? "border-acc/50 opacity-60" : full ? "border-line opacity-40" : "border-line hover:bg-ink-800 cursor-pointer",
                )}
              >
                <div
                  className="absolute inset-0 opacity-25 pointer-events-none"
                  style={{ background: `linear-gradient(160deg, ${p.clubBg} 0%, transparent 70%)` }}
                />
                <div className="relative">
                  <div className="flex items-start justify-between mb-4">
                    <Avatar name={p.displayName} clubBg={p.clubBg} clubColor={p.clubColor} size={48} />
                    {isPicked ? <Chip tone="acc">Picked</Chip> : <Delta value={p.dWeek} big />}
                  </div>
                  <div className="text-[15px] font-semibold leading-tight">{p.displayName}</div>
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
            return isPicked || full ? (
              <div key={p.id}>{card}</div>
            ) : (
              <Link key={p.id} href={href} prefetch={false}>
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

function bestIdx(values: (number | null)[]): number {
  let idx = -1;
  let best = -Infinity;
  values.forEach((v, i) => {
    if (v != null && v > best) {
      best = v;
      idx = i;
    }
  });
  return idx;
}

function StatRow({ label, values, fmt }: { label: string; values: (number | null)[]; fmt?: (v: number) => string }) {
  const winner = bestIdx(values);
  return (
    <div className="border-b border-line pb-3 last:border-0">
      <div className="text-[10px] text-mute-soft uppercase tracking-wider mb-2 text-center">{label}</div>
      <div className="grid px-1" style={{ gridTemplateColumns: `repeat(${values.length}, 1fr)` }}>
        {values.map((v, i) => (
          <span key={i} className={cn("num text-[15px] font-semibold text-center", i === winner && "text-up")}>
            {v == null ? "—" : fmt ? fmt(v) : v}
          </span>
        ))}
      </div>
    </div>
  );
}

function Comparison({ players, slugs }: { players: PlayerProfile[]; slugs: string[] }) {
  const n = players.length;
  const cols = `repeat(${n}, minmax(0, 1fr))`;

  // Union of pillar labels across everyone, in first-seen order.
  const pillarLabels: string[] = [];
  for (const p of players) for (const pl of p.pillars) if (!pillarLabels.includes(pl.label)) pillarLabels.push(pl.label);
  const pillarMaps = players.map((p) => new Map(p.pillars.map((pl) => [pl.label, pl.value])));

  const radarEntries = players
    .map((p, i) => (p.radar ? { label: p.displayName, color: SLOT_COLORS[i], radar: p.radar } : null))
    .filter((e): e is NonNullable<typeof e> => e !== null);

  const maxValue = Math.max(...players.map((p) => p.value));

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-8">
      <CompareHeader />

      {/* Player headers */}
      <div className="grid gap-3 mb-8" style={{ gridTemplateColumns: cols }}>
        {players.map((p, i) => (
          <PlayerHeadCard key={p.slug} p={p} badge={String.fromCharCode(65 + i)} color={SLOT_COLORS[i]} highlight={p.value === maxValue} removeHref={compareHref(slugs.filter((s) => s !== p.slug))} canRemove={n > 2} />
        ))}
      </div>

      {/* Performance radar overlay — benchmark axes */}
      {radarEntries.length >= 2 && (
        <Card className="p-6 mb-4">
          <SectionHead eyebrow="Per-90 and percentages vs elite benchmarks" title="How they play" />
          <div className="flex flex-col md:flex-row items-center gap-6">
            <CompareRadar entries={radarEntries} size={300} />
            <div className="flex md:flex-col gap-3 flex-wrap">
              {radarEntries.map((e) => (
                <span key={e.label} className="inline-flex items-center gap-2 text-[13px]">
                  <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: e.color }} />
                  {e.label}
                </span>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Pillar comparison */}
      {pillarLabels.length > 0 && (
        <Card className="p-6">
          <SectionHead eyebrow="What drives the value" title="Valuation pillars" />
          <div className="space-y-4">
            {pillarLabels.map((label) => {
              const vals = pillarMaps.map((m) => m.get(label) ?? 0);
              const winner = bestIdx(vals);
              return (
                <div key={label}>
                  <div className="text-[12px] text-mute text-center mb-1">{label}</div>
                  <div className="grid gap-1.5" style={{ gridTemplateColumns: cols }}>
                    {vals.map((v, i) => (
                      <div key={i}>
                        <div className={cn("num text-[12px] font-semibold text-center mb-1", i === winner && "text-up")}>{v}</div>
                        <div className="h-1.5 rounded-full bg-ink-700 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${v}%`, background: i === winner ? "var(--up, #00E599)" : SLOT_COLORS[i] + "66" }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Key season stats */}
      <Card className="p-6 mt-4">
        <SectionHead eyebrow={players[0].stats ? `Season ${players[0].stats.season}/${(players[0].stats.season + 1) % 100}` : "This season"} title="Key stats" />
        <div className="space-y-1">
          <StatRow label="Goals" values={players.map((p) => p.stats?.goals ?? null)} />
          <StatRow label="Assists" values={players.map((p) => p.stats?.assists ?? null)} />
          <StatRow label="Minutes" values={players.map((p) => p.stats?.minutes ?? null)} fmt={(v) => v.toLocaleString()} />
          <StatRow label="Expected goals" values={players.map((p) => p.stats?.xg ?? null)} fmt={(v) => v.toFixed(1)} />
          <StatRow label="Rating" values={players.map((p) => p.stats?.rating ?? null)} fmt={(v) => v.toFixed(2)} />
          <StatRow label="Age" values={players.map((p) => (p.age != null ? -p.age : null))} fmt={(v) => `${-v}`} />
        </div>
        <p className="text-[10px] text-mute-soft mt-3">Age: younger wins. Radar axes capped at elite benchmarks · Onside data engine.</p>
      </Card>

      <div className="flex items-center justify-center gap-4 mt-6">
        <ShareButton title={`${players.map((p) => p.displayName).join(" vs ")} — Onside head-to-head`} />
        {n < MAX && (
          <Link href={`/compare?p=${slugs.map(encodeURIComponent).join(",")}&add=1`} className="text-[13px] text-acc hover:underline transition">
            Add another player
          </Link>
        )}
        <Link href="/compare" className="text-[13px] text-mute hover:text-fg transition">
          Start over
        </Link>
      </div>
    </div>
  );
}

function PlayerHeadCard({
  p,
  badge,
  color,
  highlight,
  removeHref,
  canRemove,
}: {
  p: PlayerProfile;
  badge: string;
  color: string;
  highlight: boolean;
  removeHref: string;
  canRemove: boolean;
}) {
  return (
    <div className="relative h-full">
      {canRemove && (
        <Link href={removeHref} aria-label={`Remove ${p.displayName}`} className="absolute top-2.5 right-2.5 z-10 text-mute-soft hover:text-fg transition">
          <X size={14} />
        </Link>
      )}
      <Link href={`/players/${p.slug}`} className="block h-full">
        <Card className={cn("p-4 md:p-5 text-center h-full transition hover:bg-ink-800", highlight && "ring-1 ring-up/40")}>
          <div className="flex justify-center mb-3">
            <Avatar name={p.displayName} clubBg={p.clubBg} clubColor={p.clubColor} src={p.photoUrl} size={56} ring />
          </div>
          <div className="text-[10px] uppercase tracking-[0.18em] num font-bold" style={{ color }}>
            {badge}
          </div>
          <div className="mt-1 text-[14.5px] font-semibold truncate">{p.displayName}</div>
          <div className="text-[11.5px] text-mute truncate">
            {p.club?.name ?? "Free agent"} &middot; {p.detailedPos ?? p.position}
          </div>
          <div className={cn("num display text-[24px] mt-2", highlight && "text-up")}>{eurM(p.value)}</div>
          <div className="flex justify-center mt-1">
            <Delta value={Math.round((p.dWeek / 1e6) * 10) / 10} />
          </div>
          <div className="text-[10.5px] text-mute-soft mt-2 num">
            {p.confidence}% conf &middot; {eurM(p.bandLow)}–{eurM(p.bandHigh)}
          </div>
        </Card>
      </Link>
    </div>
  );
}
