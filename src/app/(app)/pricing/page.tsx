"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Sparkles, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui";

/**
 * Three tiers — Free / Plus $4 / Pro $20 — matching the homepage teaser.
 *
 * Features not yet built are marked "Coming" rather than listed as included.
 * Charging for a capability that does not exist is the same failure as inventing
 * a testimonial, and this product's whole pitch is that its numbers are honest.
 * See the audit note in the accompanying report for what is still outstanding.
 */

type Status = "live" | "coming";
interface Feature {
  label: string;
  status: Status;
}

const FREE: Feature[] = [
  { label: "Full search and player profiles", status: "live" },
  { label: "Live model valuations", status: "live" },
  { label: "The Wire — every rumour, rated", status: "live" },
  { label: "Player comparisons", status: "live" },
  { label: "Make calls and build a public record", status: "live" },
  { label: "Community forum", status: "coming" },
];

const PLUS: Feature[] = [
  { label: "Everything in Free", status: "live" },
  { label: "Unlimited watchlists and tracked deals", status: "live" },
  { label: "Ad-free, always", status: "live" },
  { label: "Historical valuation graphs", status: "coming" },
  { label: "Premium forum badges", status: "coming" },
];

const PRO: Feature[] = [
  { label: "Everything in Plus", status: "live" },
  { label: "Ask Onside — unlimited questions", status: "live" },
  { label: "Predicted transfers", status: "coming" },
  { label: "Scout-grade data exports", status: "coming" },
  { label: "Read-only API access", status: "coming" },
];

const TIERS = [
  { name: "Free", monthly: 0, features: FREE, cta: "Start free", kind: "outline" as const },
  { name: "Plus", monthly: 4, features: PLUS, cta: "Go Plus", kind: "ghost" as const },
  { name: "Pro", monthly: 20, features: PRO, cta: "Go Pro", kind: "primary" as const, popular: true },
];

const COMPARE: { label: string; free: boolean | string; plus: boolean | string; pro: boolean | string }[] = [
  { label: "Player & club profiles", free: true, plus: true, pro: true },
  { label: "Live model valuations", free: true, plus: true, pro: true },
  { label: "The Wire + Onside Confidence", free: true, plus: true, pro: true },
  { label: "Player comparison", free: true, plus: true, pro: true },
  { label: "Calls & public record", free: true, plus: true, pro: true },
  { label: "Watchlists / tracked deals", free: "Limited", plus: "Unlimited", pro: "Unlimited" },
  { label: "Ad-free", free: false, plus: true, pro: true },
  { label: "Ask Onside", free: "Daily limit", plus: "Daily limit", pro: "Unlimited" },
  { label: "Historical valuation graphs", free: false, plus: "Coming", pro: "Coming" },
  { label: "Premium forum badges", free: false, plus: "Coming", pro: "Coming" },
  { label: "Predicted transfers", free: false, plus: false, pro: "Coming" },
  { label: "Data exports", free: false, plus: false, pro: "Coming" },
  { label: "Read-only API", free: false, plus: false, pro: "Coming" },
];

const FAQ = [
  {
    q: "What does “Coming” mean?",
    a: "It is on the roadmap and not built yet. We would rather tell you that than list it as included — the whole product rests on our numbers being honest, and that has to include what we say about ourselves.",
  },
  {
    q: "What is free, forever?",
    a: "Search, profiles, live valuations, the Wire with Onside Confidence, comparisons, and making calls on deals. We do not paywall the data — open credibility is how the whole thing earns trust.",
  },
  {
    q: "Can I switch tiers anytime?",
    a: "Yes. Upgrade instantly, cancel whenever — you keep the tier until the end of the period. No lock-in.",
  },
  {
    q: "What payment methods do you accept?",
    a: "All major cards via Stripe, plus Apple Pay and Google Pay.",
  },
  {
    q: "Do you offer refunds?",
    a: "Full refund within 14 days of any paid subscription, no questions asked.",
  },
];

export default function PricingPage() {
  const router = useRouter();
  const [annual, setAnnual] = useState(false);

  return (
    <div className="max-w-[1100px] mx-auto px-6 py-12">
      <div className="text-center mb-10">
        <div className="text-[11px] uppercase tracking-[0.18em] text-mute-soft mb-2 num">Three tiers</div>
        <h1 className="display text-[clamp(32px,5vw,48px)] tracking-tight leading-[1.05]">
          Pick how deep you <span className="font-serif italic text-acc">want</span> to go.
        </h1>
        <p className="mt-4 text-mute text-[16px] max-w-[540px] mx-auto">
          The data layer stays free forever. Paid tiers buy depth, history and unlimited answers.
        </p>

        <div className="mt-6 inline-flex items-center gap-3 p-1 rounded-xl bg-ink-800 border border-line">
          <button
            onClick={() => setAnnual(false)}
            className={cn(
              "px-4 py-2 rounded-lg text-[13px] font-medium transition cursor-pointer",
              !annual ? "bg-ink-700 text-fg" : "text-mute hover:text-fg",
            )}
          >
            Monthly
          </button>
          <button
            onClick={() => setAnnual(true)}
            className={cn(
              "px-4 py-2 rounded-lg text-[13px] font-medium transition cursor-pointer flex items-center gap-2",
              annual ? "bg-ink-700 text-fg" : "text-mute hover:text-fg",
            )}
          >
            Annual
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-up/15 text-up font-semibold">-25%</span>
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-3 mb-16">
        {TIERS.map((t) => {
          const price = annual ? Math.round(t.monthly * 0.75 * 100) / 100 : t.monthly;
          return (
            <div
              key={t.name}
              className={cn(
                "rounded-2xl p-7 border relative bg-ink-850",
                t.popular ? "border-acc/40" : "border-line",
              )}
            >
              {t.popular && (
                <div className="absolute -top-2.5 left-7 px-2.5 py-0.5 rounded-full bg-acc text-ink-900 text-[10px] font-bold tracking-wide">
                  MOST POPULAR
                </div>
              )}
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full font-semibold tracking-tight px-2 py-0.5 text-[10px]",
                  t.name === "Pro"
                    ? "bg-acc text-ink-900"
                    : t.name === "Plus"
                      ? "bg-overlay/8 text-fg border border-overlay/10"
                      : "bg-ink-700 text-mute",
                )}
              >
                {t.name === "Pro" && <Sparkles size={10} />} ONSIDE {t.name}
              </span>

              <div className="mt-5 flex items-baseline gap-1">
                <span className="display text-[52px] num">${price}</span>
                <span className="text-mute text-[13px]">{t.monthly === 0 ? "forever free" : "/ month"}</span>
              </div>
              {t.monthly > 0 && (
                <div className="mt-1 text-[11px] text-mute num">
                  {annual ? `billed annually — $${Math.round(t.monthly * 0.75 * 12)}/yr` : `or $${Math.round(t.monthly * 0.75 * 12)}/yr annually`}
                </div>
              )}
              {t.monthly === 0 && <div className="mt-1 text-[11px] text-mute num">No card required</div>}

              <div className="my-6 space-y-2.5">
                {t.features.map((f) => (
                  <div key={f.label} className="flex items-start gap-2 text-[13px]">
                    {f.status === "live" ? (
                      <Check size={13} className="text-acc shrink-0 mt-0.5" />
                    ) : (
                      <Clock size={13} className="text-mute-soft shrink-0 mt-0.5" />
                    )}
                    <span className={f.status === "live" ? "text-fg/90" : "text-mute-soft"}>
                      {f.label}
                      {f.status === "coming" && <span className="ml-1.5 text-[10px] uppercase tracking-wide">Coming</span>}
                    </span>
                  </div>
                ))}
              </div>

              <Button kind={t.kind} className="w-full" onClick={() => router.push("/login")}>
                {t.cta}
              </Button>
            </div>
          );
        })}
      </div>

      <div className="mb-20">
        <h2 className="display text-[28px] tracking-tight text-center mb-8">Compare tiers</h2>
        <div className="rounded-2xl bg-ink-850 border border-line overflow-hidden">
          <div className="grid grid-cols-[1.6fr_1fr_1fr_1fr] px-5 py-3 text-[11px] uppercase tracking-wider text-mute-soft num border-b border-line bg-ink-900">
            <span>Feature</span>
            <span className="text-center">Free</span>
            <span className="text-center">Plus</span>
            <span className="text-center">Pro</span>
          </div>
          {COMPARE.map((f) => (
            <div
              key={f.label}
              className="grid grid-cols-[1.6fr_1fr_1fr_1fr] px-5 py-3 items-center border-b border-line last:border-0 text-[13px]"
            >
              <span>{f.label}</span>
              <Cell value={f.free} />
              <Cell value={f.plus} />
              <Cell value={f.pro} />
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-[700px] mx-auto mb-16">
        <h2 className="display text-[28px] tracking-tight text-center mb-8">FAQ</h2>
        <div className="space-y-2">
          {FAQ.map((item) => (
            <details key={item.q} className="rounded-xl bg-ink-850 border border-line group">
              <summary className="px-5 py-4 text-[14px] font-medium cursor-pointer flex items-center justify-between">
                {item.q}
                <span className="text-mute group-open:rotate-45 transition-transform">+</span>
              </summary>
              <div className="px-5 pb-4 text-[13px] text-mute leading-relaxed">{item.a}</div>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}

function Cell({ value }: { value: boolean | string }) {
  if (value === true) {
    return (
      <div className="text-center">
        <Check size={16} className="text-up mx-auto" />
      </div>
    );
  }
  if (value === false) {
    return (
      <div className="text-center">
        <X size={14} className="text-mute-soft mx-auto" />
      </div>
    );
  }
  return (
    <div className={cn("text-center text-[12px] num", value === "Coming" ? "text-mute-soft" : "text-mute")}>{value}</div>
  );
}
