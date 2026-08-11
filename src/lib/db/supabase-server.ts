import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./types";

/** Supabase client bound to the request cookies — reads/writes the auth session. */
export async function createSupabaseServer() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Called from a Server Component (read-only cookies) — middleware refreshes the session.
          }
        },
      },
    },
  );
}

/** The signed-in user, or null. Safe to call in Server Components. */
export async function getSessionUser() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
