"use client";

import { Card, SectionHead, Avatar, Chip } from "@/components/ui";
import { fmtVal } from "@/lib/utils";

const MANAGERS = [
  { name: "Pep Guardiola", club: "Manchester City", clubBg: "#6CABDD", clubColor: "#1C2C5B", nationality: "🇪🇸", age: 55, since: "2016", trophies: 18, squadVal: 1520, style: "Positional play" },
  { name: "Carlo Ancelotti", club: "Real Madrid", clubBg: "#FEBE10", clubColor: "#00529F", nationality: "🇮🇹", age: 66, since: "2021", trophies: 14, squadVal: 1340, style: "Tactical flexibility" },
  { name: "Mikel Arteta", club: "Arsenal", clubBg: "#EF0107", clubColor: "#fff", nationality: "🇪🇸", age: 43, since: "2019", trophies: 4, squadVal: 1380, style: "Progressive build-up" },
  { name: "Hansi Flick", club: "Barcelona", clubBg: "#A50044", clubColor: "#EDBB00", nationality: "🇩🇪", age: 60, since: "2024", trophies: 8, squadVal: 1420, style: "High press" },
  { name: "Xabi Alonso", club: "Bayer Leverkusen", clubBg: "#E32221", clubColor: "#000", nationality: "🇪🇸", age: 44, since: "2022", trophies: 3, squadVal: 680, style: "Controlled tempo" },
  { name: "Arne Slot", club: "Liverpool", clubBg: "#C8102E", clubColor: "#fff", nationality: "🇳🇱", age: 47, since: "2024", trophies: 2, squadVal: 1180, style: "Dutch 4-3-3" },
  { name: "Simone Inzaghi", club: "Inter Milan", clubBg: "#010E80", clubColor: "#fff", nationality: "🇮🇹", age: 49, since: "2021", trophies: 5, squadVal: 780, style: "3-5-2 transitions" },
  { name: "Luis Enrique", club: "PSG", clubBg: "#004170", clubColor: "#DA291C", nationality: "🇪🇸", age: 55, since: "2023", trophies: 3, squadVal: 920, style: "Possession dominance" },
  { name: "Thiago Motta", club: "Juventus", clubBg: "#000", clubColor: "#fff", nationality: "🇮🇹", age: 42, since: "2024", trophies: 1, squadVal: 640, style: "Fluid positioning" },
  { name: "Vincent Kompany", club: "Bayern Munich", clubBg: "#DC052D", clubColor: "#fff", nationality: "🇧🇪", age: 40, since: "2024", trophies: 1, squadVal: 1080, style: "Aggressive press" },
];

export default function ManagersPage() {
  return (
    <div className="max-w-[1440px] mx-auto px-6 py-8">
      <div className="mb-8">
        <div className="text-[11px] uppercase tracking-[0.18em] text-mute-soft mb-2 num">Elite Coaches</div>
        <h1 className="display text-[clamp(28px,4vw,40px)] tracking-tight">
          <span className="font-serif italic text-acc">Managers</span>
        </h1>
        <p className="text-[13px] text-mute mt-2">The tactical minds behind Europe&apos;s biggest clubs.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {MANAGERS.map((m) => (
          <Card key={m.name} className="p-5 hover:bg-ink-800 transition cursor-pointer">
            <div className="flex items-start gap-4">
              <Avatar name={m.name} clubBg={m.clubBg} clubColor={m.clubColor} size={48} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-[15px] font-semibold">{m.name}</h3>
                  <span className="text-[16px]">{m.nationality}</span>
                </div>
                <div className="text-[12px] text-mute mt-0.5">{m.club} &middot; Since {m.since}</div>
                <div className="flex items-center gap-3 mt-3">
                  <div>
                    <div className="text-[10px] text-mute-soft uppercase">Trophies</div>
                    <div className="num text-[14px] font-semibold">{m.trophies}</div>
                  </div>
                  <div className="w-px h-6 bg-line" />
                  <div>
                    <div className="text-[10px] text-mute-soft uppercase">Squad val</div>
                    <div className="num text-[14px] font-semibold">{fmtVal(m.squadVal)}</div>
                  </div>
                  <div className="w-px h-6 bg-line" />
                  <div>
                    <div className="text-[10px] text-mute-soft uppercase">Style</div>
                    <div className="text-[12px] text-mute">{m.style}</div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
