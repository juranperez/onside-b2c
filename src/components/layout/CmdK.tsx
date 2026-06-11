"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, User, Shield, Trophy, CornerDownLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface Hit {
  slug: string;
  name: string;
  sub: string;
}
interface Results {
  players: Hit[];
  clubs: Hit[];
  leagues: Hit[];
}

const EMPTY: Results = { players: [], clubs: [], leagues: [] };

/** ⌘K command palette — search everything, jump anywhere. */
export function CmdK() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Results>(EMPTY);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  const close = useCallback(() => {
    setOpen(false);
    setQ("");
    setResults(EMPTY);
  }, []);

  const onQuery = useCallback((value: string) => {
    setQ(value);
    if (debounce.current) clearTimeout(debounce.current);
    const term = value.trim();
    if (term.length < 2) {
      setResults(EMPTY);
      return;
    }
    debounce.current = setTimeout(async () => {
      setBusy(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`);
        if (res.ok) setResults((await res.json()) as Results);
      } catch {
        // type-ahead is best-effort
      } finally {
        setBusy(false);
      }
    }, 220);
  }, []);

  // Global shortcut — event callbacks, not effect-body state writes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => {
          if (v) {
            setQ("");
            setResults(EMPTY);
          }
          return !v;
        });
      }
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  // Focus when opened (DOM side-effect only).
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
  }, [open]);

  const go = useCallback(
    (href: string) => {
      close();
      router.push(href);
    },
    [router, close],
  );

  if (!open) return null;

  const groups: { label: string; icon: React.ReactNode; hits: Hit[]; href: (h: Hit) => string }[] = [
    { label: "Players", icon: <User size={12} />, hits: results.players, href: (h) => `/players/${h.slug}` },
    { label: "Clubs", icon: <Shield size={12} />, hits: results.clubs, href: (h) => `/clubs/${h.slug}` },
    { label: "Leagues", icon: <Trophy size={12} />, hits: results.leagues, href: (h) => `/leagues/${h.slug}` },
  ];
  const first = groups.find((g) => g.hits.length > 0);

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4" role="dialog" aria-modal="true">
      <button aria-label="Close search" className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm cursor-default" onClick={close} />
      <div className="relative w-full max-w-[560px] rounded-2xl bg-ink-850 border border-line shadow-soft overflow-hidden">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (first?.hits[0]) go(first.href(first.hits[0]));
          }}
          className="flex items-center gap-3 px-4 py-3.5 border-b border-line"
        >
          <Search size={15} className={cn("shrink-0", busy ? "text-acc animate-pulse" : "text-mute-soft")} />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Search players, clubs, leagues…"
            aria-label="Search"
            className="flex-1 bg-transparent outline-none text-[14px] placeholder:text-mute-soft"
          />
          <kbd className="text-[10px] num text-mute-soft border border-line rounded px-1.5 py-0.5">esc</kbd>
        </form>

        <div className="max-h-[50vh] overflow-y-auto">
          {q.trim().length >= 2 && !busy && groups.every((g) => g.hits.length === 0) && (
            <div className="px-4 py-8 text-center text-[13px] text-mute">Nothing matches &ldquo;{q}&rdquo;</div>
          )}
          {groups.map(
            (g) =>
              g.hits.length > 0 && (
                <div key={g.label}>
                  <div className="px-4 pt-3 pb-1.5 text-[10px] uppercase tracking-wider text-mute-soft num flex items-center gap-1.5">
                    {g.icon} {g.label}
                  </div>
                  {g.hits.map((h, i) => (
                    <button
                      key={h.slug}
                      onClick={() => go(g.href(h))}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-overlay/[0.05] transition text-left cursor-pointer"
                    >
                      <span className="text-[13.5px] font-medium flex-1 truncate">{h.name}</span>
                      <span className="text-[11px] text-mute-soft truncate max-w-[200px]">{h.sub}</span>
                      {g === first && i === 0 && <CornerDownLeft size={11} className="text-mute-soft shrink-0" />}
                    </button>
                  ))}
                </div>
              ),
          )}
        </div>
      </div>
    </div>
  );
}
