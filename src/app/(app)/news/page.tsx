import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Avatar } from "@/components/ui";
import { listArticles } from "@/lib/news/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Transfer news — every deal, priced against our valuation | Onside",
  description:
    "Data-backed transfer briefings: what was reported, what the deal is worth against the Onside valuation, and how credible it is.",
  alternates: { canonical: "https://onsidemarket.com/news" },
};

function ago(iso: string, now: number): string {
  const mins = (now - new Date(iso).getTime()) / 60_000;
  if (mins < 60) return `${Math.max(1, Math.floor(mins))}m ago`;
  if (mins < 60 * 24) return `${Math.floor(mins / 60)}h ago`;
  return `${Math.floor(mins / (60 * 24))}d ago`;
}

export default async function NewsIndexPage() {
  const articles = await listArticles(40).catch(() => []);
  const now = Date.now();
  const [lead, ...rest] = articles;

  return (
    <div className="max-w-[900px] mx-auto px-6 py-8">
      <div className="mb-8">
        <div className="text-[11px] uppercase tracking-[0.18em] text-mute-soft num mb-2">Onside News</div>
        <h1 className="display text-[clamp(28px,4.5vw,40px)] tracking-tight leading-[1.05]">
          Every deal, <span className="font-serif italic text-acc">priced.</span>
        </h1>
        <p className="mt-3 text-[15px] text-mute max-w-[560px] leading-relaxed">
          Briefings written from tracked reporting and our live valuation — what was said, what it&apos;s worth, and how
          credible it is.
        </p>
      </div>

      {articles.length === 0 ? (
        <div className="rounded-xl border border-line bg-ink-850 p-8 text-center">
          <p className="text-[14px] text-mute">
            The desk is warming up. Briefings publish as deals move —{" "}
            <Link href="/transfers" className="text-acc hover:underline">
              follow the Wire
            </Link>{" "}
            in the meantime.
          </p>
        </div>
      ) : (
        <>
          {lead && (
            <Link
              href={`/news/${lead.slug}`}
              className="block rounded-2xl border border-acc/30 bg-ink-850 p-6 mb-4 hover:bg-ink-800 transition"
            >
              <div className="text-[10px] uppercase tracking-wider text-acc num font-bold mb-2">Latest</div>
              <h2 className="display text-[clamp(20px,3vw,28px)] tracking-tight leading-[1.12]">{lead.title}</h2>
              <p className="text-[14px] text-mute mt-2.5 leading-relaxed line-clamp-2">{lead.dek}</p>
              <div className="flex items-center gap-2 mt-4 text-[11.5px] text-mute-soft">
                <Avatar name={lead.player} src={lead.playerPhoto} size={22} />
                <span className="text-fg">{lead.player}</span>
                <ArrowRight size={11} />
                <span>{lead.toClub}</span>
                <span className="ml-auto num">{ago(lead.publishedAt, now)}</span>
              </div>
            </Link>
          )}

          <div className="grid sm:grid-cols-2 gap-3">
            {rest.map((a) => (
              <Link
                key={a.slug}
                href={`/news/${a.slug}`}
                className="block rounded-xl border border-line bg-ink-850 p-5 hover:bg-ink-800 transition"
              >
                <h3 className="text-[15px] font-semibold leading-snug">{a.title}</h3>
                <p className="text-[12.5px] text-mute mt-1.5 leading-relaxed line-clamp-2">{a.dek}</p>
                <div className="flex items-center gap-2 mt-3 text-[11px] text-mute-soft">
                  <Avatar name={a.player} src={a.playerPhoto} size={18} />
                  <span className="truncate">{a.player}</span>
                  <span className="ml-auto num shrink-0">{ago(a.publishedAt, now)}</span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
