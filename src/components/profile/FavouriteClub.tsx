"use client";

import { useActionState } from "react";
import { setFavouriteClub, type ProfileActionState } from "@/lib/profiles/actions";

/**
 * Favourite club — free text, matching the club names carried on rumours.
 *
 * Freely changeable, unlike the handle: nothing links to it, so there is no shared
 * artefact to break. The action rejects anything over 80 characters rather than
 * truncating, because this renders publicly next to the handle and a silent cut can
 * land mid-character; asking again costs the user nothing on a field they can edit.
 */
export function FavouriteClub({ current }: { current: string | null }) {
  const [state, formAction, pending] = useActionState<ProfileActionState, FormData>(setFavouriteClub, {});

  return (
    <form action={formAction} className="mb-8 flex items-center gap-2 flex-wrap">
      <label htmlFor="favourite_club" className="text-[12px] text-mute-soft shrink-0">
        Your club
      </label>
      <input
        id="favourite_club"
        name="favourite_club"
        defaultValue={current ?? ""}
        maxLength={80}
        autoComplete="off"
        placeholder="e.g. Manchester United"
        className="h-9 px-3 rounded-lg bg-ink-800 border border-line text-[13px] outline-none focus:border-mute transition w-[220px]"
      />
      <button
        disabled={pending}
        className="h-9 px-3 rounded-lg border border-line text-[12px] font-semibold text-mute hover:text-fg disabled:opacity-60 cursor-pointer"
      >
        {pending ? "Saving…" : "Save"}
      </button>
      {state.ok && <span className="text-[12px] text-up">Saved</span>}
      {state.error && <span className="text-[12px] text-down">{state.error}</span>}
    </form>
  );
}
