import { cn } from "@/lib/utils";
import { feeVerdict, type FeeTone } from "@/lib/rumours/fee-verdict";

const BAR: Record<FeeTone, string> = { up: "bg-up", acc: "bg-acc", down: "bg-down" };
const TEXT: Record<FeeTone, string> = { up: "text-up", acc: "text-acc", down: "text-down" };

/** Reported fee vs the live Onside valuation, as comparable bars + a plain verdict. */
export function FeeValueBar({ feeM, valueM }: { feeM: number | null; valueM: number }) {
  if (valueM <= 0) return null;
  const verdict = feeVerdict(feeM, valueM);
  const max = Math.max(valueM, feeM ?? 0, 1);
  const valuePct = Math.round((valueM / max) * 100);
  const feePct = feeM == null ? 0 : Math.round((feeM / max) * 100);

  return (
    <div className="space-y-2.5">
      <div>
        <div className="flex items-center justify-between text-[11px] mb-1">
          <span className="text-mute">Onside value</span>
          <span className="num font-semibold">€{valueM}M</span>
        </div>
        <div className="h-2 rounded-full bg-ink-700 overflow-hidden">
          <div className="h-full rounded-full bg-overlay/25" style={{ width: `${valuePct}%` }} />
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between text-[11px] mb-1">
          <span className="text-mute">Reported fee</span>
          <span className="num font-semibold">{feeM == null ? "—" : feeM === 0 ? "Free" : `€${feeM}M`}</span>
        </div>
        <div className="h-2 rounded-full bg-ink-700 overflow-hidden">
          <div
            className={cn("h-full rounded-full", verdict ? BAR[verdict.tone] : "bg-overlay/25")}
            style={{ width: `${feePct}%` }}
          />
        </div>
      </div>
      <p className="text-[11.5px]">
        {verdict ? (
          <span className={cn("font-semibold", TEXT[verdict.tone])}>{verdict.label}</span>
        ) : (
          <span className="text-mute-soft">No fee reported yet — Onside values €{valueM}M.</span>
        )}
      </p>
    </div>
  );
}
