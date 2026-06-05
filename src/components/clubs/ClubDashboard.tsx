import Link from "next/link";
import { TrendingUp, TrendingDown, Users, Crown, CalendarClock, Layers } from "lucide-react";
import { Card, Avatar, Delta, SectionHead } from "@/components/ui";
import { Sparkline } from "@/components/ui/sparkline";
import { RumourCard } from "@/components/transfers/rumour-card";
import type { PlayerListItem } from "@/lib/queries/map";
import type { RumourItem } from "@/lib/queries/rumours";

const money = (m: number) => (m >= 1000 ? `€${(m / 1000).toFixed(2)}B` : `€${Math.round(m)}M`);

const POS = ["GK", "DEF", "MID", "FWD"] as const;
const FORM: Record<string, number> = { GK: 1, DEF: 4, MID: 3, FWD: 3 };

function Stat({ icon, label, value, sub, href }: { icon: React.ReactNode; label: string; value: string; sub?: string; href?: string }) {
  const body = (
    <Card className="p-4 h-full">
      <div className="flex items-center gap-1.5 text-mute-soft mb-2">
        {icon}
        <span className="text-[10px] uppercase tracking-[0.14em] num">{label}</span>
      </div>
      <div className="text-[15px] font-semibold truncate">{value}</div>
      {sub && <div className="num text-[12px] text-up mt-0.5">{sub}</div>}
    </Card>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

function MoverRow({ p }: { p: PlayerListItem }) {
  return (
    <Link href={`/players/${p.slug}`}>
      <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.03] transition border-b border-line last:border-0 cursor-pointer">
        <Avatar name={p.displayName} clubBg={p.clubBg} clubColor={p.clubColor} src={p.photoUrl} size={26} />
        <span className="text-[13px] font-medium truncate flex-1">{p.displayName}</span>
        <Sparkline points={p.spark} width={40} />
        <div className="text-right shrink-0 w-[72px]">
          <div className="num text-[12px] font-semibold">€{p.val.toFixed(1)}M</div>
          <Delta value={p.dWeek} />
        </div>
      </div>
    </Link>
  );
}

export function ClubDashboard({ squad, rumours }: { squad: PlayerListItem[]; rumours: RumourItem[] }) {
  const top = squad[0]; // squad is sorted by value desc
  const ages = squad.map((p) => p.age).filter((a) => a > 0);
  const avgAge = ages.length ? Math.round(ages.reduce((s, a) => s + a, 0) / ages.length) : null;
  const risers = squad.filter((p) => p.dWeek > 0).sort((a, b) => b.dWeek - a.dWeek).slice(0, 4);
  const fallers = squad.filter((p) => p.dWeek < 0).sort((a, b) => a.dWeek - b.dWeek).slice(0, 4);
  const bestXI = POS.map((pos) => ({
    pos,
    players: squad.filter((p) => p.pos === pos).sort((a, b) => b.val - a.val).slice(0, FORM[pos]),
  }));
  const xiValue = bestXI.flatMap((g) => g.players).reduce((s, p) => s + p.val, 0);

  return (
    <div className="space-y-8 mb-10">
      {/* Key stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat icon={<Users size={13} />} label="Squad size" value={String(squad.length)} />
        <Stat
          icon={<Crown size={13} />}
          label="Most valuable"
          value={top ? top.displayName.split(" ").slice(-1)[0] : "—"}
          sub={top ? money(top.val) : undefined}
          href={top ? `/players/${top.slug}` : undefined}
        />
        <Stat icon={<CalendarClock size={13} />} label="Avg age" value={avgAge ? String(avgAge) : "—"} />
        <Stat icon={<Layers size={13} />} label="Best XI value" value={money(xiValue)} />
      </div>

      {/* Risers / fallers */}
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <SectionHead eyebrow="Last 7 days" title="Biggest risers" action={<TrendingUp size={15} className="text-up" />} />
          <Card className="overflow-hidden">
            {risers.length === 0 ? (
              <div className="p-6 text-center text-mute text-[13px]">No risers this week.</div>
            ) : (
              risers.map((p) => <MoverRow key={p.id} p={p} />)
            )}
          </Card>
        </div>
        <div>
          <SectionHead eyebrow="Last 7 days" title="Biggest fallers" action={<TrendingDown size={15} className="text-down" />} />
          <Card className="overflow-hidden">
            {fallers.length === 0 ? (
              <div className="p-6 text-center text-mute text-[13px]">No fallers this week.</div>
            ) : (
              fallers.map((p) => <MoverRow key={p.id} p={p} />)
            )}
          </Card>
        </div>
      </div>

      {/* Best XI by value */}
      <div>
        <SectionHead eyebrow="By value" title="Best XI" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {bestXI.map((g) => (
            <div key={g.pos}>
              <div className="text-[10px] uppercase tracking-[0.16em] text-mute-soft num mb-2">{g.pos}</div>
              <div className="space-y-2">
                {g.players.map((p) => (
                  <Link key={p.id} href={`/players/${p.slug}`}>
                    <Card className="p-3 hover:bg-ink-800 transition cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Avatar name={p.displayName} clubBg={p.clubBg} clubColor={p.clubColor} src={p.photoUrl} size={26} />
                        <div className="min-w-0">
                          <div className="text-[12px] font-medium truncate leading-tight">{p.displayName}</div>
                          <div className="num text-[12px] font-semibold text-up">€{p.val.toFixed(1)}M</div>
                        </div>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Club rumours (populates from the curated feed) */}
      {rumours.length > 0 && (
        <div>
          <SectionHead eyebrow="Transfer room" title="Club rumours" />
          <div className="grid md:grid-cols-2 gap-3">
            {rumours.map((r) => (
              <RumourCard key={r.id} r={r} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
