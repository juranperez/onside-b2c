import { cn } from "@/lib/utils";

/** The Onside Confidence % — colour-coded by band (green ≥70, amber 40–69, red <40). */
export function ConfidenceBadge({
  pct,
  band,
  big = false,
}: {
  pct: number;
  band: "high" | "medium" | "low";
  big?: boolean;
}) {
  const tone =
    band === "high"
      ? "text-up border-up/30 bg-up/10"
      : band === "medium"
        ? "text-acc border-acc/30 bg-acc/10"
        : "text-down border-down/30 bg-down/10";

  if (big) {
    return (
      <div className={cn("flex flex-col items-center justify-center rounded-xl border shrink-0", tone)} style={{ width: 60, height: 60 }}>
        <span className="num text-[19px] font-bold leading-none tabular-nums">{pct}</span>
        <span className="text-[8px] uppercase tracking-[0.12em] mt-0.5 opacity-75">conf %</span>
      </div>
    );
  }
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-semibold num", tone)}>
      {pct}% conf
    </span>
  );
}
