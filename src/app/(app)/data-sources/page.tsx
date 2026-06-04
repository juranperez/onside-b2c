import type { Metadata } from "next";
import Link from "next/link";
import { Card, Chip, Button } from "@/components/ui";

export const metadata: Metadata = {
  title: "Data & sources — Onside",
  description:
    "The data behind Onside: licensed commercial feeds, open datasets with attribution, and a clear statement of what we do and don't use. Valuations are model estimates.",
};

type Source = {
  name: string;
  tag: string;
  body: string;
  href?: string;
};

const SOURCES: Source[] = [
  {
    name: "API-Football",
    tag: "Licensed · commercial",
    href: "https://www.api-football.com",
    body: "Our primary feed, licensed commercially. It powers player and club statistics, fixtures and results, squad data, and the real 2026 World Cup draw. This is the backbone the valuation model reads from.",
  },
  {
    name: "football-data.org",
    tag: "Licensed feed",
    href: "https://www.football-data.org",
    body: "A supplementary competitions-and-fixtures feed we use to cross-check coverage and fill scheduling gaps across the leagues we track.",
  },
  {
    name: "American Soccer Analysis",
    tag: "Free · attribution required",
    href: "https://www.americansocceranalysis.com",
    body: "An excellent open analytics resource for MLS and North American football. We use it under its free terms and credit it visibly wherever its data informs what you see — see the attribution below.",
  },
  {
    name: "circle-flags",
    tag: "Open source · MIT",
    href: "https://github.com/HatScripts/circle-flags",
    body: "The circular country flags across the app come from the MIT-licensed circle-flags project. Clean, consistent, and freely licensed — no national emblems are used in any official capacity.",
  },
];

export default function DataSourcesPage() {
  return (
    <div className="max-w-[1440px] mx-auto px-6 py-16 sm:py-20">
      <div className="max-w-[720px] mx-auto">
        {/* Hero */}
        <div className="text-[11px] uppercase tracking-[0.18em] text-mute-soft mb-3 num">
          Where the numbers come from
        </div>
        <h1 className="display text-[clamp(30px,5vw,46px)] leading-[1.04] tracking-[-0.04em]">
          Data &amp; <span className="font-serif italic font-normal text-acc">sources</span>
        </h1>
        <p className="text-[16px] text-mute mt-5 leading-relaxed">
          A valuation is only as trustworthy as the data underneath it. So here's exactly where ours comes
          from — what's licensed, what's open, who we credit, and what we deliberately don't touch.
        </p>

        {/* Sources list */}
        <section className="mt-12">
          <h2 className="text-2xl md:text-[28px] display tracking-tight">The feeds we run on</h2>
          <div className="mt-6 space-y-3">
            {SOURCES.map((s) => (
              <Card key={s.name} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-[16px] font-semibold tracking-tight text-fg">
                    {s.href ? (
                      <Link
                        href={s.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-acc transition"
                      >
                        {s.name}
                      </Link>
                    ) : (
                      s.name
                    )}
                  </h3>
                  <Chip tone="neutral" className="shrink-0">
                    {s.tag}
                  </Chip>
                </div>
                <p className="text-[14px] text-mute mt-2 leading-relaxed">{s.body}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* Visible ASA attribution */}
        <section className="mt-10">
          <Card className="p-5 border-acc/20">
            <div className="text-[11px] uppercase tracking-[0.18em] text-acc/80 mb-2 num">Attribution</div>
            <p className="text-[14px] text-mute leading-relaxed">
              Some North American football data is provided by{" "}
              <Link
                href="https://www.americansocceranalysis.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-fg font-medium hover:text-acc transition"
              >
                American Soccer Analysis
              </Link>
              . We're grateful for their open work and credit it here as their terms require.
            </p>
          </Card>
        </section>

        {/* What we do NOT use / affiliation disclaimers */}
        <section className="mt-12">
          <h2 className="text-2xl md:text-[28px] display tracking-tight">What we deliberately don't use</h2>
          <div className="mt-4 space-y-4 text-[15px] text-mute leading-relaxed">
            <p>
              Being rigorous about data also means being disciplined about rights and trademarks. To keep
              Onside clean and independent:
            </p>
            <ul className="space-y-3 pl-1">
              <li className="flex gap-3">
                <span className="text-acc mt-1.5 text-[10px]">&#9679;</span>
                <span>
                  <span className="text-fg font-medium">
                    We do not use licensed player photographs or club crests.
                  </span>{" "}
                  Player imagery and club badges are rights-protected, so you won't find them here. We use
                  our own marks, neutral avatars, and the open-source circular flags described above.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-acc mt-1.5 text-[10px]">&#9679;</span>
                <span>
                  <span className="text-fg font-medium">
                    Onside is not affiliated with, endorsed by, or associated with FIFA.
                  </span>{" "}
                  &ldquo;World Cup&rdquo; is referenced descriptively, to identify the tournament our coverage
                  relates to — not as any official designation, partnership, or licence.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-acc mt-1.5 text-[10px]">&#9679;</span>
                <span>
                  <span className="text-fg font-medium">Valuations are model estimates.</span> Every figure
                  on Onside is produced by our own model — not sourced from any official market, club, or
                  third party as a quoted price. See{" "}
                  <Link href="/methodology" className="text-fg font-medium hover:text-acc transition">
                    the methodology
                  </Link>{" "}
                  for exactly how they're built.
                </span>
              </li>
            </ul>
          </div>
        </section>

        {/* Footer CTA */}
        <div className="mt-12 pt-8 border-t border-line flex flex-wrap items-center gap-3">
          <Link href="/methodology">
            <Button kind="ghost" size="md">
              How valuations work
            </Button>
          </Link>
          <Link href="/players">
            <Button kind="quiet" size="md">
              Browse players
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
