import type { Metadata } from "next";
import Link from "next/link";
import { Gauge, TrendingUp, ArrowRight, Sparkles, Target } from "lucide-react";
import { Card } from "@/components/ui";

export const revalidate = 1800;

export const metadata: Metadata = {
  title: "Insights — data-driven football intelligence | Onside",
  description:
    "Reports only Onside can write — grounded in our live valuation model. The undervalued XI, the week's biggest movers, and market intelligence.",
};

const REPORTS = [
  {
    href: "/insights/undervalued-xi",
    title: "The Undervalued XI",
    dek: "Where the Onside model sees more than the market — the biggest valuation gaps, position by position.",
    icon: Gauge,
  },
  {
    href: "/insights/biggest-movers",
    title: "This Week's Biggest Movers",
    dek: "Who's rising and falling on the Onside board over the last week, and by how much.",
    icon: TrendingUp,
  },
  {
    href: "/insights/accuracy",
    title: "The Onside Accuracy Report",
    dek: "How the Confidence % performs — the share of rumours we rated highly that were confirmed.",
    icon: Target,
  },
];

export default function InsightsPage() {
  return (
    <div className="max-w-[1000px] mx-auto px-6 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={15} className="text-acc" />
          <span className="text-[11px] uppercase tracking-[0.18em] text-acc num font-semibold">Insights</span>
        </div>
        <h1 className="display text-[clamp(28px,4vw,42px)] tracking-tight leading-[1.05] max-w-[640px]">
          The numbers, <span className="font-serif italic text-acc">with a take.</span>
        </h1>
        <p className="mt-3 text-mute text-[15px] max-w-[560px] leading-relaxed">
          Reports grounded in the Onside valuation model — the kind of analysis no one else can publish, because no one
          else has the numbers. Refreshed continuously.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {REPORTS.map((r) => {
          const Icon = r.icon;
          return (
            <Link key={r.href} href={r.href}>
              <Card className="p-6 h-full hover:bg-ink-800 transition cursor-pointer group">
                <div className="w-9 h-9 rounded-lg bg-acc/12 text-acc grid place-items-center mb-4">
                  <Icon size={17} />
                </div>
                <h2 className="text-[17px] font-semibold mb-1.5 group-hover:text-acc transition">{r.title}</h2>
                <p className="text-[13px] text-mute leading-relaxed">{r.dek}</p>
                <span className="inline-flex items-center gap-1 text-[12px] text-acc mt-4 font-medium">
                  Read the report <ArrowRight size={12} />
                </span>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
