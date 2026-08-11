"use client";

import { useActionState } from "react";
import { addRumour, type RumourActionState } from "@/lib/rumours/actions";

const field = "w-full h-10 px-3 rounded-lg bg-ink-800 border border-line text-[13px] outline-none focus:border-mute transition";

export function RumourForm() {
  const [state, action, pending] = useActionState<RumourActionState, FormData>(addRumour, {});

  return (
    <form action={action} className="space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <input name="player" placeholder="Player name (e.g. Bruno Guimarães)" className={field} required />
        <input name="to_club" placeholder="Destination club" className={field} required />
        <input name="fee" type="number" step="0.1" min="0" placeholder="Reported fee (€M, optional)" className={field} />
        <input name="source" placeholder="Source — journalist / outlet" className={field} required />
        <select name="tier" defaultValue="1" className={field}>
          <option value="1">Tier 1 — top journalist</option>
          <option value="2">Tier 2 — established reporter</option>
          <option value="3">Tier 3 — outlet / regional</option>
          <option value="4">Tier 4 — secondary signal</option>
        </select>
        <input name="corroborations" type="number" min="1" defaultValue="1" placeholder="Independent sources" className={field} />
        <select name="status" defaultValue="rumour" className={field}>
          <option value="rumour">Rumour</option>
          <option value="confirmed">Confirmed</option>
          <option value="dead">Dead</option>
        </select>
        <input name="url" placeholder="Source URL (optional)" className={field} />
      </div>
      <textarea
        name="summary"
        placeholder="One-line plain-English summary…"
        rows={2}
        className="w-full px-3 py-2 rounded-lg bg-ink-800 border border-line text-[13px] outline-none focus:border-mute transition"
        required
      />
      <div className="flex items-center gap-3">
        <button
          disabled={pending}
          className="h-9 px-4 rounded-lg bg-acc text-ink-900 text-[13px] font-semibold disabled:opacity-60 cursor-pointer"
        >
          {pending ? "Adding…" : "Add rumour"}
        </button>
        {state.error && <span className="text-[12px] text-down">{state.error}</span>}
        {state.ok && <span className="text-[12px] text-up">{state.message}</span>}
      </div>
    </form>
  );
}
