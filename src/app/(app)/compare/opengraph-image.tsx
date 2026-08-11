import { ImageResponse } from "next/og";
import { OG, OG_SIZE, OG_CONTENT_TYPE, OgFrame, Eyebrow } from "@/lib/og";

export const runtime = "nodejs";
export const alt = "Compare players on Onside";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return new ImageResponse(
    (
      <OgFrame>
        <Eyebrow>HEAD TO HEAD</Eyebrow>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontSize: 84,
            fontWeight: 800,
            letterSpacing: "-0.045em",
            lineHeight: 1.02,
            color: OG.white,
            marginTop: 16,
          }}
        >
          <div style={{ display: "flex" }}>Compare any</div>
          <div style={{ display: "flex", color: OG.up }}>two players.</div>
        </div>
        <div style={{ display: "flex", fontSize: 30, color: OG.mute, marginTop: 20 }}>
          Valuations, value pillars and form — side by side.
        </div>
      </OgFrame>
    ),
    { ...size },
  );
}
