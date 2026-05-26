"use client";

import { useState } from "react";
import { Check, X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui";

const TIERS = [
  {
    name: "Free" as const,
    price: { monthly: 0, annual: 0 },
    tag: "Forever free",
    cta: "Start free",
    kind: "outline" as const,
    features: [
      "Full player & club search",
      "Dynamic valuations (current)",
      "Basic player profiles",
      "Community forum (read)",
      "Compare (2 players)",
    ],
  },
  {
    name: "Plus" as const,
    price: { monthly: 4, annual: 3 },
    tag: "/ month",
    cta: "Go Plus",
    kind: "ghost" as const,
    features: [
      "Everything in Free",
      "Historical valuation graphs",
      "Unlimited watchlists",
      "Price alerts & notifications",
      "Ad-free experience",
      "Premium forum badges",
      "Compare (4 players)",
      "Club squad analytics",
    ],
  },
  {
    name: "Pro" as const,
    price: { monthly: 20, annual: 15 },
    tag: "/ month",
    cta: "Go Pro",
    kind: "primary" as const,
    popular: true,
    features: [
      "Everything in Plus",
      "AI Coach (unlimited)",
      "Predicted transfers",
      "Scout-grade data exports",
      "Contract expiry tracker",
      "Value predictions (ML)",
      "Read-only API access",
      "Priority support",
    ],
  },
];

const COMPARE_FEATURES = [
  { label: "Player profiles", free: true, plus: true, pro: true },
  { label: "Live valuations", free: true, plus: true, pro: true },
  { label: "Community forum", free: "Read", plus: true, pro: true },
  { label: "Player comparison", free: "2 players", plus: "4 players", pro: "Unlimited" },
  { label: "Historical graphs", free: false, plus: true, pro: true },
  { label: "Watchlists", free: "1 list, 5 players", plus: "Unlimited", pro: "Unlimited" },
  { label: "Price alerts", free: false, plus: true, pro: true },
  { label: "Club analytics", free: false, plus: true, pro: true },
  { label: "AI Coach", free: false, plus: false, pro: true },
  { label: "Predicted transfers", free: false, plus: false, pro: true },
  { label: "Value predictions", free: false, plus: false, pro: true },
  { label: "Data exports", free: false, plus: false, pro: true },
  { label: "API access", free: false, plus: false, pro: true },
];

const FAQ = [
  {
    q: "Can I switch tiers anytime?",
    a: "Yes. Upgrade instantly, downgrade at end of billing period. No lock-in.",
  },
  {
    q: "Is there a student discount?",
    a: "Yes. Email us from a .edu address and we'll set you up with 50% off Pro.",
  },
  {
    q: "What payment methods do you accept?",
    a: "All major credit cards via Stripe. We also support Apple Pay and Google Pay.",
  },
  {
    q: "Do you offer refunds?",
    a: "Full refund within 14 days of any paid subscription, no questions asked.",
  },
  {
    q: "How does the AI Coach work?",
    a: "It's a conversational interface powered by the same data layer pro clubs use. Ask any question about players, transfers, or tactics in plain English.",
  },
];

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-12">
      <div className="text-center mb-10">
        <div className="text-[11px] uppercase tracking-[0.18em] text-mute-soft mb-2 num">
          Pricing
        </div>
        <h1 className="display text-[48px] tracking-tight leading-[1.05]">
          Same engine. <span className="font-serif italic text-acc">Your</span> price.
        </h1>
        <p className="mt-4 text-mute text-[16px] max-w-[500px] mx-auto">
          The valuation engine 23 pro clubs pay six figures for. Pick how deep you want to go.
        </p>

        <div className="mt-6 inline-flex items-center gap-3 p-1 rounded-xl bg-ink-800 border border-line">
          <button
            onClick={() => setAnnual(false)}
            className={cn(
              "px-4 py-2 rounded-lg text-[13px] font-medium transition",
              !annual ? "bg-ink-700 text-white" : "text-mute hover:text-white"
            )}
          >
            Monthly
          </button>
          <button
            onClick={() => setAnnual(true)}
            className={cn(
              "px-4 py-2 rounded-lg text-[13px] font-medium transition flex items-center gap-2",
              annual ? "bg-ink-700 text-white" : "text-mute hover:text-white"
            )}
          >
            Annual
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-up/15 text-up font-semibold">
              -25%
            </span>
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-3 mb-20">
        {TIERS.map((tier) => {
          const price = annual ? tier.price.annual : tier.price.monthly;
          return (
            <div
              key={tier.name}
              className={cn(
                "rounded-2xl p-7 border relative",
                tier.popular ? "bg-ink-850 border-acc/40" : "bg-ink-850 border-line"
              )}
            >
              {tier.popular && (
                <div className="absolute -top-2.5 left-7 px-2.5 py-0.5 rounded-full bg-acc text-ink-900 text-[10px] font-bold tracking-wide">
                  MOST POPULAR
                </div>
              )}
              <div className="mb-5">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full font-semibold tracking-tight px-2 py-0.5 text-[10px]",
                    tier.name === "Pro"
                      ? "bg-acc text-ink-900"
                      : tier.name === "Plus"
                        ? "bg-white/8 text-white border border-white/10"
                        : "bg-ink-700 text-mute"
                  )}
                >
                  {tier.name === "Pro" && <Sparkles size={10} />}
                  ONSIDE {tier.name}
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="display text-[52px] num">${price}</span>
                <span className="text-mute text-[13px]">{price > 0 ? tier.tag : tier.tag}</span>
              </div>
              {annual && price > 0 && (
                <div className="mt-1 text-[11px] text-mute num">
                  ${price * 12}/year (billed annually)
                </div>
              )}
              <div className="my-6 space-y-2.5">
                {tier.features.map((f) => (
                  <div key={f} className="flex items-center gap-2 text-[13px] text-mute">
                    <Check size={13} className="text-acc shrink-0" />
                    <span className="text-white/90">{f}</span>
                  </div>
                ))}
              </div>
              <Button kind={tier.kind} className="w-full">
                {tier.cta}
              </Button>
            </div>
          );
        })}
      </div>

      <div className="mb-20">
        <h2 className="display text-[28px] tracking-tight text-center mb-8">Feature comparison</h2>
        <div className="rounded-2xl bg-ink-850 border border-line overflow-hidden">
          <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr] px-5 py-3 text-[11px] uppercase tracking-wider text-mute-soft num border-b border-line bg-ink-900">
            <span>Feature</span>
            <span className="text-center">Free</span>
            <span className="text-center">Plus</span>
            <span className="text-center">Pro</span>
          </div>
          {COMPARE_FEATURES.map((f) => (
            <div
              key={f.label}
              className="grid grid-cols-[1.5fr_1fr_1fr_1fr] px-5 py-3 items-center border-b border-line last:border-0 text-[13px]"
            >
              <span>{f.label}</span>
              <FeatureCell value={f.free} />
              <FeatureCell value={f.plus} />
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
        <X size={14} className="text-mute-faint mx-auto" />
      </div>
    );
  }
  return <div className="text-center text-[12px] text-mute num">{value}</div>;
}
