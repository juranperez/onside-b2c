"use server";

import { revalidatePath } from "next/cache";
import { adminDb } from "@/lib/db/admin";
import { getSessionUser } from "@/lib/db/supabase-server";
import { checkUsername, USERNAME_ERROR_MESSAGE } from "./username";

export type ProfileActionState = { ok?: boolean; error?: string; username?: string };

/** Returned whenever this account holds a different handle than the one being claimed. */
const ALREADY_CLAIMED = "Your handle is already set and can't be changed.";

/** Generic, fixed fallback for claimUsername — never forward a raw Postgres/plpgsql message. */
const CLAIM_FAILED = "Couldn't claim that handle. Try again.";

/**
 * Every success path in claimUsername ends here, so none of them can forget the
 * revalidation or drift from another's return shape.
 */
function claimSucceeded(username: string): ProfileActionState {
  revalidatePath("/record");
  revalidatePath(`/u/${username}`);
  return { ok: true, username };
}

/**
 * Claim a permanent handle.
 *
 * Idempotent, not merely permanent: every branch below reports on what is now TRUE
 * for this account, not on what this particular request did. A double-submit (double
 * click, two tabs) can lose every race below, and "lost the race" must still read as
 * success if the string it lost to is the one it was trying to claim — otherwise a
 * user who just succeeded is told the one thing this field's whole design promises
 * never happens: that they're stuck, permanently, with nothing.
 *
 * It must never *update* an already-claimed row: migration 0005's
 * `profiles_username_permanent` trigger raises a plpgsql exception on exactly that,
 * even from this service-role client, and that raw exception text ("profiles: username
 * is permanent once claimed") is not user-facing copy — nothing below should let it
 * reach the caller.
 *
 * Two different races are in play, closed two different ways:
 *  - Two accounts claim the same string. The pre-checks below can't see each other
 *    (TOCTOU), so the real guard is the unique index on lower(username) — whichever
 *    write loses gets 23505, mapped to a friendly message.
 *  - The same account submits twice. `.is("username", null)` on the write closes this
 *    at the query level — the only rows this statement can ever touch already have
 *    username = null going in, so the trigger can never fire from this call. The zero-
 *    rows-updated outcome that follows isn't failure, just proof this row already
 *    moved (quite possibly via this very account's other in-flight request) — so that
 *    branch re-reads and reports on the result instead of assuming the worst.
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

  // Idempotent, not just a refusal: resubmitting this exact, already-successful claim
  // (stale page, back-and-forward, a retry after a dropped response) reports success,
  // because it IS the current state. Only a genuinely different existing handle is an
  // error — and that error is what actually stops this action from ever attempting the
  // one write the permanence trigger exists to reject.
  const { data: existing, error: existingErr } = await db
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();
  if (existingErr) {
    console.error("claimUsername: pre-check read failed", { code: existingErr.code, userId: user.id, username });
    return { error: CLAIM_FAILED };
  }
  if (existing?.username) {
    return existing.username === username ? claimSucceeded(username) : { error: ALREADY_CLAIMED };
  }

  // Friendly pre-check, not the enforcement. Every stored username got there through
  // this same canonical lowercase form, so a plain equality read is already
  // case-insensitive in effect — and unlike ilike, it isn't tripped up by "_" being
  // both a legal handle character and a single-char ILIKE wildcard. A miss here just
  // means a worse error message on the write below, never a bad write: the unique
  // index is what actually enforces uniqueness. Excludes this account's own row: the
  // existing-check above only reflects a moment ago, so without this exclusion a
  // concurrent duplicate finishing in the gap between that read and this one would
  // read back here as "taken" instead of falling through to the write below, which is
  // where that exact race resolves correctly.
  const { data: taken, error: takenErr } = await db
    .from("profiles")
    .select("id")
    .eq("username", username)
    .neq("id", user.id)
    .maybeSingle();
  if (takenErr) {
    console.error("claimUsername: taken-check read failed", { code: takenErr.code, userId: user.id, username });
    return { error: CLAIM_FAILED };
  }
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
    // Anything else is unanticipated. This write has never run in production, and
    // launch will send it a burst of first-time traffic — log it, so a systematic
    // failure (rotated service-role key, stale PostgREST schema cache, constraint
    // drift) is visible somewhere instead of indistinguishable silence. The message
    // back to the client stays fixed regardless: never forward error.message — on a
    // service-role write to this table that can include the permanence trigger's raw
    // plpgsql text, and even a plain constraint violation is database-speak, not a
    // sentence a user should have to parse.
    console.error("claimUsername: write failed", { code: error.code, userId: user.id, username });
    return { error: CLAIM_FAILED };
  }
  if (!claimed) {
    // Zero rows: this account's row changed between the pre-checks above and this
    // write landing — most plausibly this exact request racing a duplicate of itself.
    // Re-read and report the truth rather than assuming failure.
    const { data: now, error: reErr } = await db.from("profiles").select("username").eq("id", user.id).maybeSingle();
    if (reErr) {
      console.error("claimUsername: post-race re-read failed", { code: reErr.code, userId: user.id, username });
      return { error: CLAIM_FAILED };
    }
    if (now?.username === username) return claimSucceeded(username); // this claim already won
    if (now?.username) return { error: ALREADY_CLAIMED }; // holds a genuinely different handle
    // No row at all for this id. profiles rows today come from an `AFTER INSERT ON
    // auth.users` trigger that lives only in the Supabase dashboard, not in
    // supabase/migrations — nothing in the repo actually guarantees it ran for this
    // account. Nothing is "already claimed" here, so don't tell the user they're
    // permanently stuck with a handle they don't have.
    console.error("claimUsername: no profile row for signed-in user", { userId: user.id, username });
    return { error: CLAIM_FAILED };
  }

  return claimSucceeded(username);
}

/**
 * Set or clear the favourite club.
 *
 * Freely changeable — no permanence trigger, no unique constraint — so the only
 * invariant to hold is the length cap in migration 0005's `profiles_favourite_club_len`
 * (`length(favourite_club) <= 80`, counted in Postgres characters, i.e. Unicode code
 * points). Rejects rather than truncates: unlike the handle, asking again here costs
 * the user nothing, and a naive `.slice(0, 80)` counts UTF-16 code units, not code
 * points — it can split a surrogate pair (most emoji) in half, and PostgREST/Postgres
 * then decode the orphaned half as U+FFFD, so the club would render as "...aaa�"
 * next to the handle on a public page. `[...club].length` iterates by code point,
 * matching how the database actually counts.
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
  const club = (typeof raw === "string" ? raw : "").trim();
  if ([...club].length > 80) return { error: "Keep your club under 80 characters." };

  const { data, error } = await adminDb()
    .from("profiles")
    .update({ favourite_club: club || null })
    .eq("id", user.id)
    .select("username")
    .maybeSingle();
  if (error) {
    console.error("setFavouriteClub: write failed", { code: error.code, userId: user.id });
    return { error: "Couldn't save your club. Try again." };
  }
  if (!data) {
    // No row matched id=user.id — see claimUsername's matching comment: the row-
    // creation trigger lives only in the Supabase dashboard, not in this repo, so
    // nothing here actually guarantees the row exists. Report failure rather than the
    // false "ok: true" a silently-unmatched update would otherwise produce.
    console.error("setFavouriteClub: no profile row for signed-in user", { userId: user.id });
    return { error: "Couldn't save your club. Try again." };
  }

  revalidatePath("/record");
  if (data.username) revalidatePath(`/u/${data.username}`);
  return { ok: true };
}
