"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { Sparkles, SendHorizontal, LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Source {
  label: string;
  href: string;
}

interface Msg {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
}

const ERROR_COPY: Record<string, string> = {
  "rate-limited": "Easy — you've hit the rate limit. Give it a minute and ask again.",
  "not-configured": "Onside AI is warming up. Check back shortly.",
  "sign-in-required": "Your session expired — sign in again to keep asking.",
  default: "Something slipped. Ask again in a moment.",
};

export function AskChat({ suggestions }: { suggestions: string[] }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    setInput("");
    setBusy(true);

    const history: Msg[] = [...messages, { role: "user", content: q }];
    setMessages([...history, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history.map(({ role, content }) => ({ role, content })) }),
      });

      if (!res.ok) {
        let code = "default";
        try {
          code = ((await res.json()) as { error?: string }).error ?? "default";
        } catch {
          // non-JSON error body — keep default copy
        }
        setMessages([...history, { role: "assistant", content: ERROR_COPY[code] ?? ERROR_COPY.default }]);
        return;
      }

      let sources: Source[] = [];
      try {
        sources = JSON.parse(decodeURIComponent(res.headers.get("X-Ask-Sources") ?? "%5B%5D")) as Source[];
      } catch {
        sources = [];
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        // Models drift into markdown despite instructions — render plain.
        const snapshot = acc.replace(/\*\*/g, "").replace(/^#+\s/gm, "");
        setMessages([...history, { role: "assistant", content: snapshot, sources }]);
      }
      if (!acc.trim()) {
        setMessages([...history, { role: "assistant", content: ERROR_COPY.default }]);
      }
    } catch {
      setMessages([...history, { role: "assistant", content: ERROR_COPY.default }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col">
      <div className="space-y-4 min-h-[280px]">
        {messages.length === 0 && (
          <div className="rounded-2xl border border-line bg-ink-850 shadow-soft p-6">
            <p className="text-[13px] text-mute mb-4">
              Try one of these — or ask about any player, club, or nation by name.
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border border-line bg-overlay/5 px-3 py-1.5 text-[12px] text-fg hover:border-acc/40 hover:text-acc transition cursor-pointer"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            {m.role === "user" ? (
              <div className="max-w-[85%] rounded-2xl rounded-br-md bg-acc/10 border border-acc/20 px-4 py-2.5 text-[13.5px] leading-relaxed">
                {m.content}
              </div>
            ) : (
              <div className="max-w-[92%] rounded-2xl rounded-bl-md bg-ink-850 border border-line shadow-soft px-4 py-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Sparkles size={11} className="text-acc" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-mute">Onside AI</span>
                </div>
                <div className="text-[13.5px] leading-relaxed whitespace-pre-wrap">
                  {m.content || (
                    <span className="inline-flex items-center gap-2 text-mute">
                      <LoaderCircle size={13} className="animate-spin" /> reading the data…
                    </span>
                  )}
                </div>
                {m.content && (m.sources?.length ?? 0) > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3 pt-2.5 border-t border-line/60">
                    {m.sources!.map((s) => (
                      <Link
                        key={s.href}
                        href={s.href}
                        className="rounded-full border border-line bg-overlay/5 px-2.5 py-1 text-[11px] text-mute hover:text-acc hover:border-acc/40 transition"
                      >
                        {s.label} →
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="sticky bottom-4 mt-6"
      >
        <div className="flex items-center gap-2 rounded-2xl border border-line bg-ink-850 shadow-soft px-4 py-2 focus-within:border-mute transition">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about any player, rumour, or tonight's match…"
            maxLength={500}
            aria-label="Ask Onside a question"
            className="flex-1 bg-transparent outline-none text-[13.5px] py-1.5 placeholder:text-mute-soft"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            aria-label="Send"
            className={cn(
              "shrink-0 w-8 h-8 rounded-lg grid place-items-center transition",
              busy || !input.trim() ? "bg-overlay/5 text-mute-soft" : "bg-acc text-ink-950 hover:bg-acc/90 cursor-pointer",
            )}
          >
            {busy ? <LoaderCircle size={14} className="animate-spin" /> : <SendHorizontal size={14} />}
          </button>
        </div>
        <p className="text-center text-[10.5px] text-mute-soft mt-2.5">
          Onside estimates and forecasts — for fans, not betting advice.
        </p>
      </form>
    </div>
  );
}
