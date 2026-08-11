import { ImageResponse } from "next/og";
import { OG, OG_SIZE, OG_CONTENT_TYPE, OgFrame, Eyebrow } from "@/lib/og";
import { getArticleBySlug } from "@/lib/news/queries";

export const runtime = "nodejs";
export const alt = "Onside transfer briefing";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

/**
 * The article hero card — our OWNED visual. Rivals all run the same wire photo;
 * nobody else can render our valuation and confidence, so this both avoids
 * licensing exposure and differentiates in the feed.
 */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  let a: Awaited<ReturnType<typeof getArticleBySlug>> = null;
  try {
    const { slug } = await params;
    a = await getArticleBySlug(slug);
  } catch {
    a = null;
  }

  if (!a) {
    return new ImageResponse(
      (
        <OgFrame>
          <Eyebrow>ONSIDE NEWS</Eyebrow>
          <div style={{ display: "flex", fontSize: 84, fontWeight: 800, letterSpacing: "-0.045em", color: OG.white, marginTop: 18 }}>
            Every deal, priced.
          </div>
        </OgFrame>
      ),
      { ...size },
    );
  }

  const f = a.body.facts;
  return new ImageResponse(
    (
      <OgFrame>
        <Eyebrow>ONSIDE BRIEFING</Eyebrow>
        <div
          style={{
            display: "flex",
            fontSize: a.title.length > 60 ? 44 : 56,
            fontWeight: 800,
            letterSpacing: "-0.03em",
            lineHeight: 1.06,
            color: OG.white,
            marginTop: 14,
          }}
        >
          {a.title.slice(0, 96)}
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 48, marginTop: 40 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", fontSize: 19, letterSpacing: "0.2em", color: OG.muteSoft }}>
              ONSIDE VALUE
            </div>
            <div style={{ display: "flex", fontSize: 84, fontWeight: 800, lineHeight: 1, color: OG.acc, letterSpacing: "-0.04em" }}>
              €{f.onsideValueM}M
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
            <div style={{ display: "flex", fontSize: 26, color: OG.mute }}>
              {f.reportedFeeM === 0 ? "Free transfer" : f.reportedFeeM != null ? `€${f.reportedFeeM}M reported` : "Fee undisclosed"}
            </div>
            <div style={{ display: "flex", fontSize: 26, color: OG.mute }}>{f.confidencePct}% Onside Confidence</div>
          </div>
        </div>
      </OgFrame>
    ),
    { ...size },
  );
}
