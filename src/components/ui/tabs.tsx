"use client";

import { cn } from "@/lib/utils";

interface Tab {
  id: string;
  label: string;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  value: string;
  onChange: (id: string) => void;
  size?: "sm" | "md";
}

export function Tabs({ tabs, value, onChange, size = "md" }: TabsProps) {
  return (
    <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-ink-800 border border-line">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={cn(
            "rounded-lg font-medium transition cursor-pointer",
            size === "sm" ? "h-7 px-2.5 text-xs" : "h-9 px-3 text-sm",
            value === t.id
              ? "bg-ink-700 text-white shadow-sm"
              : "text-mute hover:text-white"
          )}
        >
          {t.label}
          {t.count != null && (
            <span className="ml-1 text-mute-soft num text-[11px]">{t.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}
