import { cn } from "@/lib/utils";

type ChipTone = "neutral" | "up" | "down" | "acc" | "solid";

interface ChipProps {
  children: React.ReactNode;
  className?: string;
  tone?: ChipTone;
  icon?: React.ReactNode;
}

const tones: Record<ChipTone, string> = {
  neutral: "bg-overlay/5 text-mute border-line/60 border",
  up: "bg-up/10 text-up border-up/20 border",
  down: "bg-down/10 text-down border-down/20 border",
  acc: "bg-acc/10 text-acc border-acc/20 border",
  solid: "bg-ink-700 text-fg border-line border",
};

export function Chip({ children, className, tone = "neutral", icon }: ChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium tracking-tight",
        tones[tone],
        className
      )}
    >
      {icon}
      {children}
    </span>
  );
}
