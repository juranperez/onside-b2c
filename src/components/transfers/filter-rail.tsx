"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Search, X, Bookmark, SlidersHorizontal, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface LeagueOpt {
  slug: string;
  name: string;
}

/**
 * URL-driven filters: every combination is shareable and crawlable.
 *
 * Grouped into WHAT (status, stage), WHO (club, league, mine) and HOW MUCH
 * (fee, confidence, our fee-vs-value read) rather than one flat row of chips
 * where nothing reads as more important than anything else. The money filters
 * are deliberately prominent — "only show me overpays" is a question our data
 * can answer and a rumour aggregator cannot.
 */
const STATUSES = [
  { key: "", label: "All" },
  { key: "rumour", label: "Live" },
  { key: "confirmed", label: "Done" },
  { key: "dead", label: "Dead" },
] as const;

const STAGES = ["Linked", "Talks", "Bid", "Agreed", "Medical", "Done"] as const;

const VERDICTS = [
  { key: "bargain", label: "Bargain" },
  { key: "fair", label: "Fair" },
  { key: "above", label: "Above value" },
  { key: "overpay", label: "Overpay" },
] as const;

const FEES = [
  { key: "10", label: "€10m+" },
  { key: "25", label: "€25m+" },
  { key: "50", label: "€50m+" },
  { key: "100", label: "€100m+" },
] as const;

const CONFS = [
  { key: "50", label: "50%+" },
  { key: "70", label: "70%+" },
  { key: "90", label: "90%+" },
] as const;

const SORTS = [
  { key: "", label: "Newest" },
  { key: "conf", label: "Confidence" },
  { key: "fee", label: "Fee" },
  { key: "value", label: "Player value" },
] as const;

function Chip({
  active,
  onClick,
  children,
  size = "md",
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  size?: "sm" | "md";
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full font-medium transition cursor-pointer border inline-flex items-center gap-1.5",
        size === "md" ? "h-7 px-3 text-[12px]" : "h-6 px-2.5 text-[11px]",
        active ? "bg-acc text-ink-950 border-acc" : "bg-overlay/5 text-mute border-line hover:text-fg",
      )}
    >
      {children}
    </button>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="text-[10px] uppercase tracking-[0.14em] text-mute-soft num pt-1.5 w-[52px] shrink-0">{label}</span>
      <div className="flex items-center gap-1.5 flex-wrap flex-1">{children}</div>
    </div>
  );
}

export function FilterRail({
  leagues,
  mineAvailable = false,
  resultCount,
}: {
  leagues: LeagueOpt[];
  mineAvailable?: boolean;
  resultCount?: number;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [, startTransition] = useTransition();
  const [club, setClub] = useState(params.get("club") ?? "");
  const [open, setOpen] = useState(false); // mobile: collapse everything past the status row
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    startTransition(() => router.replace(`/transfers${next.size ? `?${next}` : ""}`, { scroll: false }));
  };
  const toggleParam = (key: string, value: string) => setParam(key, params.get(key) === value ? null : value);

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
  const stage = params.get("stage") ?? "";
  const league = params.get("league") ?? "";
  const minFee = params.get("fee") ?? "";
  const minConf = params.get("min") ?? "";
  const verdict = params.get("verdict") ?? "";
  const sort = params.get("sort") ?? "";
  const mine = params.get("mine") === "1";
  const activeCount = ["status", "stage", "league", "club", "fee", "min", "verdict", "mine"].filter((k) =>
    params.get(k),
  ).length;

  return (
    <div className="mb-5">
      {/* Always visible: the primary cut, the result count, and the way in on mobile. */}
      <div className="flex items-center gap-2 flex-wrap">
        {STATUSES.map((s) => (
          <Chip key={s.key} active={status === s.key} onClick={() => setParam("status", s.key || null)}>
            {s.label}
          </Chip>
        ))}

        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className={cn(
            "md:hidden h-7 px-3 rounded-full text-[12px] font-medium transition cursor-pointer border inline-flex items-center gap-1.5",
            open || activeCount ? "bg-acc/15 text-acc border-acc/30" : "bg-overlay/5 text-mute border-line",
          )}
        >
          <SlidersHorizontal size={12} /> Filters{activeCount ? ` · ${activeCount}` : ""}
        </button>

        <span className="ml-auto flex items-center gap-3">
          {resultCount != null && (
            <span className="text-[11.5px] text-mute-soft num">
              {resultCount} {resultCount === 1 ? "deal" : "deals"}
            </span>
          )}
          {activeCount > 0 && (
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
        </span>
      </div>

      <div className={cn("mt-3 space-y-2.5", open ? "block" : "hidden md:block")}>
        <Group label="Stage">
          {STAGES.map((s) => (
            <Chip key={s} size="sm" active={stage === s} onClick={() => toggleParam("stage", s)}>
              {s}
            </Chip>
          ))}
        </Group>

        <Group label="Money">
          {FEES.map((f) => (
            <Chip key={f.key} size="sm" active={minFee === f.key} onClick={() => toggleParam("fee", f.key)}>
              {f.label}
            </Chip>
          ))}
          <span className="w-px h-4 bg-line mx-0.5" />
          {/* The differentiator: filter by OUR read of the fee, not just its size. */}
          {VERDICTS.map((v) => (
            <Chip key={v.key} size="sm" active={verdict === v.key} onClick={() => toggleParam("verdict", v.key)}>
              {v.label}
            </Chip>
          ))}
        </Group>

        <Group label="Trust">
          {CONFS.map((c) => (
            <Chip key={c.key} size="sm" active={minConf === c.key} onClick={() => toggleParam("min", c.key)}>
              {c.label}
            </Chip>
          ))}
        </Group>

        <Group label="Who">
          <div className="flex items-center gap-2 h-6 px-2.5 rounded-full bg-overlay/5 border border-line focus-within:border-mute transition min-w-[170px]">
            <Search size={11} className="text-mute-soft shrink-0" />
            <input
              value={club}
              onChange={(e) => setClub(e.target.value)}
              placeholder="Any club…"
              aria-label="Filter rumours by club"
              className="w-full bg-transparent outline-none text-[11px] placeholder:text-mute-soft"
            />
            {club && (
              <button onClick={() => setClub("")} aria-label="Clear club filter" className="text-mute-soft hover:text-fg cursor-pointer">
                <X size={10} />
              </button>
            )}
          </div>
          {mineAvailable && (
            <Chip size="sm" active={mine} onClick={() => setParam("mine", mine ? null : "1")}>
              <Bookmark size={11} /> My Market
            </Chip>
          )}
          {leagues.map((l) => (
            <Chip key={l.slug} size="sm" active={league === l.slug} onClick={() => toggleParam("league", l.slug)}>
              {l.name}
            </Chip>
          ))}
        </Group>

        <Group label="Sort">
          <ArrowUpDown size={11} className="text-mute-soft" />
          {SORTS.map((s) => (
            <Chip key={s.key} size="sm" active={sort === s.key} onClick={() => setParam("sort", s.key || null)}>
              {s.label}
            </Chip>
          ))}
        </Group>
      </div>
    </div>
  );
}
