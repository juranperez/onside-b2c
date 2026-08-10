"use server";

import { revalidatePath } from "next/cache";
import { adminDb } from "@/lib/db/admin";
import { getSessionUser } from "@/lib/db/supabase-server";
import { checkUsername, USERNAME_ERROR_MESSAGE } from "./username";

export type ProfileActionState = { ok?: boolean; error?: string; username?: string };

/** Same fact in both places below: the pre-check refusal and the raced write. */
const ALREADY_CLAIMED = "Your handle is already set and can't be changed.";

/**
 * Claim a permanent handle.
 *
 * Permanent by product decision (no rename, no redirect table — see username.ts), so
 * this only ever moves a row from username = null to a value, once. It must never
 * *update* an already-claimed row: migration 0005's `profiles_username_permanent`
 * trigger raises a plpgsql exception on exactly that, even from this service-role
 * client, and that raw exception text ("profiles: username is permanent once claimed")
 * is not user-facing copy — nothing below should let it reach the caller.
 *
 * Two different races are in play, and they're closed two different ways:
 *  - Two accounts claim the same string. The pre-checks below can't see each other
 *    (TOCTOU), so the real guard is the unique index on lower(username) — whichever
 *    write loses gets 23505, mapped to a friendly message.
 *  - The same account submits twice (double click, two tabs) before the first write
 *    lands. `.is("username", null)` on the write closes this at the query level: by
 *    the time the second write runs, this row's username is no longer null, so the
 *    filter matches zero rows. The trigger never even fires — a trigger only runs on
 *    rows a statement actually touches, and this filter guarantees the only rows this
 *    update can touch still have username = null, so OLD.username is never non-null on
 *    any row this code updates. The generic fallback below exists only for whatever
 *    this reasoning missed, not as the primary defense.
 */
export async function claimUsername(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const user = await getSessionUser().catch(() => null);
  if (!user) return { error: "Sign in first." };

  // checkUsername takes `unknown` and hands back the canonical (trimmed, lowercased)
  // string to persist — formData.get() goes straight in, so there's no separate,
  // un-normalized copy of the input that could end up written instead.
  const check = checkUsername(formData.get("username"));
  if (!check.ok) return { error: USERNAME_ERROR_MESSAGE[check.error] };
  const { username } = check;

  const db = adminDb();

  // Refuse rather than update. This is the friendly path for the common case — a
  // returning user re-submitting the form, not a race — and it's what keeps this
  // action from ever attempting the one write the permanence trigger exists to block.
  const { data: existing } = await db.from("profiles").select("username").eq("id", user.id).maybeSingle();
  if (existing?.username) return { error: ALREADY_CLAIMED };

  // Friendly pre-check, not the enforcement. Every stored username got there through
  // this same canonical lowercase form, so a plain equality read is already
  // case-insensitive in effect — and unlike ilike, it isn't tripped up by "_" being
  // both a legal handle character and a single-char ILIKE wildcard. A miss here just
  // means a worse error message on the write below, never a bad write: the unique
  // index is what actually enforces uniqueness.
  const { data: taken } = await db.from("profiles").select("id").eq("username", username).maybeSingle();
  if (taken) return { error: "That handle is taken." };

  const { data: claimed, error } = await db
    .from("profiles")
    .update({ username })
    .eq("id", user.id)
    .is("username", null)
    .select("username")
    .maybeSingle();

  if (error) {
    // 23505 = unique_violation on profiles_username_lower_key: someone else claimed
    // this exact string between the pre-check above and this write landing.
    if (error.code === "23505") return { error: "That handle is taken." };
    // Anything else is unanticipated. Never forward error.message here — on a
    // service-role write to this table that can include a raw plpgsql exception, and
    // even a plain constraint message is database-speak, not a sentence a user should
    // have to parse.
    return { error: "Couldn't claim that handle. Try again." };
  }
  if (!claimed) {
    // `.is("username", null)` matched zero rows: this account's handle was set by a
    // concurrent request between the pre-check above and this write landing.
    return { error: ALREADY_CLAIMED };
  }

  revalidatePath("/record");
  revalidatePath(`/u/${username}`);
  return { ok: true, username };
}

/**
 * Set or clear the favourite club.
 *
 * Freely changeable — no permanence trigger, no unique constraint — so this is a plain
 * update. The only invariant to uphold locally is the length cap, kept in sync with
 * migration 0005's `profiles_favourite_club_len` check (`<= 80`) so a save always
 * truncates silently instead of ever bouncing off that constraint as a raw 23514.
 */
export async function setFavouriteClub(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const user = await getSessionUser().catch(() => null);
  if (!user) return { error: "Sign in first." };

  // No dedicated validator for this field (unlike username), so the FormData value is
  // narrowed by hand: anything that isn't already a string (e.g. a stray File) becomes
  // "" rather than being coerced into a literal "[object File]".
  const raw = formData.get("favourite_club");
  const club = (typeof raw === "string" ? raw : "").trim().slice(0, 80);

  const { data, error } = await adminDb()
    .from("profiles")
    .update({ favourite_club: club || null })
    .eq("id", user.id)
    .select("username")
    .maybeSingle();
  // Same reasoning as claimUsername above: fixed copy, never error.message.
  if (error) return { error: "Couldn't save your club. Try again." };

  revalidatePath("/record");
  if (data?.username) revalidatePath(`/u/${data.username}`);
  return { ok: true };
}
