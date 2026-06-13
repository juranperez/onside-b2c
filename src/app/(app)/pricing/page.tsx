"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui";

/**
 * Monetization v1 (see docs/monetization-v1.md): two tiers only — Free + Pro.
 * Credibility (Wire, valuations, tables, compare, match centres) is free forever;
 * Pro is personalization (your deals/players/questions, first). Payments open at
 * the Jun-27 soft launch with a founding price; until then the CTAs drive account
 * creation so the founding cohort can be locked in.
 */

const PRO_MONTHLY = 5.99;
const PRO_ANNUAL = 49; // total per year (≈ $4.08/mo)
const FOUNDING_ANNUAL = 39; // first 500 members, locked for life

const FREE_FEATURES = [
  "The Wire + Onside Confidence scores",
  "Every player & club valuation",
  "League tables + live match centres",
  "Compare players (shareable)",
  "Ask Onside — 10 questions/day",
  "My Market — 3 tracked deals + 10 watchlist",
  "The Board — weekly edition",
];

const PRO_FEATURES = [
  "Everything in Free",
  "Ask Onside — unlimited",
  "My Market — unlimited deals + instant alerts",
  "The Board — deadline-day + window briefs",
  "Early access — new features 2 weeks first",
  "Pro badge on discussions",
];

const COMPARE_FEATURES: { label: string; free: boolean | string; pro: boolean | string }[] = [
  { label: "The Wire + Confidence scores", free: true, pro: true },
  { label: "Player & club valuations", free: true, pro: true },
  { label: "League tables + match centres", free: true, pro: true },
  { label: "Compare players", free: true, pro: true },
  { label: "Ask Onside", free: "10 / day", pro: "Unlimited" },
  { label: "My Market tracked deals", free: "3", pro: "Unlimited" },
  { label: "Watchlist players", free: "10", pro: "Unlimited" },
  { label: "Deal alerts", free: "On 3 deals", pro: "Every deal, instant" },
  { label: "The Board", free: "Weekly", pro: "Deadline-day + briefs" },
  { label: "Early access to new features", free: false, pro: true },
  { label: "Pro badge", free: false, pro: true },
];

const FAQ = [
  {
    q: "What's free, forever?",
    a: "The Wire, Onside Confidence scores, every valuation, league tables, match centres, and compare. We never paywall the data — open credibility is how the whole thing earns trust.",
  },
  {
    q: "When does Pro launch?",
    a: "Pro opens during the 2026 World Cup window. The first 500 founding members lock $39/year for life — create a free account now to claim the founding price at launch.",
  },
  {
    q: "Can I switch tiers anytime?",
    a: "Yes. Upgrade instantly, cancel whenever — you keep Pro until the end of the period. No lock-in.",
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
  const [annual, setAnnual] = useState(true);
  const proPrice = annual ? PRO_ANNUAL : PRO_MONTHLY;
  const proUnit = annual ? "/ year" : "/ month";

  return (
    <div className="max-w-[1100px] mx-auto px-6 py-12">
      <div className="text-center mb-10">
        <div className="text-[11px] uppercase tracking-[0.18em] text-mute-soft mb-2 num">Pricing</div>
        <h1 className="display text-[48px] tracking-tight leading-[1.05]">
          Credibility is free. <span className="font-serif italic text-acc">You</span> are Pro.
        </h1>
        <p className="mt-4 text-mute text-[16px] max-w-[540px] mx-auto">
          The Wire, valuations, tables and match centres stay free — forever. Pro is Onside knowing
          you: your deals, your players, your questions, first.
        </p>

        <div className="mt-6 inline-flex items-center gap-3 p-1 rounded-xl bg-ink-800 border border-line">
          <button
            onClick={() => setAnnual(false)}
            className={cn(
              "px-4 py-2 rounded-lg text-[13px] font-medium transition",
              !annual ? "bg-ink-700 text-fg" : "text-mute hover:text-fg",
            )}
          >
            Monthly
          </button>
          <button
            onClick={() => setAnnual(true)}
            className={cn(
              "px-4 py-2 rounded-lg text-[13px] font-medium transition flex items-center gap-2",
              annual ? "bg-ink-700 text-fg" : "text-mute hover:text-fg",
            )}
          >
            Annual
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-up/15 text-up font-semibold">
              Save 32%
            </span>
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3 mb-16 max-w-[760px] mx-auto">
        {/* Free */}
        <div className="rounded-2xl p-7 border bg-ink-850 border-line">
          <span className="inline-flex items-center gap-1 rounded-full font-semibold tracking-tight px-2 py-0.5 text-[10px] bg-ink-700 text-mute">
            ONSIDE FREE
          </span>
          <div className="mt-5 flex items-baseline gap-1">
            <span className="display text-[52px] num">$0</span>
            <span className="text-mute text-[13px]">forever</span>
          </div>
          <div className="mt-1 text-[11px] text-mute num">No card required</div>
          <div className="my-6 space-y-2.5">
            {FREE_FEATURES.map((f) => (
              <div key={f} className="flex items-center gap-2 text-[13px]">
                <Check size={13} className="text-acc shrink-0" />
                <span className="text-fg/90">{f}</span>
              </div>
            ))}
          </div>
          <Button kind="outline" className="w-full" onClick={() => router.push("/login")}>
            Start free
          </Button>
        </div>

        {/* Pro */}
        <div className="rounded-2xl p-7 border relative bg-ink-850 border-acc/40">
          <div className="absolute -top-2.5 left-7 px-2.5 py-0.5 rounded-full bg-acc text-ink-900 text-[10px] font-bold tracking-wide">
            FOUNDING — JUN 27
          </div>
          <span className="inline-flex items-center gap-1 rounded-full font-semibold tracking-tight px-2 py-0.5 text-[10px] bg-acc text-ink-900">
            <Sparkles size={10} /> ONSIDE PRO
          </span>
          <div className="mt-5 flex items-baseline gap-1">
            <span className="display text-[52px] num">${proPrice}</span>
            <span className="text-mute text-[13px]">{proUnit}</span>
          </div>
          <div className="mt-1 text-[11px] text-mute num">
            {annual ? "≈ $4.08/mo, billed annually" : "or $49/year"}
          </div>
          <div className="my-6 space-y-2.5">
            {PRO_FEATURES.map((f) => (
              <div key={f} className="flex items-center gap-2 text-[13px]">
                <Check size={13} className="text-acc shrink-0" />
                <span className="text-fg/90">{f}</span>
              </div>
            ))}
          </div>
          <Button kind="primary" className="w-full" onClick={() => router.push("/login")}>
            Get founding access
          </Button>
          <p className="mt-2.5 text-[11px] text-mute-soft text-center leading-relaxed">
            Free to start. First 500 lock{" "}
            <span className="num text-fg">${FOUNDING_ANNUAL}/yr</span> for life when Pro opens Jun 27.
          </p>
        </div>
      </div>

      <div className="mb-20">
        <h2 className="display text-[28px] tracking-tight text-center mb-8">What you get</h2>
        <div className="rounded-2xl bg-ink-850 border border-line overflow-hidden max-w-[760px] mx-auto">
          <div className="grid grid-cols-[1.6fr_1fr_1fr] px-5 py-3 text-[11px] uppercase tracking-wider text-mute-soft num border-b border-line bg-ink-900">
            <span>Feature</span>
            <span className="text-center">Free</span>
            <span className="text-center">Pro</span>
          </div>
          {COMPARE_FEATURES.map((f) => (
            <div
              key={f.label}
              className="grid grid-cols-[1.6fr_1fr_1fr] px-5 py-3 items-center border-b border-line last:border-0 text-[13px]"
            >
              <span>{f.label}</span>
              <FeatureCell value={f.free} />
              <FeatureCell value={f.pro} />
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

function FeatureCell({ value }: { value: boolean | string }) {
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
  return <div className="text-center text-[12px] text-mute num">{value}</div>;
}
