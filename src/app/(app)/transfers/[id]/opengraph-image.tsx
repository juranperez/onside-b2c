import { ImageResponse } from "next/og";
import { OG, OG_SIZE, OG_CONTENT_TYPE, OgFrame, Eyebrow } from "@/lib/og";
import { getRumourById } from "@/lib/queries/rumours";

export const runtime = "nodejs";
export const alt = "Onside transfer rumour";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  let r: Awaited<ReturnType<typeof getRumourById>> = null;
  try {
    const { id } = await params;
    r = await getRumourById(id);
  } catch {
    r = null;
  }

  if (!r) {
    return new ImageResponse(
      (
        <OgFrame>
          <Eyebrow>TRANSFER ROOM</Eyebrow>
          <div style={{ display: "flex", fontSize: 84, fontWeight: 800, letterSpacing: "-0.045em", color: OG.white, marginTop: 18 }}>
            Every rumour, rated.
          </div>
        </OgFrame>
      ),
      { ...size },
    );
  }

  const confirmed = r.status === "confirmed";
  const dead = r.status === "dead";
  const bandColor = r.confidence.band === "high" ? OG.up : r.confidence.band === "medium" ? OG.acc : "#FF4D63";

  return new ImageResponse(
    (
      <OgFrame>
        <Eyebrow>{confirmed ? "CONFIRMED TRANSFER" : dead ? "DEAD RUMOUR" : "TRANSFER RUMOUR"}</Eyebrow>
        <div
          style={{
            display: "flex",
            fontSize: r.player.name.length > 22 ? 56 : 70,
            fontWeight: 800,
            letterSpacing: "-0.035em",
            lineHeight: 1.02,
            color: OG.white,
            marginTop: 14,
          }}
        >
          {r.player.name}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 14, fontSize: 32, color: OG.mute }}>
          <span>{r.player.fromClub}</span>
          <span style={{ color: OG.muteSoft }}>→</span>
          <span style={{ color: OG.white }}>{r.toClub}</span>
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", gap: 48, marginTop: 44 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", fontSize: 19, letterSpacing: "0.2em", color: OG.muteSoft }}>
              {confirmed ? "STATUS" : "ONSIDE CONFIDENCE"}
            </div>
            <div style={{ display: "flex", fontSize: 116, fontWeight: 800, lineHeight: 1, color: bandColor, letterSpacing: "-0.04em" }}>
              {confirmed ? "✓" : dead ? "✕" : `${r.confidence.pct}%`}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
            <div style={{ display: "flex", fontSize: 26, color: OG.mute }}>
              {r.reportedFeeM === 0 ? "Free transfer" : r.reportedFeeM != null ? `€${r.reportedFeeM}M reported` : "Fee undisclosed"}
            </div>
            <div style={{ display: "flex", fontSize: 26, color: OG.mute }}>€{r.onsideValueM}M Onside value</div>
          </div>
        </div>
      </OgFrame>
    ),
    { ...size },
  );
}
