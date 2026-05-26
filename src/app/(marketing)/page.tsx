import Link from "next/link";
import { ArrowRight, Check, Sparkles, TrendingUp, MessageCircle, Shield } from "lucide-react";
import { Button } from "@/components/ui";
import { LiveDot } from "@/components/ui";

export default function LandingPage() {
  return (
    <div className="relative">
      <HeroSection />
      <TickerStrip />
      <ValueProps />
      <MoversPreview />
      <SocialProof />
      <PricingTeaser />
    </div>
  );
}

function HeroSection() {
  return (
    <section className="relative overflow-hidden border-b border-line">
      <div className="absolute inset-0 grid-bg opacity-60 pointer-events-none" />
      <div
        className="absolute -top-40 -right-20 w-[700px] h-[700px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(0,229,153,0.13) 0%, transparent 60%)" }}
      />
      <div
        className="absolute -bottom-32 -left-20 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(232,255,90,0.07) 0%, transparent 60%)" }}
      />

      <div className="max-w-[1440px] mx-auto px-6 pt-16 pb-12 relative">
        <div className="flex items-center gap-3 mb-12">
          <LiveDot />
          <div className="flex items-center gap-2 text-[11.5px] text-mute">
            <span className="num">
              {new Date().toLocaleDateString("en-GB", { weekday: "short", month: "short", day: "numeric" })}
            </span>
            <span className="opacity-40">&middot;</span>
            <span>Markets are open</span>
            <span className="opacity-40">&middot;</span>
            <span>
              <span className="num text-up">+€1.2B</span> moved this week
            </span>
          </div>
        </div>

        <div className="grid lg:grid-cols-[1.2fr_1fr] gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-line bg-ink-800 text-[11px] text-mute mb-6">
              <span className="num text-acc">2,847</span> active fans on ONSIDE right now
            </div>
            <h1 className="display tracking-[-0.045em] text-[clamp(48px,6vw,78px)] leading-[0.92]">
              Every player.
              <br />
              Every valuation.
              <br />
              <span className="font-serif text-acc italic font-normal">Live.</span>
            </h1>
            <p className="mt-7 text-[18px] text-mute max-w-[520px] leading-relaxed">
              The same valuation engine that top-flight clubs pay six figures for — now
              open to the fans, the bettors, and football twitter who actually saw it first.
            </p>

            <div className="mt-9 flex items-center gap-3 flex-wrap">
              <Link href="/discover">
                <Button kind="primary" size="lg" icon={<ArrowRight size={15} />}>
                  Start free — no card
                </Button>
              </Link>
              <Link href="/players/bellingham">
                <Button kind="outline" size="lg">See a live player profile</Button>
              </Link>
            </div>

            <div className="mt-9 flex items-center gap-6 text-[11px] text-mute-soft">
              <div>
                <span className="num text-white text-[13px]">128K+</span> players tracked
              </div>
              <div className="w-px h-3 bg-line" />
              <div>
                <span className="num text-white text-[13px]">14</span> top leagues
              </div>
              <div className="w-px h-3 bg-line" />
              <div>
                <span className="num text-white text-[13px]">Used by 23</span> pro clubs
              </div>
            </div>
          </div>

          <FeaturedPlayerCard />
        </div>
      </div>
    </section>
  );
}

function FeaturedPlayerCard() {
  return (
    <div className="rounded-2xl bg-ink-850 border border-line shadow-soft overflow-hidden">
      <div
        className="relative h-[200px] overflow-hidden"
        style={{ background: "linear-gradient(135deg, #A50044 0%, #0A0A0B 90%)" }}
      >
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="absolute top-4 left-4 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium bg-up/10 text-up border border-up/20">
            <span className="w-1.5 h-1.5 rounded-full bg-up pulse-dot" />
            Featured today
          </span>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-5 flex items-end justify-between">
          <div>
            <div className="font-serif text-[44px] leading-[0.92] tracking-tight text-white">Lamine</div>
            <div className="display text-[44px] leading-[0.92] tracking-[-0.04em]">Yamal</div>
          </div>
          <div className="text-right num">
            <div className="text-[11px] text-mute uppercase tracking-wider">#19</div>
            <div className="text-[34px] font-light text-white opacity-80">17</div>
          </div>
        </div>
      </div>
      <div className="p-5">
        <div className="flex items-center gap-2 text-[12px] mb-3">
          <div className="w-[18px] h-[18px] rounded-[4px] bg-[#A50044] grid place-items-center text-[8px] font-bold text-white num">
            BAR
          </div>
          <span className="text-mute">Barcelona</span>
          <span className="text-mute-soft">&middot;</span>
          <span>🇪🇸</span>
          <span className="num text-mute text-[11px]">ESP</span>
          <span className="text-mute-soft">&middot;</span>
          <span className="text-mute num">RW</span>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-mute-soft mb-1">ONSIDE Valuation</div>
            <div className="display text-[44px] leading-none num">
              €215.0<span className="text-mute text-[18px] ml-1">M</span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="num inline-flex items-center gap-1 tracking-tight text-up text-base font-semibold">
                <span className="inline-block w-2 h-2 bg-up" style={{ clipPath: "polygon(50% 0,100% 100%,0 100%)" }} />
                +9.3M
              </span>
              <span className="text-mute text-[11px]">this week</span>
            </div>
          </div>
          <div className="w-[140px] h-[64px]">
            <svg viewBox="0 0 140 64" className="w-full h-full">
              <path
                d="M0,58 L10,52 L20,48 L30,44 L40,38 L50,35 L60,30 L70,28 L80,22 L90,18 L100,15 L110,12 L120,8 L130,6 L140,4"
                fill="none"
                stroke="#00E599"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M0,58 L10,52 L20,48 L30,44 L40,38 L50,35 L60,30 L70,28 L80,22 L90,18 L100,15 L110,12 L120,8 L130,6 L140,4 L140,64 L0,64 Z"
                fill="#00E599"
                fillOpacity="0.12"
              />
              <circle cx="140" cy="4" r="2.5" fill="#00E599" />
            </svg>
          </div>
        </div>
        <Link href="/players/yamal" className="block mt-4">
          <Button kind="ghost" size="md" className="w-full" icon={<ArrowRight size={13} />}>
            Open profile
          </Button>
        </Link>
      </div>
    </div>
  );
}

function TickerStrip() {
  const tickers = [
    { name: "Bellingham", club: "RMA", val: "€131.4M", delta: "+2.1M", up: true },
    { name: "Haaland", club: "MCI", val: "€178.5M", delta: "+4.2M", up: true },
    { name: "Mbappé", club: "RMA", val: "€185.0M", delta: "-3.8M", up: false },
    { name: "Saka", club: "ARS", val: "€142.0M", delta: "+5.6M", up: true },
    { name: "Vinicius Jr", club: "RMA", val: "€198.0M", delta: "+3.1M", up: true },
    { name: "Pedri", club: "BAR", val: "€112.0M", delta: "-1.2M", up: false },
    { name: "Wirtz", club: "LEV", val: "€140.5M", delta: "+6.8M", up: true },
    { name: "Palmer", club: "CHE", val: "€128.0M", delta: "+8.4M", up: true },
    { name: "Musiala", club: "BAY", val: "€148.0M", delta: "+2.9M", up: true },
    { name: "Gyökeres", club: "SPO", val: "€82.0M", delta: "+11.2M", up: true },
  ];

  return (
    <div className="relative border-b border-line bg-ink-850/40 overflow-hidden">
      <div className="flex gap-8 py-3 ticker whitespace-nowrap">
        {[...tickers, ...tickers].map((p, i) => (
          <span key={i} className="inline-flex items-center gap-2 text-[12px]">
            <span className="w-4 h-4 rounded-[3px] bg-ink-700 grid place-items-center text-[7px] font-bold num">
              {p.club}
            </span>
            <span className="font-medium">{p.name}</span>
            <span className="num text-mute">{p.val}</span>
            <span className={`num ${p.up ? "text-up" : "text-down"}`}>{p.delta}</span>
            <span className="opacity-25 ml-4">&middot;</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function ValueProps() {
  return (
    <section className="border-b border-line">
      <div className="max-w-[1440px] mx-auto px-6 py-20">
        <div className="grid lg:grid-cols-3 gap-2">
          <div className="rounded-2xl bg-ink-850 border border-line p-7 flex flex-col gap-5">
            <div className="text-[10px] uppercase tracking-[0.22em] text-mute-soft num">01 / Live Valuations</div>
            <h3 className="display text-[26px] leading-[1.1] tracking-tight">
              Stop arguing about static numbers.
            </h3>
            <p className="text-mute text-[13.5px] leading-relaxed">
              Transfermarkt valuations update when a community admin remembers. Ours update every
              time a player kicks a ball.
            </p>
            <div className="mt-auto pt-2">
              <div className="rounded-xl bg-ink-900 border border-line p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={14} className="text-up" />
                    <span className="text-[12px] font-medium">Live valuation feed</span>
                  </div>
                  <LiveDot />
                </div>
                <div className="space-y-2">
                  {[
                    { name: "Yamal", val: "€215.0M", d: "+9.3M", up: true },
                    { name: "Wirtz", val: "€140.5M", d: "+6.8M", up: true },
                    { name: "Palmer", val: "€128.0M", d: "+8.4M", up: true },
                  ].map((p) => (
                    <div key={p.name} className="flex items-center justify-between text-[12px]">
                      <span>{p.name}</span>
                      <span className="num text-mute">{p.val}</span>
                      <span className={`num ${p.up ? "text-up" : "text-down"}`}>{p.d}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-ink-850 border border-line p-7 flex flex-col gap-5">
            <div className="text-[10px] uppercase tracking-[0.22em] text-mute-soft num">02 / Community</div>
            <h3 className="display text-[26px] leading-[1.1] tracking-tight">
              Receipts settle arguments.
            </h3>
            <p className="text-mute text-[13.5px] leading-relaxed">
              Every prediction you make is on the record. Call a wonderkid early, your reputation
              climbs. Reputation buys verified scout badges.
            </p>
            <div className="mt-auto pt-2">
              <div className="rounded-xl bg-ink-900 border border-line p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-fuchsia-500 to-orange-400 grid place-items-center text-[10px] font-bold shrink-0">
                    AE
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-[11.5px]">
                      <span className="font-semibold">@AcademyEye</span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-acc/10 text-acc border border-acc/20 px-1.5 py-0.5 text-[9px] font-medium">
                        <Shield size={8} /> Verified
                      </span>
                    </div>
                    <div className="text-[12px] mt-1 leading-snug text-mute">
                      Called Yamal at €16M (Jan 2023). He&apos;s at{" "}
                      <span className="num text-up font-semibold">€215M</span> today.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-ink-850 border border-line p-7 flex flex-col gap-5">
            <div className="text-[10px] uppercase tracking-[0.22em] text-mute-soft num">03 / AI Coach</div>
            <h3 className="display text-[26px] leading-[1.1] tracking-tight">
              &ldquo;Find me an undervalued ST under 21 in Ligue 1.&rdquo;
            </h3>
            <p className="text-mute text-[13.5px] leading-relaxed">
              The AI Coach speaks football the way you do. Ask in plain English, get charts,
              comparison tables and clickable player chips.
            </p>
            <div className="mt-auto pt-2">
              <div className="rounded-xl bg-ink-900 border border-line p-4 space-y-2">
                <div className="flex items-center gap-2 text-[11px] text-mute">
                  <Sparkles size={11} className="text-acc" /> AI COACH &middot; PRO
                </div>
                <div className="text-[12.5px] leading-snug">
                  Three names. Average age 19.7. Average valuation €43M. All three sub-€20M two years ago.
                </div>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {["D. Doué", "Endrick", "S. Guirassy"].map((n) => (
                    <span
                      key={n}
                      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5 text-[12px] font-medium"
                    >
                      {n}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function MoversPreview() {
  const risers = [
    { name: "Viktor Gyökeres", club: "Sporting CP", age: 27, val: "€82.0M", delta: "+11.2M" },
    { name: "Lamine Yamal", club: "Barcelona", age: 17, val: "€215.0M", delta: "+9.3M" },
    { name: "Cole Palmer", club: "Chelsea", age: 23, val: "€128.0M", delta: "+8.4M" },
    { name: "Florian Wirtz", club: "Bayer Leverkusen", age: 22, val: "€140.5M", delta: "+6.8M" },
    { name: "Bukayo Saka", club: "Arsenal", age: 23, val: "€142.0M", delta: "+5.6M" },
  ];
  const fallers = [
    { name: "Kylian Mbappé", club: "Real Madrid", age: 27, val: "€185.0M", delta: "-3.8M" },
    { name: "Pedri", club: "Barcelona", age: 23, val: "€112.0M", delta: "-1.2M" },
    { name: "Marcus Rashford", club: "Manchester Utd", age: 28, val: "€55.0M", delta: "-4.1M" },
    { name: "N'Golo Kanté", club: "Al-Ittihad", age: 35, val: "€12.0M", delta: "-2.3M" },
    { name: "Raphaël Varane", club: "Free Agent", age: 33, val: "€8.0M", delta: "-1.8M" },
  ];

  return (
    <section className="border-b border-line">
      <div className="max-w-[1440px] mx-auto px-6 py-20">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-mute-soft mb-1.5 num">Today / Live</div>
            <h2 className="text-2xl md:text-[28px] display tracking-tight">The board is moving.</h2>
          </div>
          <Link href="/discover">
            <Button kind="outline" size="md" icon={<ArrowRight size={14} />}>
              Open the floor
            </Button>
          </Link>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <MoversList title="Risers" players={risers} direction="up" />
          <MoversList title="Fallers" players={fallers} direction="down" />
        </div>
      </div>
    </section>
  );
}

function MoversList({
  title,
  players,
  direction,
}: {
  title: string;
  players: { name: string; club: string; age: number; val: string; delta: string }[];
  direction: "up" | "down";
}) {
  const color = direction === "up" ? "#00E599" : "#FF4D63";
  return (
    <div className="rounded-2xl bg-ink-850 border border-line shadow-soft p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-md grid place-items-center"
            style={{ background: `${color}1A`, color }}
          >
            {direction === "up" ? (
              <TrendingUp size={13} strokeWidth={2.5} />
            ) : (
              <TrendingUp size={13} strokeWidth={2.5} className="rotate-180" />
            )}
          </div>
          <div className="display text-[18px]">{title}</div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium bg-white/5 text-mute border border-line/60">
          <span className="w-1.5 h-1.5 rounded-full bg-up pulse-dot" />
          Last 24h
        </span>
      </div>
      <div className="divide-y divide-line">
        {players.map((p) => (
          <div key={p.name} className="flex items-center gap-3 py-2.5">
            <div className="w-8 h-8 rounded-full bg-ink-700 grid place-items-center text-[11px] font-semibold shrink-0">
              {p.name.split(" ").map((n) => n[0]).join("")}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13.5px] font-medium truncate">{p.name}</div>
              <div className="text-[11px] text-mute truncate">
                {p.club} &middot; {p.age}y
              </div>
            </div>
            <div className="text-right">
              <div className="num text-[12.5px] font-semibold">{p.val}</div>
              <span className={`num text-xs ${direction === "up" ? "text-up" : "text-down"}`}>
                {p.delta}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SocialProof() {
  const quotes = [
    {
      text: "I've been waiting ten years for someone to do for player valuations what Bloomberg did for stocks.",
      author: "@xG_Pedro",
      sub: "Tactics writer",
    },
    {
      text: "ONSIDE called Endrick at €35M in October. I'm not paying for Pro because I want to -- I'm paying because I have to.",
      author: "@bet_eng",
      sub: "Power bettor",
    },
    {
      text: "We use the engine internally. The B2C product makes the same data available to fans without watering it down.",
      author: "Head of Recruitment",
      sub: "Top-five Bundesliga club",
    },
  ];

  return (
    <section className="border-b border-line bg-ink-850/30">
      <div className="max-w-[1440px] mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <div className="text-[11px] uppercase tracking-[0.18em] text-mute-soft mb-3 num">
            Said about ONSIDE
          </div>
          <h2 className="display text-[40px] tracking-tight max-w-[640px] mx-auto leading-[1.05]">
            The kind of product football twitter{" "}
            <span className="font-serif italic text-acc">actually</span> ships from.
          </h2>
        </div>
        <div className="grid lg:grid-cols-3 gap-4">
          {quotes.map((q) => (
            <div key={q.author} className="rounded-2xl bg-ink-850 border border-line p-6">
              <div className="text-[16px] font-serif leading-[1.45]">&ldquo;{q.text}&rdquo;</div>
              <div className="mt-5 flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-ink-700" />
                <div>
                  <div className="text-[12.5px] font-medium">{q.author}</div>
                  <div className="text-[11px] text-mute-soft">{q.sub}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingTeaser() {
  const tiers = [
    {
      name: "Free",
      price: "$0",
      tag: "Forever free",
      features: ["Full search and profiles", "Dynamic valuations", "Basic comparisons", "Community forum"],
      kind: "outline" as const,
    },
    {
      name: "Plus",
      price: "$4",
      tag: "/ month",
      features: ["Everything in Free", "Historical valuation graphs", "Unlimited watchlists", "Ad-free", "Premium forum badges"],
      kind: "ghost" as const,
    },
    {
      name: "Pro",
      price: "$20",
      tag: "/ month",
      features: ["AI Coach unlimited", "Scout-grade exports", "Predicted transfers", "Read-only API"],
      kind: "primary" as const,
      popular: true,
    },
  ];

  return (
    <section className="border-b border-line">
      <div className="max-w-[1440px] mx-auto px-6 py-20">
        <div className="flex items-end justify-between mb-6">
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-mute-soft mb-1.5 num">Three tiers</div>
            <h2 className="text-2xl md:text-[28px] display tracking-tight">
              Pick how deep you want to go.
            </h2>
          </div>
          <Link href="/pricing">
            <Button kind="outline">Full pricing</Button>
          </Link>
        </div>
        <div className="grid md:grid-cols-3 gap-2 mt-4">
          {tiers.map((t) => (
            <div
              key={t.name}
              className={`rounded-2xl p-7 border relative ${
                t.popular ? "bg-ink-850 border-acc/40" : "bg-ink-850 border-line"
              }`}
            >
              {t.popular && (
                <div className="absolute -top-2.5 left-7 px-2.5 py-0.5 rounded-full bg-acc text-ink-900 text-[10px] font-bold tracking-wide">
                  MOST POPULAR
                </div>
              )}
              <div className="mb-5">
                <span
                  className={`inline-flex items-center gap-1 rounded-full font-semibold tracking-tight px-2 py-0.5 text-[10px] ${
                    t.name === "Pro"
                      ? "bg-acc text-ink-900"
                      : t.name === "Plus"
                        ? "bg-white/8 text-white border border-white/10"
                        : "bg-ink-700 text-mute"
                  }`}
                >
                  ONSIDE {t.name}
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="display text-[44px] num">{t.price}</span>
                <span className="text-mute text-[13px]">{t.tag}</span>
              </div>
              <div className="my-6 space-y-2.5">
                {t.features.map((f) => (
                  <div key={f} className="flex items-center gap-2 text-[13px] text-mute">
                    <Check size={13} className="text-acc" />
                    <span className="text-white/90">{f}</span>
                  </div>
                ))}
              </div>
              <Link href="/pricing">
                <Button kind={t.kind} className="w-full">
                  {t.name === "Free" ? "Start" : `Go ${t.name}`}
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
