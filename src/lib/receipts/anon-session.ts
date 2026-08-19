import "server-only";
import { cookies } from "next/headers";

export const ANON_COOKIE = "onside_anon";

/** Matches the claim window: past this, a cookie is gone and its rows can never be claimed. */
const NINETY_DAYS_SEC = 90 * 24 * 60 * 60;

/**
 * The anonymous caller's identity.
 *
 * httpOnly because the page never needs to read it — keeping it out of script means it
 * cannot be forged or harvested client-side. Set only when someone deliberately taps a
 * call, and only so that call can be delivered and later claimed, which is what makes it
 * an essential cookie rather than tracking (see /privacy).
 */

/** The existing session id, or null. Never mints one — safe to call anywhere. */
export async function readAnonSession(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(ANON_COOKIE)?.value ?? null;
}

/**
 * The existing session id, or a fresh one written to the jar.
 *
 * Only callable from a server action or route handler — Next forbids setting cookies
 * during a render. Call it *after* the call has been validated, so a rejected call
 * leaves no trace on the visitor's browser.
 */
export async function ensureAnonSession(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(ANON_COOKIE)?.value;
  if (existing) return existing;

  const id = crypto.randomUUID();
  jar.set(ANON_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: NINETY_DAYS_SEC,
  });
  return id;
}

/** Called after a successful claim — the rows are gone, so the id is spent. */
export async function clearAnonSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(ANON_COOKIE);
}
