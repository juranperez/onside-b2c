"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Search, ShieldCheck, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface LeagueOpt {
  slug: string;
  name: string;
}

const STATUSES = [
  { key: "", label: "All" },
  { key: "rumour", label: "Live rumours" },
  { key: "confirmed", label: "Done deals" },
  { key: "dead", label: "Dead" },
] as const;

/** URL-driven filters: every combination is shareable and crawlable. */
export function FilterRail({ leagues }: { leagues: LeagueOpt[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const [, startTransition] = useTransition();
  const [club, setClub] = useState(params.get("club") ?? "");
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    startTransition(() => router.replace(`/transfers${next.size ? `?${next}` : ""}`, { scroll: false }));
  };

  // Debounced club search → URL.
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      if ((params.get("club") ?? "") !== club) setParam("club", club || null);
    }, 350);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [club]);

  const status = params.get("status") ?? "";
  const league = params.get("league") ?? "";
  const credible = params.get("min") === "70";
  const hasFilters = Boolean(status || league || credible || (params.get("club") ?? ""));

  return (
    <div className="space-y-2.5 mb-5">
      <div className="flex items-center gap-2 flex-wrap">
        {STATUSES.map((s) => (
          <button
            key={s.key}
            onClick={() => setParam("status", s.key || null)}
            className={cn(
              "h-7 px-3 rounded-full text-[12px] font-medium transition cursor-pointer border",
              status === s.key ? "bg-acc text-ink-950 border-acc" : "bg-overlay/5 text-mute border-line hover:text-fg",
            )}
          >
            {s.label}
          </button>
        ))}

        <button
          onClick={() => setParam("min", credible ? null : "70")}
          className={cn(
            "h-7 px-3 rounded-full text-[12px] font-medium transition cursor-pointer border inline-flex items-center gap-1.5",
            credible ? "bg-up/15 text-up border-up/30" : "bg-overlay/5 text-mute border-line hover:text-fg",
          )}
        >
          <ShieldCheck size={12} /> Credible only
        </button>

        <div className="flex items-center gap-2 h-7 px-3 rounded-full bg-overlay/5 border border-line focus-within:border-mute transition min-w-[180px]">
          <Search size={12} className="text-mute-soft shrink-0" />
          <input
            value={club}
            onChange={(e) => setClub(e.target.value)}
            placeholder="Filter by club…"
            aria-label="Filter rumours by club"
            className="w-full bg-transparent outline-none text-[12px] placeholder:text-mute-soft"
          />
          {club && (
            <button onClick={() => setClub("")} aria-label="Clear club filter" className="text-mute-soft hover:text-fg cursor-pointer">
              <X size={11} />
            </button>
          )}
        </div>

        {hasFilters && (
          <button
            onClick={() => {
              setClub("");
              startTransition(() => router.replace("/transfers", { scroll: false }));
            }}
            className="text-[11px] text-mute-soft hover:text-fg transition cursor-pointer"
          >
            Clear all
          </button>
        )}
      </div>

      {leagues.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {leagues.map((l) => (
            <button
              key={l.slug}
              onClick={() => setParam("league", league === l.slug ? null : l.slug)}
              className={cn(
                "h-6 px-2.5 rounded-full text-[11px] transition cursor-pointer border",
                league === l.slug ? "bg-acc/15 text-acc border-acc/30 font-semibold" : "bg-transparent text-mute-soft border-line/60 hover:text-fg",
              )}
            >
              {l.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
