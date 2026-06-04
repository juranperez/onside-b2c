import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Trophy } from "lucide-react";
import { Card, SectionHead, Chip } from "@/components/ui";
import { getNationalTeams, type NationalTeamSummary } from "@/lib/queries";
import { nationCode, nationStyle, nationFlagSrc } from "@/components/worldcup/nation-code";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "World Cup 2026 projected bracket — Onside",
  description:
    "A projected Round of 32 for the 2026 tournament, seeding the top two squads per group by Onside value. Clearly labelled as a projection.",
};

function money(m: number): string {
  if (m >= 1000) return `€${(m / 1000).toFixed(2)}B`;
  return `€${m.toFixed(0)}M`;
}

interface Seed extends NationalTeamSummary {
  seedLabel: string; // e.g. "1A" (winner of A) or "2A" (runner-up of A)
}

function CodeTile({ slug, name, size = 30 }: { slug: string; name: string; size?: number }) {
  const flag = nationFlagSrc(slug);
  if (flag) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={flag} alt={name} width={size} height={size} className="rounded-full shrink-0 ring-1 ring-line/60 object-cover" style={{ width: size, height: size }} />
    );
  }
  const style = nationStyle(slug);
  return (
    <div
      className="rounded-full grid place-items-center font-bold num shrink-0 tracking-tight"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.3), background: style.bg, color: style.color }}
    >
      {nationCode(slug, name)}
    </div>
  );
}

function SeedRow({ seed }: { seed: Seed | null }) {
  if (!seed) {
    return (
      <div className="flex items-center gap-2.5 py-2">
        <div className="w-[30px] h-[30px] rounded-md bg-ink-800 border border-line grid place-items-center text-[10px] text-mute-soft num">
          TBD
        </div>
        <span className="text-[12px] text-mute">To be decided</span>
      </div>
    );
  }
  return (
    <Link href={`/worldcup/teams/${seed.slug}`} className="block">
      <div className="flex items-center gap-2.5 py-2 hover:opacity-80 transition">
        <CodeTile slug={seed.slug} name={seed.name} />
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-medium truncate">{seed.name}</div>
          <div className="text-[10px] text-mute num">{seed.seedLabel} · {money(seed.squadValueM)}</div>
        </div>
      </div>
    </Link>
  );
}

export default async function BracketPage() {
  let nations: NationalTeamSummary[] = [];
  try {
    nations = await getNationalTeams();
  } catch (e) {
    console.error("[worldcup/bracket] data unavailable at render:", e);
  }

  // Build group standings, take top 2 per group by squad value.
  const byGroup = new Map<string, NationalTeamSummary[]>();
  for (const n of nations) {
    if (!n.group) continue;
    const arr = byGroup.get(n.group) ?? [];
    arr.push(n);
    byGroup.set(n.group, arr);
  }
  const groupLetters = [...byGroup.keys()].sort((a, b) => a.localeCompare(b));

  const winners: Seed[] = [];
  const runnersUp: Seed[] = [];
  for (const letter of groupLetters) {
    const ranked = [...(byGroup.get(letter) ?? [])].sort((a, b) => b.squadValueM - a.squadValueM);
    if (ranked[0]) winners.push({ ...ranked[0], seedLabel: `1${letter}` });
    if (ranked[1]) runnersUp.push({ ...ranked[1], seedLabel: `2${letter}` });
  }

  const qualifierCount = winners.length + runnersUp.length;

  // Projected R32: pair the strongest group winners against the weakest runners-up
  // (classic seeding). Winners sorted by value desc, runners-up sorted by value asc.
  const winSorted = [...winners].sort((a, b) => b.squadValueM - a.squadValueM);
  const ruSorted = [...runnersUp].sort((a, b) => a.squadValueM - b.squadValueM);
  const matchCount = Math.max(winSorted.length, ruSorted.length);
  const matchups = Array.from({ length: matchCount }, (_, i) => ({
    a: winSorted[i] ?? null,
    b: ruSorted[i] ?? null,
  }));

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-8">
      <Link href="/worldcup" className="inline-flex items-center gap-1.5 text-[13px] text-mute hover:text-fg transition mb-6">
        <ArrowLeft size={14} /> World Cup 2026
      </Link>

      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px] uppercase tracking-[0.18em] text-mute-soft num">Knockout stage</span>
          <Chip tone="acc">Projected</Chip>
        </div>
        <h1 className="display text-[clamp(28px,4vw,40px)] tracking-tight">
          Projected <span className="font-serif italic text-acc">Round of 32</span>
        </h1>
        <p className="text-[13px] text-mute mt-2 max-w-[620px]">
          A projection only — we take the top two squads per group by Onside value as the qualifiers, then seed
          group winners against runners-up. Nothing here is an official draw.
        </p>
      </div>

      {qualifierCount === 0 ? (
        <Card className="p-12 text-center text-mute">
          Bracket data isn&apos;t available right now.{" "}
          <Link href="/worldcup" className="text-acc hover:underline">Back to the hub</Link>.
        </Card>
      ) : (
        <>
          {/* Projected matchups */}
          <SectionHead eyebrow="Seeded winners vs runners-up" title={`Projected R32 · ${matchups.length} ties`} />
          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-12">
            {matchups.map((m, i) => (
              <Card key={i} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase tracking-wider text-mute-soft num">Tie {i + 1}</span>
                  <Trophy size={12} className="text-mute-soft" />
                </div>
                <div className="divide-y divide-line">
                  <SeedRow seed={m.a} />
                  <SeedRow seed={m.b} />
                </div>
              </Card>
            ))}
          </div>

          {/* Qualifier pools */}
          <div className="grid lg:grid-cols-2 gap-6">
            <div>
              <SectionHead eyebrow="Top of each group (projected)" title="Group winners" />
              <Card className="overflow-hidden">
                {winners.length === 0 ? (
                  <div className="p-8 text-center text-mute">No qualifiers yet.</div>
                ) : (
                  winners.map((s) => (
                    <Link key={s.slug} href={`/worldcup/teams/${s.slug}`}>
                      <div className="flex items-center gap-3 px-4 py-3 hover:bg-overlay/[0.03] transition cursor-pointer border-b border-line last:border-0">
                        <span className="num text-[11px] text-acc w-8">{s.seedLabel}</span>
                        <CodeTile slug={s.slug} name={s.name} size={28} />
                        <span className="text-[13px] font-medium flex-1 truncate">{s.name}</span>
                        <span className="num text-[12px] text-mute">{money(s.squadValueM)}</span>
                      </div>
                    </Link>
                  ))
                )}
              </Card>
            </div>
            <div>
              <SectionHead eyebrow="Runners-up (projected)" title="Group runners-up" />
              <Card className="overflow-hidden">
                {runnersUp.length === 0 ? (
                  <div className="p-8 text-center text-mute">No qualifiers yet.</div>
                ) : (
                  runnersUp.map((s) => (
                    <Link key={s.slug} href={`/worldcup/teams/${s.slug}`}>
                      <div className="flex items-center gap-3 px-4 py-3 hover:bg-overlay/[0.03] transition cursor-pointer border-b border-line last:border-0">
                        <span className="num text-[11px] text-mute w-8">{s.seedLabel}</span>
                        <CodeTile slug={s.slug} name={s.name} size={28} />
                        <span className="text-[13px] font-medium flex-1 truncate">{s.name}</span>
                        <span className="num text-[12px] text-mute">{money(s.squadValueM)}</span>
                      </div>
                    </Link>
                  ))
                )}
              </Card>
            </div>
          </div>
          <p className="text-[11px] text-mute-soft mt-4">
            Projection based on combined Onside squad value, not results. The real knockout draw depends on
            matches played — this is an illustration of where the talent sits.
          </p>
        </>
      )}
    </div>
  );
}
