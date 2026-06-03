/**
 * Onside brand mark — a ring bisected by a signal-green eye-line (the monogram "O").
 * The ring inherits `currentColor` so it adapts to light/dark; the line is brand green.
 */
export function OnsideMark({ size = 24, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <circle cx="16" cy="16" r="12.6" stroke="currentColor" strokeWidth="2.3" />
      <line
        x1="3.4"
        y1="16"
        x2="28.6"
        y2="16"
        stroke="#00E599"
        strokeWidth="2.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Full lockup: mark + wordmark. */
export function OnsideLogo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <OnsideMark size={22} />
      <span className="text-[15px] font-bold tracking-[-0.03em]">
        ON<span className="text-mute">/</span>SIDE
      </span>
    </span>
  );
}
