import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

/** Refreshes the Supabase auth session cookie on each request. */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  // Touch the session so it refreshes; do not gate routes here (public site).
  await supabase.auth.getUser();
  return response;
}

// Cost control (Sep 2026): this middleware only refreshes the Supabase session cookie,
// yet the previous catch-all matcher ran it on ~690k requests/day — almost all of them
// crawlers hitting public, session-free pages — and billed edge CPU on every one.
// Run it only where a user session actually matters. Public pages skip it entirely.
export const config = {
  matcher: [
    "/login",
    "/auth/:path*",
    "/watchlist/:path*",
    "/u/:path*",
    "/notifications/:path*",
    "/community/:path*",
    "/the-board/:path*",
    "/record/:path*",
    "/ask/:path*",
    "/api/push/:path*",
    "/api/stripe/checkout",
    "/api/stripe/portal",
  ],
};
