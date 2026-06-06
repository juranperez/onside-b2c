// Performance radar — 6-axis profile from real Sportmonks per-90/% data
// (player_stats.advanced). Pure SVG, server-rendered, theme-aware.

const AXES = [
  { key: "xg_p90", label: "Goal threat", cap: 1.0, fmt: (v: number) => v.toFixed(2) },
  { key: "chances_p90", label: "Creativity", cap: 3.0, fmt: (v: number) => v.toFixed(1) },
  { key: "dribbles_p90", label: "Dribbling", cap: 4.0, fmt: (v: number) => v.toFixed(1) },
  { key: "pass_accuracy_pct", label: "Passing", cap: 100, fmt: (v: number) => `${Math.round(v)}%` },
  { key: "aerials_won_pct", label: "Aerial", cap: 100, fmt: (v: number) => `${Math.round(v)}%` },
  { key: "recoveries_p90", label: "Defending", cap: 12, fmt: (v: number) => v.toFixed(1) },
] as const;

/** Legend rows (label + formatted value) so the card text matches the chart. */
export function radarRows(radar: Record<string, number>) {
  return AXES.map((ax) => ({ label: ax.label, display: ax.fmt(radar[ax.key] ?? 0) }));
}

export function PerformanceRadar({ radar, size = 224 }: { radar: Record<string, number>; size?: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 - 36;
  const pt = (i: number, n: number): [number, number] => {
    const a = (-90 + i * 60) * (Math.PI / 180);
    return [cx + R * n * Math.cos(a), cy + R * n * Math.sin(a)];
  };
  const vals = AXES.map((ax) => Math.max(0, Math.min(1, (radar[ax.key] ?? 0) / ax.cap)));
  const poly = vals.map((n, i) => pt(i, n).join(",")).join(" ");

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="shrink-0" role="img" aria-label="Performance radar">
      {[0.25, 0.5, 0.75, 1].map((r, ri, arr) => (
        <polygon
          key={r}
          points={AXES.map((_, i) => pt(i, r).join(",")).join(" ")}
          fill="none"
          stroke="var(--color-line)"
          strokeWidth={1}
          opacity={ri === arr.length - 1 ? 0.65 : 0.3}
        />
      ))}
      {AXES.map((_, i) => {
        const [x, y] = pt(i, 1);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--color-line)" strokeWidth={1} opacity={0.25} />;
      })}
      <polygon points={poly} fill="var(--color-up)" fillOpacity={0.16} stroke="var(--color-up)" strokeWidth={2} strokeLinejoin="round" />
      {vals.map((n, i) => {
        const [x, y] = pt(i, n);
        return <circle key={i} cx={x} cy={y} r={2.6} fill="var(--color-up)" />;
      })}
      {AXES.map((ax, i) => {
        const a = (-90 + i * 60) * (Math.PI / 180);
        const lx = cx + (R + 17) * Math.cos(a);
        const ly = cy + (R + 17) * Math.sin(a);
        const anchor = Math.abs(Math.cos(a)) < 0.3 ? "middle" : Math.cos(a) > 0 ? "start" : "end";
        return (
          <text key={ax.key} x={lx} y={ly} textAnchor={anchor} dominantBaseline="middle" fill="var(--color-mute-soft)" style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.02em" }}>
            {ax.label}
          </text>
        );
      })}
    </svg>
  );
}
