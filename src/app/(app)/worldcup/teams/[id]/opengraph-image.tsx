import { ImageResponse } from "next/og";
import { getNationalTeamBySlug } from "@/lib/queries";
import { OG, OG_SIZE, OG_CONTENT_TYPE, OgFrame, Eyebrow, BigValue, fmtMillions } from "@/lib/og";

export const runtime = "nodejs";
export const alt = "Onside — World Cup 2026 squad value";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  // OG generation must never throw — fall back to the generic branded card.
  let name: string | null = null;
  let squadValueM = 0;

  try {
    const { id } = await params;
    const team = await getNationalTeamBySlug(id);
    if (team) {
      name = team.name;
      squadValueM = team.squadValueM;
    }
  } catch {
    name = null;
  }

  if (!name) {
    return new ImageResponse(
      (
        <OgFrame>
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <Eyebrow>WORLD CUP 2026 SQUAD VALUE</Eyebrow>
            <div
              style={{
                display: "flex",
                fontSize: 84,
                fontWeight: 800,
                letterSpacing: "-0.045em",
                lineHeight: 1.04,
                color: OG.white,
              }}
            >
              What&apos;s your squad worth?
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
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              display: "flex",
              fontSize: name.length > 18 ? 68 : 84,
              fontWeight: 800,
              letterSpacing: "-0.04em",
              lineHeight: 1.0,
              color: OG.white,
            }}
          >
            {name}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 18 }}>
            <Eyebrow>WORLD CUP 2026 SQUAD VALUE</Eyebrow>
            <BigValue>{fmtMillions(squadValueM)}</BigValue>
          </div>

          <div style={{ display: "flex", fontSize: 30, fontWeight: 600, color: OG.acc, marginTop: 14 }}>
            What&apos;s your squad worth?
          </div>
        </div>
      </OgFrame>
    ),
    { ...size },
  );
}
