"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/db/supabase-browser";
import { CallChip } from "@/components/transfers/CallChip";

/**
 * `CallChip` with the signed-in check resolved in the browser instead of on the server.
 *
 * This exists so the homepage can stay statically rendered. Resolving the session
 * server-side (`getSessionUser` → `cookies()`) opts a route out of static rendering
 * entirely — measured: adding it turned `/` from `○` to `ƒ` in the build output. That
 * would put every request to the highest-traffic page straight onto the database, which
 * is the failure `db/server.ts`'s cache guard exists to prevent after an uncached read
 * path once exhausted this project's Supabase egress quota and returned HTTP 402.
 *
 * Same approach `TopNav` already uses, including the auth-state subscription so the chip
 * reacts to a sign-in that happens in another tab.
 *
 * Two accepted consequences, both cheap:
 * - The chip renders as signed-out for one frame before the session resolves. Harmless:
 *   the action behind it is server-authoritative regardless of what this prop says, so a
 *   stale `false` can never let someone do something they shouldn't.
 * - `myCall` is always null here, so a signed-in user who has already called this deal
 *   sees an un-called chip on the homepage. The deal page shows their real state. Worth
 *   revisiting only if the homepage card becomes something people return to.
 */
export function CallChipAuto({
  subjectId,
  houseConfidencePct,
}: {
  subjectId: string;
  houseConfidencePct: number;
}) {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    const sb = createClient();
    sb.auth.getUser().then(({ data }) => setSignedIn(!!data.user));
    const { data: sub } = sb.auth.onAuthStateChange((_e, session) => setSignedIn(!!session?.user));
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <CallChip
      subjectId={subjectId}
      houseConfidencePct={houseConfidencePct}
      signedIn={signedIn}
      myCall={null}
    />
  );
}
