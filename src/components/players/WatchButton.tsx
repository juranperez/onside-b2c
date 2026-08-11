"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bookmark, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/db/supabase-browser";
import { toggleWatch } from "@/lib/watchlist/actions";

type State = "loading" | "out" | "off" | "on";
const cls = "inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-medium transition cursor-pointer";

/**
 * Watch toggle. Reads state client-side (so the player page stays statically
 * cached while the button remains personalised), but WRITES through the server
 * action.
 *
 * The write used to go straight to Supabase from the browser, which meant the
 * paid watchlist cap could be sidestepped entirely by calling the table directly.
 * A limit someone pays to remove has to be enforced somewhere the user does not
 * control.
 */
export function WatchButton({ playerId }: { playerId: string }) {
  const [sb] = useState(() => createClient());
  const [state, setState] = useState<State>("loading");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      const {
        data: { user },
      } = await sb.auth.getUser();
      if (!user) return void (active && setState("out"));
      const { data } = await sb
        .from("watchlist_items")
        .select("player_id")
        .eq("player_id", playerId)
        .eq("profile_id", user.id)
        .maybeSingle();
      if (active) setState(data ? "on" : "off");
    })();
    return () => {
      active = false;
    };
  }, [sb, playerId]);

  async function toggle() {
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) return;
    const prev = state;
    setState(prev === "on" ? "off" : "on"); // optimistic
    const res = await toggleWatch(playerId);
    if ("error" in res) {
      setState(prev); // roll back, then surface why (e.g. the tier cap)
      setNotice(res.error === "not-signed-in" ? "" : res.error);
      return;
    }
    setNotice("");
    setState(res.watched ? "on" : "off");
  }

  if (state === "out") {
    return (
      <Link href="/login" className={cn(cls, "bg-overlay/5 border border-line text-mute hover:text-fg")}>
        <Bookmark size={13} /> Watch
      </Link>
    );
  }
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        onClick={toggle}
        disabled={state === "loading"}
        className={cn(cls, state === "on" ? "bg-acc text-ink-950" : "bg-overlay/5 border border-line text-mute hover:text-fg")}
      >
        {state === "on" ? <Check size={13} /> : <Bookmark size={13} />}
        {state === "on" ? "Watching" : "Watch"}
      </button>
      {notice && (
        <span className="text-[11px] text-mute-soft max-w-[220px] leading-snug">
          {notice}{" "}
          <Link href="/pricing" className="text-acc hover:underline">
            See plans
          </Link>
        </span>
      )}
    </span>
  );
}
