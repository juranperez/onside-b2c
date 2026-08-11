import { ImageResponse } from "next/og";
import { getPlayerBySlug } from "@/lib/queries";
import { OG, OG_SIZE, OG_CONTENT_TYPE, OgFrame, Eyebrow, BigValue, fmtEur } from "@/lib/og";

export const runtime = "nodejs";
export const alt = "Onside player valuation";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  // OG generation must never throw — fall back to the generic branded card.
  let name: string | null = null;
  let meta = "";
  let value = 0;

  try {
    const { id } = await params;
    const player = await getPlayerBySlug(id);
    if (player) {
      name = player.name;
      value = player.value;
      meta = [player.club?.name, player.position].filter(Boolean).join("  ·  ");
    }
  } catch {
    name = null;
  }

  if (!name) {
    return new ImageResponse(
      (
        <OgFrame>
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <Eyebrow>ONSIDE VALUATION</Eyebrow>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                fontSize: 88,
                fontWeight: 800,
                letterSpacing: "-0.045em",
                lineHeight: 1.02,
                color: OG.white,
              }}
            >
              <div style={{ display: "flex" }}>Every player.</div>
              <div style={{ display: "flex", color: OG.up }}>Every valuation.</div>
            </div>
          </div>
        </OgFrame>
      ),
      { ...size },
    );
  }

  return new ImageResponse(
    (
      <OgFrame>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              display: "flex",
              fontSize: name.length > 22 ? 64 : 80,
              fontWeight: 800,
              letterSpacing: "-0.04em",
              lineHeight: 1.0,
              color: OG.white,
            }}
          >
            {name}
          </div>
          {meta ? (
            <div style={{ display: "flex", fontSize: 28, color: OG.mute, letterSpacing: "0.01em" }}>{meta}</div>
          ) : null}

          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 22 }}>
            <Eyebrow>ONSIDE VALUATION</Eyebrow>
            <BigValue>{fmtEur(value)}</BigValue>
          </div>
        </div>
      </OgFrame>
    ),
    { ...size },
  );
}
