import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/db/supabase-server";

/**
 * Magic-link / OAuth callback: exchanges the code for a session cookie.
 *
 * Failure here is COMMON, not exceptional — corporate mail scanners and inbox
 * previews consume one-time links before the user clicks, links expire, and a
 * link opened in a different browser than the one that requested it can't
 * complete the PKCE exchange. Every failure path lands on /login with a clear
 * reason instead of silently dropping the user on the site signed out.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next") ?? "/discover";
  // Same-site relative paths only — never an absolute or protocol-relative URL.
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/discover";
  const fail = () => NextResponse.redirect(`${origin}/login?error=link&next=${encodeURIComponent(next)}`);

  if (!code || searchParams.get("error")) return fail();

  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data?.user) return fail();

  // First session ever → greet them on landing (created ≈ first sign-in).
  const u = data.user;
  const isNew =
    u.created_at && u.last_sign_in_at &&
    Math.abs(new Date(u.last_sign_in_at).getTime() - new Date(u.created_at).getTime()) < 60_000;
  const sep = next.includes("?") ? "&" : "?";
  return NextResponse.redirect(`${origin}${next}${isNew ? `${sep}welcome=1` : ""}`);
}
