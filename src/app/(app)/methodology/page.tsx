import type { Metadata } from "next";
import Link from "next/link";
import { Card, Chip, Button } from "@/components/ui";

export const metadata: Metadata = {
  title: "The Onside methodology — Onside",
  description:
    "How Onside values every footballer: a transparent, deterministic model with confidence bands, a daily Pulse, and a single honest caveat — it's a model estimate, not a market quote.",
};

const PILLARS: { name: string; weight: string; body: string }[] = [
  {
    name: "Performance",
    weight: "The anchor",
    body: "Match rating across the season — how well a player is actually playing, normalised so a 7.4 means the same thing in Lisbon as it does in London.",
  },
  {
    name: "Output",
    weight: "Goals & assists",
    body: "Goal contributions per 90, measured against what's expected of the position. A centre-back and a striker are held to different bars. Hot streaks in tiny samples are shrunk toward the mean — we don't crown a player off 200 minutes.",
  },
  {
    name: "Involvement",
    weight: "Minutes played",
    body: "How central a player is to their side. A regular starter carries more signal — and more value — than a squad rotation option with the same per-90 numbers.",
  },
  {
    name: "Age",
    weight: "The trajectory",
    body: "The market pays for potential and discounts decline. Our age curve is youth-friendly through the mid-twenties and steepens sharply for veterans, mirroring how clubs actually price a transfer.",
  },
  {
    name: "League coefficient",
    weight: "The multiplier",
    body: "A goal in the Premier League is not a goal in a feeder division. Each competition carries a quality weight that scales the final figure — applied once, as a multiplier, never double-counted as a score.",
  },
];

export default function MethodologyPage() {
  return (
    <div className="max-w-[1440px] mx-auto px-6 py-16 sm:py-20">
      <div className="max-w-[720px] mx-auto">
        {/* Hero */}
        <div className="text-[11px] uppercase tracking-[0.18em] text-mute-soft mb-3 num">
          How we value players
        </div>
        <h1 className="display text-[clamp(30px,5vw,46px)] leading-[1.04] tracking-[-0.04em]">
          The Onside <span className="font-serif italic font-normal text-acc">methodology</span>
        </h1>
        <p className="text-[16px] text-mute mt-5 leading-relaxed">
          Every footballer on Onside carries a valuation produced the same way: by a transparent,
          deterministic model that reads real performance data and outputs a single euro figure — with
          a confidence band around it and a daily heartbeat. No committee. No crowd. No black box.
        </p>

        {/* The model */}
        <section className="mt-12">
          <h2 className="text-2xl md:text-[28px] display tracking-tight">One model, every player</h2>
          <div className="mt-4 space-y-4 text-[15px] text-mute leading-relaxed">
            <p>
              We don't hand-pick the stars and guess at everyone else. The exact same engine values a
              Champions League forward and a third-choice goalkeeper in the second tier. That's the point:
              a level playing field, applied without favour, so two players with identical seasons get
              identical valuations regardless of how famous they are.
            </p>
            <p>
              The model rests on a handful of pillars. Each one captures something a scout would actually
              care about, and each is weighted differently depending on the position — output matters far
              more for a striker than for a centre-half, and we treat them accordingly.
            </p>
          </div>

          <div className="mt-7 space-y-3">
            {PILLARS.map((p) => (
              <Card key={p.name} className="p-5">
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="text-[16px] font-semibold tracking-tight text-fg">{p.name}</h3>
                  <span className="text-[11px] uppercase tracking-[0.14em] text-mute-soft num shrink-0">
                    {p.weight}
                  </span>
                </div>
                <p className="text-[14px] text-mute mt-2 leading-relaxed">{p.body}</p>
              </Card>
            ))}
          </div>

          <p className="text-[15px] text-mute mt-6 leading-relaxed">
            Those pillars combine into a single 0&ndash;100 score, and the score maps onto a euro value
            through a position baseline, the league multiplier, and the age curve. The result is clamped
            to a sane range — we won't print a &euro;0 player or a billion-euro one — so a thin or noisy
            data point can never produce an absurd headline.
          </p>
        </section>

        {/* Confidence bands */}
        <section className="mt-12">
          <h2 className="text-2xl md:text-[28px] display tracking-tight">
            Every value comes with a confidence band
          </h2>
          <div className="mt-4 space-y-4 text-[15px] text-mute leading-relaxed">
            <p>
              A point estimate on its own is a kind of lie — it pretends to a precision nobody has. So we
              never show one alone. Every valuation ships with a band: a low and a high we genuinely
              believe the player sits between.
            </p>
            <p>
              The band's width is honest about what we know. When we hold a full, clean season — minutes,
              ratings, goals, age — the band is tight and confidence is high. When a player is barely
              featured, has no reliable rating, or is missing an age, we{" "}
              <span className="text-fg font-medium">widen the band and lower the confidence</span>{" "}
              rather than fake a number. Less data, more humility. You always see exactly how sure we are.
            </p>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <Chip tone="up">High confidence &middot; full season</Chip>
            <Chip tone="neutral">Medium &middot; partial data</Chip>
            <Chip tone="down">Low &middot; thin sample, wider band</Chip>
          </div>
        </section>

        {/* The Pulse */}
        <section className="mt-12">
          <h2 className="text-2xl md:text-[28px] display tracking-tight">
            Values move daily — the <span className="font-serif italic font-normal text-acc">Pulse</span>
          </h2>
          <div className="mt-4 space-y-4 text-[15px] text-mute leading-relaxed">
            <p>
              Football doesn't stand still, so neither do our valuations. Each day the board ticks via the
              Pulse — a small, deterministic daily movement layered on top of the underlying model. It's
              what makes the market feel alive: a player you watched yesterday will read a little higher or
              lower today.
            </p>
            <p>
              Deterministic is the operative word. The Pulse isn't random noise and it isn't a trader on a
              desk nudging numbers. Given the same inputs, it produces the same movement, every time — fully
              reproducible, auditable, and free of human thumbs on the scale.
            </p>
          </div>
        </section>

        {/* The honest caveat — the heart of the trust story */}
        <section className="mt-12">
          <Card className="p-6 sm:p-7 border-acc/20">
            <div className="text-[11px] uppercase tracking-[0.18em] text-acc/80 mb-2 num">
              Read this once
            </div>
            <h2 className="text-xl md:text-2xl display tracking-tight">
              An Onside valuation is a model estimate
            </h2>
            <div className="mt-3 space-y-3 text-[14px] text-mute leading-relaxed">
              <p>
                It is <span className="text-fg font-medium">not</span> a market quote, a transfer fee, an
                offer, or financial advice. No money changes hands at our number. It is our best,
                fully-disclosed estimate of what a player is worth on the pitch today, given the data we can
                see — nothing more, and we'd rather you held us to that than oversold it.
              </p>
            </div>
          </Card>
        </section>

        {/* Contrast with Transfermarkt */}
        <section className="mt-12">
          <h2 className="text-2xl md:text-[28px] display tracking-tight">
            Why this is more rigorous than crowd-sourced values
          </h2>
          <div className="mt-4 space-y-4 text-[15px] text-mute leading-relaxed">
            <p>
              The reference point most fans know — Transfermarkt — builds its values from community debate:
              users propose figures, moderators arbitrate, and a number eventually settles. It's a
              remarkable feat of collective knowledge, and we have real respect for it. But it is, by
              construction, an opinion poll. It inherits the crowd's biases, moves on sentiment, lags reality,
              and can't tell you <em>why</em> a number is what it is.
            </p>
            <p>
              Onside takes the opposite approach. The same model runs on every player, the inputs are stated,
              the pillars are visible, and the maths is the maths. You can disagree with our weighting — but
              you can see it, and you'll always get the same answer from the same data. That's the trade we're
              making:{" "}
              <span className="text-fg font-medium">transparency and consistency over the wisdom of the crowd.</span>
            </p>
          </div>
        </section>

        {/* Limitations — honesty builds trust */}
        <section className="mt-12">
          <h2 className="text-2xl md:text-[28px] display tracking-tight">Where we're still honest about the gaps</h2>
          <div className="mt-4 space-y-4 text-[15px] text-mute leading-relaxed">
            <p>
              A model is only as good as what it can see, and we'd rather name the limits than pretend they
              don't exist:
            </p>
            <ul className="space-y-3 pl-1">
              <li className="flex gap-3">
                <span className="text-acc mt-1.5 text-[10px]">&#9679;</span>
                <span>
                  <span className="text-fg font-medium">Advanced metrics aren't everywhere yet.</span> We
                  don't have live expected-goals (xG) and shot-quality data for every league we cover. Where
                  it's missing, the model leans harder on the signals it does have, and the confidence band
                  reflects that.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-acc mt-1.5 text-[10px]">&#9679;</span>
                <span>
                  <span className="text-fg font-medium">National-team valuations are squad-based.</span> A
                  country's value is built up from the players in its pool, not from a separate international
                  model. It's a useful lens for a tournament, but it's an aggregate, and we label it as one.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-acc mt-1.5 text-[10px]">&#9679;</span>
                <span>
                  <span className="text-fg font-medium">We don't model the intangibles.</span> Injuries,
                  contract length, a falling-out with a manager, off-pitch noise — the things a human scout
                  weighs that don't show up cleanly in a stat line. The Pulse and the bands soften this, but
                  they don't erase it.
                </span>
              </li>
            </ul>
            <p>
              We'd rather lose an argument honestly than win one by hiding the method. As coverage deepens —
              more leagues, richer data — the bands tighten and the estimates sharpen. The model improves in
              public, on the record.
            </p>
          </div>
        </section>

        {/* Footer CTA */}
        <div className="mt-12 pt-8 border-t border-line flex flex-wrap items-center gap-3">
          <Link href="/data-sources">
            <Button kind="ghost" size="md">
              See our data &amp; sources
            </Button>
          </Link>
          <Link href="/players">
            <Button kind="quiet" size="md">
              Browse valuations
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
