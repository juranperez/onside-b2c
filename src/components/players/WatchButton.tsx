"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bookmark, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/db/supabase-browser";

type State = "loading" | "out" | "off" | "on";
const cls = "inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-medium transition cursor-pointer";

/**
 * Fully client-side watch toggle (browser Supabase client + RLS), so the player
 * profile page stays statically cached while the button is still personalized.
 */
export function WatchButton({ playerId }: { playerId: string }) {
  const [sb] = useState(() => createClient());
  const [state, setState] = useState<State>("loading");

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
    if (state === "on") {
      await sb.from("watchlist_items").delete().eq("player_id", playerId).eq("profile_id", user.id);
      setState("off");
    } else {
      await sb.from("watchlist_items").insert({ player_id: playerId, profile_id: user.id });
      setState("on");
    }
  }

  if (state === "out") {
    return (
      <Link href="/login" className={cn(cls, "bg-overlay/5 border border-line text-mute hover:text-fg")}>
        <Bookmark size={13} /> Watch
      </Link>
    );
  }
  return (
    <button
      onClick={toggle}
      disabled={state === "loading"}
      className={cn(cls, state === "on" ? "bg-acc text-ink-950" : "bg-overlay/5 border border-line text-mute hover:text-fg")}
    >
      {state === "on" ? <Check size={13} /> : <Bookmark size={13} />}
      {state === "on" ? "Watching" : "Watch"}
    </button>
  );
}
