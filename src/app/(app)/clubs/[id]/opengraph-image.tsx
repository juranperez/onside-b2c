import { ImageResponse } from "next/og";
import { getClubBySlug } from "@/lib/queries";
import { OG, OG_SIZE, OG_CONTENT_TYPE, OgFrame, Eyebrow, BigValue, fmtMillions } from "@/lib/og";

export const runtime = "nodejs";
export const alt = "Onside — squad value";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  // OG generation must never throw — fall back to the generic branded card.
  let name: string | null = null;
  let league = "";
  let squadValueM = 0;

  try {
    const { id } = await params;
    const club = await getClubBySlug(id);
    if (club) {
      name = club.name;
      league = club.league && club.league !== "—" ? club.league : "";
      squadValueM = club.squadValueM;
    }
  } catch {
    name = null;
  }

  if (!name) {
    return new ImageResponse(
      (
        <OgFrame>
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <Eyebrow>SQUAD VALUE</Eyebrow>
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
              Every club, valued live.
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
          {league ? (
            <div style={{ display: "flex", fontSize: 28, color: OG.mute, letterSpacing: "0.01em" }}>{league}</div>
          ) : null}

          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 22 }}>
            <Eyebrow>SQUAD VALUE</Eyebrow>
            <BigValue>{fmtMillions(squadValueM)}</BigValue>
          </div>
        </div>
      </OgFrame>
    ),
    { ...size },
  );
}
