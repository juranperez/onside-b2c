import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, Chip } from "@/components/ui";
import { getNationalTeams, type NationalTeamSummary } from "@/lib/queries";
import { nationCode, nationStyle } from "@/components/worldcup/nation-code";
import { cn } from "@/lib/utils";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "World Cup 2026 groups — squad values by group | Onside",
  description:
    "All 12 groups for the 2026 tournament, each ranked by Onside squad value with FIFA rankings. See which group carries the most talent.",
};

function money(m: number): string {
  if (m >= 1000) return `€${(m / 1000).toFixed(2)}B`;
  return `€${m.toFixed(0)}M`;
}

function CodeTile({ slug, name }: { slug: string; name: string }) {
  const style = nationStyle(slug);
  return (
    <div
      className="w-7 h-7 rounded-md grid place-items-center text-[9px] font-bold num shrink-0 tracking-tight"
      style={{ background: style.bg, color: style.color }}
    >
      {nationCode(slug, name)}
    </div>
  );
}

export default async function WorldCupGroupsPage() {
  let nations: NationalTeamSummary[] = [];
  try {
    nations = await getNationalTeams();
  } catch (e) {
    console.error("[worldcup/groups] data unavailable at render:", e);
  }

  // Group by letter, sort teams within each group by squad value desc.
  const byGroup = new Map<string, NationalTeamSummary[]>();
  for (const n of nations) {
    if (!n.group) continue;
    const arr = byGroup.get(n.group) ?? [];
    arr.push(n);
    byGroup.set(n.group, arr);
  }
  const groups = [...byGroup.entries()]
    .map(([letter, teams]) => ({
      letter,
      teams: [...teams].sort((a, b) => b.squadValueM - a.squadValueM),
      total: teams.reduce((s, t) => s + t.squadValueM, 0),
    }))
    .sort((a, b) => a.letter.localeCompare(b.letter));

  const richestTotal = groups.reduce((max, g) => Math.max(max, g.total), 0);

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-8">
      <Link href="/worldcup" className="inline-flex items-center gap-1.5 text-[13px] text-mute hover:text-white transition mb-6">
        <ArrowLeft size={14} /> World Cup 2026
      </Link>

      <div className="mb-8">
        <div className="text-[11px] uppercase tracking-[0.18em] text-mute-soft mb-2 num">World Cup 2026</div>
        <h1 className="display text-[clamp(28px,4vw,40px)] tracking-tight">
          Group stage <span className="font-serif italic text-acc">by value</span>
        </h1>
        <p className="text-[13px] text-mute mt-2 max-w-[560px]">
          All {groups.length} groups, each ranked by combined Onside squad value. The richest group is highlighted.
        </p>
      </div>

      {groups.length === 0 ? (
        <Card className="p-12 text-center text-mute">
          Group data isn&apos;t available right now.{" "}
          <Link href="/worldcup" className="text-acc hover:underline">Back to the hub</Link>.
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {groups.map((g) => {
            const isRichest = g.total === richestTotal && richestTotal > 0;
            return (
              <Card key={g.letter} className={cn("overflow-hidden", isRichest && "border-acc/30")}>
                <div className="px-4 py-2.5 bg-ink-900 border-b border-line flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Chip tone="acc">Group {g.letter}</Chip>
                    {isRichest && <Chip tone="solid">Richest group</Chip>}
                  </div>
                  <span className="num text-[11px] text-mute">{money(g.total)}</span>
                </div>
                <div className="divide-y divide-line">
                  {g.teams.map((t, i) => (
                    <Link key={t.slug} href={`/worldcup/teams/${t.slug}`}>
                      <div className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition cursor-pointer">
                        <span className="num text-[11px] text-mute-soft w-4">{i + 1}</span>
                        <CodeTile slug={t.slug} name={t.name} />
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-medium truncate">{t.name}</div>
                          <div className="text-[11px] text-mute num">
                            {t.fifaRank ? `FIFA #${t.fifaRank}` : "Unranked"}
                          </div>
                        </div>
                        <span className="num text-[12px] text-mute">{money(t.squadValueM)}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
