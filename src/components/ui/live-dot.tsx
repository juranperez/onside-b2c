export function LiveDot({ color = "#00E599" }: { color?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-mute">
      <span className="relative w-1.5 h-1.5">
        <span className="absolute inset-0 rounded-full" style={{ background: color, opacity: 0.5 }} />
        <span className="absolute inset-0 rounded-full pulse-dot" style={{ background: color }} />
      </span>
      LIVE
    </span>
  );
}
