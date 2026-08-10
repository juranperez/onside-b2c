import "server-only";
import { readDb } from "@/lib/db/server";
import { adminDb } from "@/lib/db/admin";
import { normalizeUsername } from "@/lib/profiles/username";

/**
 * A public profile shows calls the moment they lock, so the default 30-minute read
 * cache would make the page look broken to the person who just called. 60s still
 * absorbs a share spike, which is the only traffic shape this page sees.
 */
const PROFILE_REVALIDATE = 60;

export interface PublicProfile {
  id: string;
  username: string;
  displayName: string | null;
  favouriteClub: string | null;
  createdAt: string;
}

/** A profile by handle, or null when the handle is unclaimed or does not exist. */
export async function getPublicProfile(username: string): Promise<PublicProfile | null> {
  const { data } = await readDb({ revalidate: PROFILE_REVALIDATE })
    .from("public_profiles")
    .select("id, username, display_name, favourite_club, created_at")
    .eq("username", normalizeUsername(username))
    .maybeSingle();
  // Every public_profiles column comes back nullable in the generated types — Postgres
  // does not carry a NOT NULL constraint through a view, even for `id` (profiles' primary
  // key) or `username` (guaranteed by this view's own `where username is not null`).
  // `created_at` genuinely can be null (profiles.created_at has a default, not a NOT NULL
  // constraint), so this guard is real, not just satisfying the compiler. Narrowing all
  // three here is what lets the object below match `PublicProfile` without a cast.
  if (!data?.username || !data?.id || !data?.created_at) return null;
  return {
    id: data.id,
    username: data.username,
    displayName: data.display_name,
    favouriteClub: data.favourite_club,
    createdAt: data.created_at,
  };
}

/**
 * The signed-in user's own editable fields.
 *
 * Reads `profiles` directly rather than the view, because a user who has not claimed a
 * handle does not appear in `public_profiles` at all — and they are exactly the user who
 * needs the claim form. Service role, own row only; callers must pass their own id.
 */
export async function getMyProfileBasics(
  userId: string,
): Promise<{ username: string | null; favouriteClub: string | null }> {
  const { data } = await adminDb()
    .from("profiles")
    .select("username, favourite_club")
    .eq("id", userId)
    .maybeSingle();
  return { username: data?.username ?? null, favouriteClub: data?.favourite_club ?? null };
}

/** What a commenter's receipt line shows: their call on THIS deal, plus their overall record. */
export interface AuthorReceipt {
  username: string | null;
  pick: string | null; // will | wont | higher | lower — null means no call on record
  houseConfidencePct: number | null;
  lockedAt: string | null;
  status: string | null;
  wins: number;
  losses: number;
  accuracyPct: number | null;
}

/**
 * Receipts for a set of comment authors on one deal, keyed by profile id.
 *
 * Three batched reads, never per-author — a thread with 40 comments must not become
 * 120 queries. Authors with no claimed handle and no call still get an entry, so the
 * thread can render "No call on record" without a second lookup.
 */
export async function getAuthorReceipts(
  rumourId: string,
  profileIds: string[],
): Promise<Map<string, AuthorReceipt>> {
  const out = new Map<string, AuthorReceipt>();
  const ids = [...new Set(profileIds)].filter(Boolean);
  if (!ids.length) return out;

  const db = readDb({ revalidate: PROFILE_REVALIDATE });
  const [profiles, calls, reps] = await Promise.all([
    db.from("public_profiles").select("id, username").in("id", ids),
    db
      .from("predictions")
      .select("user_id, pick, house_confidence_pct, locked_at, status")
      .eq("subject_id", rumourId)
      .eq("call_type", "outcome")
      .in("user_id", ids),
    db.from("reputation").select("user_id, wins, losses, accuracy_pct").in("user_id", ids),
  ]);

  const handleBy = new Map((profiles.data ?? []).map((p) => [p.id, p.username] as const));
  const callBy = new Map((calls.data ?? []).map((c) => [c.user_id, c] as const));
  const repBy = new Map((reps.data ?? []).map((r) => [r.user_id, r] as const));

  for (const id of ids) {
    const call = callBy.get(id);
    const rep = repBy.get(id);
    out.set(id, {
      username: handleBy.get(id) ?? null,
      pick: call?.pick ?? null,
      houseConfidencePct: call?.house_confidence_pct ?? null,
      lockedAt: call?.locked_at ?? null,
      status: call?.status ?? null,
      wins: rep?.wins ?? 0,
      losses: rep?.losses ?? 0,
      accuracyPct: rep?.accuracy_pct ?? null,
    });
  }
  return out;
}
