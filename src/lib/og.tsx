/**
 * Shared frame + primitives for Onside Open Graph share cards.
 *
 * Everything here is consumed by the `opengraph-image.tsx` routes and rendered
 * through `next/og`'s Satori engine — so: inline styles only, flexbox only,
 * default sans font, and every flex container gets an explicit `display: "flex"`.
 */

// ─────────────────────────── Brand tokens ───────────────────────────

export const OG = {
  ink: "#070708",
  ink900: "#0A0A0B",
  ink800: "#141417",
  line: "#27272A",
  up: "#00E599",
  acc: "#E8FF5A",
  white: "#FFFFFF",
  cream: "#F4F4F2",
  mute: "#8A8A93",
  muteSoft: "#5C5C64",
} as const;

export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CONTENT_TYPE = "image/png";

const DOMAIN = "onsidemarket.com";

// ─────────────────────────── Value formatting ───────────────────────────

/** Format a euro amount (in EUR) as the big headline number, e.g. €182.4M. */
export function fmtEur(valueEur: number): string {
  const m = (Number.isFinite(valueEur) ? valueEur : 0) / 1e6;
  return fmtMillions(m);
}

/** Format a value already expressed in millions of euros, e.g. 1240 -> €1.24B. */
export function fmtMillions(m: number): string {
  const v = Number.isFinite(m) ? m : 0;
  if (v >= 1000) return `€${(v / 1000).toFixed(2)}B`;
  return `€${v.toFixed(1)}M`;
}

// ─────────────────────────── Onside mark ───────────────────────────

/**
 * The Onside mark: a ring with a horizontal green offside line through it.
 * Drawn with inline SVG so it renders crisply at any scale in Satori.
 */
export function OnsideMark({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" style={{ display: "flex" }}>
      <circle cx="28" cy="28" r="25" fill="none" stroke={OG.white} strokeOpacity="0.16" strokeWidth="2" />
      <circle cx="28" cy="28" r="25" fill="none" stroke={OG.up} strokeWidth="2.5" strokeDasharray="44 200" strokeLinecap="round" transform="rotate(-38 28 28)" />
      <rect x="2" y="26" width="52" height="4" rx="2" fill={OG.up} />
      <circle cx="28" cy="28" r="5.5" fill={OG.ink} stroke={OG.up} strokeWidth="2.5" />
    </svg>
  );
}

/** Mark + "Onside." wordmark lockup for the card header. */
export function Wordmark({ markSize = 52 }: { markSize?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      <OnsideMark size={markSize} />
      <div style={{ display: "flex", fontSize: 40, fontWeight: 800, letterSpacing: "-0.04em", color: OG.white }}>
        Onside
        <span style={{ color: OG.up }}>.</span>
      </div>
    </div>
  );
}

// ─────────────────────────── Card frame ───────────────────────────

/**
 * The shared premium frame: dark ink background, ambient green glow, a faint
 * grid, generous padding, a header lockup, the slotted body, and the footer.
 */
export function OgFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        padding: 72,
        backgroundColor: OG.ink900,
        backgroundImage: `radial-gradient(900px 520px at 100% -10%, rgba(0,229,153,0.16), transparent 60%), radial-gradient(700px 460px at -10% 110%, rgba(232,255,90,0.07), transparent 55%)`,
        color: OG.white,
        fontFamily: "sans-serif",
      }}
    >
      {/* faint grid texture */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />
      {/* top accent hairline */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 5, display: "flex", backgroundColor: OG.up }} />

      {/* header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative" }}>
        <Wordmark />
        <div style={{ display: "flex", fontSize: 19, color: OG.muteSoft, letterSpacing: "0.02em" }}>{DOMAIN}</div>
      </div>

      {/* body */}
      <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center", position: "relative" }}>
        {children}
      </div>

      {/* footer */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative" }}>
        <div style={{ display: "flex", fontSize: 18, color: OG.mute, letterSpacing: "0.02em" }}>
          Every player. Every valuation. Live.
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: 4, display: "flex", backgroundColor: OG.up }} />
          <div style={{ display: "flex", fontSize: 16, color: OG.muteSoft, letterSpacing: "0.18em" }}>LIVE</div>
        </div>
      </div>
    </div>
  );
}

/** Small uppercase eyebrow label used above the big value. */
export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", fontSize: 22, fontWeight: 600, letterSpacing: "0.22em", color: OG.muteSoft }}>
      {children}
    </div>
  );
}

/** The big green valuation number. */
export function BigValue({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        fontSize: 132,
        fontWeight: 800,
        letterSpacing: "-0.05em",
        lineHeight: 1,
        color: OG.up,
      }}
    >
      {children}
    </div>
  );
}
