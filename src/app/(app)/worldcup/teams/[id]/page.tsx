"use client";

import { use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trophy, Star, TrendingUp, Users } from "lucide-react";
import { Card, SectionHead, Avatar, ClubBadge, Chip } from "@/components/ui";
import { fmtVal } from "@/lib/utils";
import {
  getNationalTeam,
  getTeamInfo,
  teamSquadValue,
  teamAvgAge,
  groupSquad,
  type WorldCupTeamInfo,
} from "@/data/national-teams";

export default function NationalTeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const team = getNationalTeam(id);

  if (!team) {
    const info = getTeamInfo(id);
    if (!info) notFound();
    return <TeamComingSoon info={info} />;
  }

  const squadVal = teamSquadValue(team);
  const avgAge = teamAvgAge(team);
  const groups = groupSquad(team);

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-8">
      <Link href="/worldcup" className="inline-flex items-center gap-1.5 text-[13px] text-mute hover:text-white transition mb-6">
        <ArrowLeft size={14} /> World Cup 2026
      </Link>

      <div className="flex items-center gap-5 mb-8">
        <span className="text-[64px]">{team.flag}</span>
        <div>
          <h1 className="display text-[clamp(28px,4vw,40px)] tracking-tight">{team.name}</h1>
          <div className="flex items-center gap-3 mt-1 text-[13px] text-mute">
            {team.group && <Chip tone="acc">Group {team.group}</Chip>}
            {team.stage && <Chip tone="up">{team.stage}</Chip>}
            <span>FIFA #{team.fifaRanking}</span>
            <span className="w-1 h-1 rounded-full bg-line" />
            <span>{team.confederation}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
        {[
          { label: "Squad value", value: fmtVal(squadVal) },
          { label: "Avg age", value: avgAge.toFixed(1) },
          { label: "Manager", value: team.manager },
          { label: "WC titles", value: team.wcTitles.toString() },
          { label: "Win odds", value: team.odds ?? "—" },
        ].map((m) => (
          <Card key={m.label} className="p-4">
            <div className="text-[10px] text-mute-soft uppercase tracking-wider">{m.label}</div>
            <div className="text-[16px] font-semibold mt-1 truncate">{m.value}</div>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-[1fr_340px] gap-6">
        <div className="space-y-6">
          {/* Squad */}
          <Card className="overflow-hidden">
            <div className="px-5 py-3 border-b border-line">
              <SectionHead eyebrow={`${team.squad.length}-man roster`} title="Squad" />
            </div>
            {groups.map((g) => (
              <div key={g.key}>
                <div className="grid grid-cols-[1fr_56px_92px] px-4 py-2.5 text-[10px] uppercase tracking-wider text-mute-soft num border-b border-line bg-ink-900">
                  <span>{g.label}</span>
                  <span className="text-right">Age</span>
                  <span className="text-right">Value</span>
                </div>
                {g.players.map((p) => (
                  <div
                    key={`${p.name}-${p.shirt ?? ""}`}
                    className="grid grid-cols-[1fr_56px_92px] px-4 py-3 items-center border-b border-line last:border-0"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar name={p.name} clubBg={p.clubBg} clubColor={p.clubColor} size={32} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[13px] font-medium truncate">{p.name}</span>
                          {p.shirt != null && (
                            <span className="num text-[11px] text-mute-soft">#{p.shirt}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 min-w-0">
                          <ClubBadge clubShort={p.clubShort} clubBg={p.clubBg} clubColor={p.clubColor} size={14} />
                          <span className="text-[11px] text-mute truncate">{p.club}</span>
                        </div>
                      </div>
                    </div>
                    <span className="num text-[13px] text-mute text-right">{p.age ?? "–"}</span>
                    <span className="num text-[13px] text-right font-semibold">{fmtVal(p.val)}</span>
                  </div>
                ))}
              </div>
            ))}
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {team.note && (
            <Card className="p-5">
              <h3 className="text-[13px] font-semibold flex items-center gap-1.5 mb-2">
                <TrendingUp size={13} className="text-acc" /> Valuation
              </h3>
              <p className="text-[12px] text-mute leading-relaxed">{team.note}</p>
            </Card>
          )}

          {team.fixtures && team.fixtures.length > 0 && (
            <Card className="p-5">
              <h3 className="text-[13px] font-semibold flex items-center gap-1.5 mb-3">
                <Trophy size={13} /> {team.group ? `Group ${team.group} fixtures` : "Fixtures"}
              </h3>
              <div className="space-y-3">
                {team.fixtures.map((m) => (
                  <div key={m.vs} className="flex items-center justify-between py-2 border-b border-line last:border-0">
                    <div>
                      <div className="text-[13px] font-medium">vs {m.vs}</div>
                      <div className="text-[11px] text-mute">{m.venue}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[12px] num">{m.result ?? m.date}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {team.keyStats && team.keyStats.length > 0 && (
            <Card className="p-5">
              <h3 className="text-[13px] font-semibold flex items-center gap-1.5 mb-3">
                <Star size={13} /> Key stats
              </h3>
              <div className="space-y-2 text-[12px]">
                {team.keyStats.map((s) => (
                  <div key={s.label} className="flex items-center justify-between">
                    <span className="text-mute">{s.label}</span>
                    <span className="num font-semibold">{s.val}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function TeamComingSoon({ info }: { info: WorldCupTeamInfo }) {
  return (
    <div className="max-w-[1440px] mx-auto px-6 py-8">
      <Link href="/worldcup" className="inline-flex items-center gap-1.5 text-[13px] text-mute hover:text-white transition mb-6">
        <ArrowLeft size={14} /> World Cup 2026
      </Link>

      <div className="flex items-center gap-5 mb-8">
        <span className="text-[64px]">{info.flag}</span>
        <div>
          <h1 className="display text-[clamp(28px,4vw,40px)] tracking-tight">{info.name}</h1>
          <div className="flex items-center gap-3 mt-1 text-[13px] text-mute">
            <Chip tone="acc">Group {info.group}</Chip>
            <span>FIFA #{info.fifaRanking}</span>
          </div>
        </div>
      </div>

      <Card className="p-10 text-center">
        <Users size={22} className="mx-auto text-mute-soft mb-3" />
        <div className="text-[15px] font-semibold">Full squad profile coming soon</div>
        <p className="text-[13px] text-mute mt-2 max-w-[420px] mx-auto leading-relaxed">
          We&apos;re still valuing {info.name}&apos;s 26-man roster. Check back closer to kickoff for the
          complete squad and ONSIDE valuations.
        </p>
        <Link href="/worldcup/groups" className="inline-flex items-center gap-1.5 text-[13px] text-acc hover:underline mt-5">
          Browse all groups <ArrowLeft size={13} className="rotate-180" />
        </Link>
      </Card>
    </div>
  );
}
