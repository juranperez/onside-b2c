"use client";

import { cn } from "@/lib/utils";
import { fmtDelta } from "@/lib/utils";

interface DeltaProps {
  value: number;
  suffix?: string;
  big?: boolean;
}

export function Delta({ value, suffix = "M", big = false }: DeltaProps) {
  const up = value >= 0;
  return (
    <span
      className={cn(
        "num inline-flex items-center gap-1 tracking-tight",
        up ? "text-up" : "text-down",
        big ? "text-base font-semibold" : "text-xs"
      )}
    >
      <span
        className={cn("inline-block", big ? "w-2 h-2" : "w-1.5 h-1.5", up ? "bg-up" : "bg-down")}
        style={{ clipPath: up ? "polygon(50% 0,100% 100%,0 100%)" : "polygon(0 0,100% 0,50% 100%)" }}
      />
      {fmtDelta(value)}{suffix}
    </span>
  );
}
