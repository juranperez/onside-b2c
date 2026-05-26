import { cn } from "@/lib/utils";
import { Sparkles, Lock } from "lucide-react";

type Tier = "Free" | "Plus" | "Pro";

const tierStyles: Record<Tier, string> = {
  Free: "bg-ink-700 text-mute",
  Plus: "bg-white/8 text-white border border-white/10",
  Pro: "bg-acc text-ink-900",
};

export function TierPill({ tier = "Plus", size = "sm" }: { tier?: Tier; size?: "sm" | "md" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-semibold tracking-tight",
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
        tierStyles[tier]
      )}
    >
      {tier === "Pro" && <Sparkles size={11} strokeWidth={2.4} />}
      ONSIDE {tier}
    </span>
  );
}

export function LockPill({ children = "Pro" }: { children?: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-acc/10 text-acc border border-acc/30 px-2 py-0.5 text-[10px] font-semibold tracking-tight">
      <Lock size={10} strokeWidth={2.4} /> {children}
    </span>
  );
}
