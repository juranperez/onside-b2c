import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui";
import { REPORTS } from "@/lib/reports";

/** Editorial reports, folded in from the old /insights index (2026-06 nav refactor). */
export function ReportsRail() {
  return (
    <section className="mt-10" aria-labelledby="reports-rail-heading">
      <h2 id="reports-rail-heading" className="text-[10px] uppercase tracking-[0.18em] text-mute-soft num mb-3">
        Reports — the numbers, with a take
      </h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {REPORTS.map((r) => {
          const Icon = r.icon;
          return (
            <Link key={r.href} href={r.href} className="group">
              <Card className="h-full p-4 hover:border-mute transition">
                <Icon size={16} className="text-acc mb-3" />
                <div className="text-[14px] font-semibold mb-1 group-hover:text-acc transition">{r.title}</div>
                <p className="text-[12px] text-mute leading-relaxed">{r.dek}</p>
                <div className="mt-3 inline-flex items-center gap-1 text-[11px] text-mute-soft">
                  Read <ArrowRight size={11} />
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
