import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, AlertTriangle, ExternalLink } from "lucide-react";
import { Avatar, Button } from "@/components/ui";
import { JsonLd } from "@/components/seo/json-ld";
import { FeeValueBar } from "@/components/transfers/fee-value-bar";
import { getArticleBySlug } from "@/lib/news/queries";

export const dynamic = "force-dynamic";

const BASE_URL = "https://onsidemarket.com";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const a = await getArticleBySlug(slug).catch(() => null);
  if (!a) return { title: "Briefing — Onside" };
  return {
    title: `${a.title} | Onside`,
    description: a.dek,
    alternates: { canonical: `${BASE_URL}/news/${a.slug}` },
    openGraph: {
      type: "article",
      title: a.title,
      description: a.dek,
      url: `${BASE_URL}/news/${a.slug}`,
      publishedTime: a.publishedAt,
      modifiedTime: a.updatedAt,
    },
  };
}

function fmt(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));
}

export default async function NewsArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = await getArticleBySlug(slug).catch(() => null);
  if (!a) notFound();

  const f = a.body.facts;

  // NewsArticle structured data — what puts these briefings in Top Stories and
  // gives answer engines a clean entity graph to cite. Every string here has
  // already passed the news validator, which rejects markup outright.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: a.title,
    description: a.dek,
    datePublished: a.publishedAt,
    dateModified: a.updatedAt,
    mainEntityOfPage: { "@type": "WebPage", "@id": `${BASE_URL}/news/${a.slug}` },
    image: [`${BASE_URL}/news/${a.slug}/opengraph-image`],
    author: { "@type": "Organization", name: "Onside Data Desk", url: `${BASE_URL}/methodology` },
    publisher: { "@type": "Organization", name: "Onside", url: BASE_URL },
    about: [
      { "@type": "Person", name: f.player },
      { "@type": "SportsTeam", name: f.toClub },
    ],
  };

  return (
    <article className="max-w-[720px] mx-auto px-6 py-8">
      <JsonLd data={jsonLd} />

      <Link href="/news" className="inline-flex items-center gap-1.5 text-[13px] text-mute hover:text-fg transition mb-6">
        <ArrowLeft size={14} /> News
      </Link>

      <h1 className="display text-[clamp(26px,4.5vw,38px)] tracking-tight leading-[1.08]">{a.title}</h1>
      <p className="text-[16px] text-mute mt-3 leading-relaxed">{a.dek}</p>

      <div className="flex items-center gap-2 mt-4 text-[12px] text-mute-soft flex-wrap">
        <Link href="/methodology" className="text-fg font-medium hover:text-acc transition">
          Onside Data Desk
        </Link>
        <span>·</span>
        <time dateTime={a.publishedAt} className="num">
          {fmt(a.publishedAt)}
        </time>
      </div>

      {a.correction && (
        <div className="mt-6 rounded-xl border border-down/30 bg-down/10 px-4 py-3 flex items-start gap-2.5">
          <AlertTriangle size={15} className="text-down shrink-0 mt-0.5" />
          <p className="text-[13px] text-fg leading-relaxed">
            <span className="font-semibold">Update. </span>
            {a.correction}
          </p>
        </div>
      )}

      {/* Who + where, linked out to the entity pages (the internal-link cluster). */}
      <div className="flex items-center gap-3 mt-7 pb-6 border-b border-line">
        <Avatar name={f.player} src={f.playerPhoto} size={44} />
        <div className="min-w-0">
          <Link href={`/players/${f.playerSlug}`} className="text-[15px] font-semibold hover:text-acc transition">
            {f.player}
          </Link>
          <div className="flex items-center gap-1.5 text-[13px] text-mute mt-0.5 min-w-0">
            <span className="truncate">{f.fromClub}</span>
            <ArrowRight size={12} className="text-mute-soft shrink-0" />
            <span className="truncate text-fg font-medium">{f.toClub}</span>
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {a.body.paragraphs.map((p, i) => (
          <p key={i} className="text-[15.5px] leading-[1.75] text-fg/90">
            {p}
          </p>
        ))}
      </div>

      {/* The money read — the proprietary core that makes this more than a rewrite. */}
      <div className="mt-8 rounded-xl border border-line bg-ink-850 p-5">
        <div className="text-[11px] uppercase tracking-wider text-mute-soft num mb-3">The Onside read</div>
        <FeeValueBar feeM={f.reportedFeeM} valueM={f.onsideValueM} />
        <div className="mt-4 pt-4 border-t border-line flex items-center justify-between text-[12px]">
          <span className="text-mute">Onside Confidence</span>
          <span className="num font-semibold text-acc">{f.confidencePct}%</span>
        </div>
        <p className="text-[10.5px] text-mute-soft mt-3 leading-relaxed">
          Valuation and confidence are Onside model estimates, not market quotes. See{" "}
          <Link href="/methodology" className="underline hover:text-fg">
            our methodology
          </Link>
          .
        </p>
      </div>

      {/* Attribution — every briefing credits and links the reporting it is built on. */}
      <div className="mt-6 text-[12.5px] text-mute">
        Reporting: <span className="text-fg font-medium">{f.source}</span>
        {f.corroborations > 1 && <span> · {f.corroborations} tracked reports</span>}
        {f.sourceUrl && (
          <a
            href={f.sourceUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="inline-flex items-center gap-1 ml-2 text-acc hover:underline"
          >
            Original <ExternalLink size={11} />
          </a>
        )}
      </div>

      {a.rumourId && (
        <div className="mt-8 pt-6 border-t border-line">
          <Link href={`/transfers/${a.rumourId}`}>
            <Button kind="primary">Follow the full saga →</Button>
          </Link>
        </div>
      )}

      <p className="text-[10.5px] text-mute-soft mt-8 leading-relaxed">
        Generated by the Onside data engine from tracked reporting, deal stage and our live valuation. Reporting is
        credited and linked above.
      </p>
    </article>
  );
}
