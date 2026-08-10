import { ImageResponse } from "next/og";
import { getPublicProfile } from "@/lib/profiles/queries";
import { getReputation } from "@/lib/receipts/queries";
import { OG, OG_SIZE, OG_CONTENT_TYPE, OgFrame, Eyebrow, BigValue } from "@/lib/og";

export const runtime = "nodejs";
export const alt = "Onside — transfer calls";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({ params }: { params: Promise<{ username: string }> }) {
  // Share-image generation must never throw — there is no "retry as 500" for an <img>
  // tag. Any failure at all (unclaimed handle, or a genuine read error) falls through to
  // the generic branded card below instead of breaking the share preview.
  let username: string | null = null;
  let wins = 0;
  let losses = 0;
  let accuracyPct: number | null = null;
  let streak = 0;

  try {
    const { username: handle } = await params;
    const profile = await getPublicProfile(handle);
    if (profile) {
      username = profile.username;
      const rep = await getReputation(profile.id);
      wins = rep.wins;
      losses = rep.losses;
      accuracyPct = rep.accuracyPct;
      streak = rep.streak;
    }
  } catch {
    username = null;
  }

  if (!username) {
    return new ImageResponse(
      (
        <OgFrame>
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <Eyebrow>TRANSFER CALLS</Eyebrow>
            <div
              style={{
                display: "flex",
                fontSize: 76,
                fontWeight: 800,
                letterSpacing: "-0.045em",
                lineHeight: 1.04,
                color: OG.white,
              }}
            >
              Every call, on the record.
            </div>
          </div>
        </OgFrame>
      ),
      { ...size },
    );
  }

  const scored = wins + losses;

  return new ImageResponse(
    (
      <OgFrame>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Eyebrow>TRANSFER CALLS</Eyebrow>
          <div
            style={{
              display: "flex",
              fontSize: 68,
              fontWeight: 800,
              letterSpacing: "-0.035em",
              color: OG.white,
            }}
          >
            @{username}
          </div>

          {scored > 0 ? (
            <div style={{ display: "flex", alignItems: "flex-end", gap: 24, marginTop: 22 }}>
              <BigValue>{`${wins}–${losses}`}</BigValue>
              {accuracyPct != null && (
                <div style={{ display: "flex", fontSize: 30, color: OG.mute, marginBottom: 18 }}>
                  {accuracyPct}% called right
                </div>
              )}
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                fontSize: 42,
                fontWeight: 700,
                color: OG.mute,
                marginTop: 22,
              }}
            >
              Calls locked. Nothing settled yet.
            </div>
          )}

          {streak > 0 && (
            <div
              style={{
                display: "flex",
                fontSize: 26,
                fontWeight: 700,
                color: OG.acc,
                marginTop: 20,
              }}
            >
              {`W${streak} streak`}
            </div>
          )}
        </div>
      </OgFrame>
    ),
    { ...size },
  );
}
