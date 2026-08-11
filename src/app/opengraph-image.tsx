import { ImageResponse } from "next/og";
import { OG, OG_SIZE, OG_CONTENT_TYPE, OgFrame } from "@/lib/og";

export const runtime = "nodejs";
export const alt = "Onside — Every player. Every valuation. Live.";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return new ImageResponse(
    (
      <OgFrame>
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div style={{ display: "flex", fontSize: 30, fontWeight: 600, letterSpacing: "0.04em", color: OG.up }}>
            FOOTBALL VALUATION, IN REAL TIME
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 92,
              fontWeight: 800,
              letterSpacing: "-0.045em",
              lineHeight: 1.02,
              color: OG.white,
            }}
          >
            <div style={{ display: "flex" }}>Every player.</div>
            <div style={{ display: "flex" }}>Every valuation.</div>
            <div style={{ display: "flex", color: OG.up }}>Live.</div>
          </div>
        </div>
      </OgFrame>
    ),
    { ...size },
  );
}
