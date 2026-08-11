"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, Chip } from "@/components/ui";
import { WORLD_CUP_GROUPS } from "@/data/national-teams";

export default function WorldCupGroupsPage() {
  return (
    <div className="max-w-[1440px] mx-auto px-6 py-8">
      <Link href="/worldcup" className="inline-flex items-center gap-1.5 text-[13px] text-mute hover:text-white transition mb-6">
        <ArrowLeft size={14} /> World Cup 2026
      </Link>

      <div className="mb-8">
        <div className="text-[11px] uppercase tracking-[0.18em] text-mute-soft mb-2 num">FIFA World Cup 2026</div>
        <h1 className="display text-[clamp(28px,4vw,40px)] tracking-tight">
          Group stage <span className="font-serif italic text-acc">draw</span>
        </h1>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {WORLD_CUP_GROUPS.map((g) => (
          <Card key={g.letter} className="overflow-hidden">
            <div className="px-4 py-2.5 bg-ink-900 border-b border-line flex items-center gap-2">
              <Chip tone="acc">Group {g.letter}</Chip>
            </div>
            <div className="divide-y divide-line">
              {g.teams.map((t, i) => (
                <Link key={t.code} href={`/worldcup/teams/${t.code}`}>
                  <div className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition cursor-pointer">
                    <span className="num text-[11px] text-mute-soft w-4">{i + 1}</span>
                    <span className="text-[20px]">{t.flag}</span>
                    <div className="flex-1">
                      <div className="text-[13px] font-medium">{t.name}</div>
                      <div className="text-[11px] text-mute">FIFA #{t.fifaRanking}</div>
                    </div>
                    <span className="num text-[12px] text-mute">0 pts</span>
                  </div>
                </Link>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
