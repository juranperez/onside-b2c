import { adminDb } from "@/lib/db/admin";

export const dynamic = "force-dynamic";

/** One-click unsubscribe from The Board (token-validated, no auth needed). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const email = url.searchParams.get("e")?.trim().toLowerCase() ?? "";
  const token = url.searchParams.get("t") ?? "";

  let ok = false;
  if (email && token) {
    const { data } = await adminDb()
      .from("board_subscribers")
      .update({ unsubscribed_at: new Date().toISOString() })
      .eq("email", email)
      .eq("token", token)
      .select("email");
    ok = Boolean(data?.length);
  }

  const body = ok
    ? `<h1 style="font:600 22px sans-serif">You're off the list.</h1><p style="font:14px sans-serif;color:#555">No more Board emails. Changed your mind? Resubscribe any time at onsidemarket.com/the-board.</p>`
    : `<h1 style="font:600 22px sans-serif">Link not recognised.</h1><p style="font:14px sans-serif;color:#555">This unsubscribe link is invalid or already used.</p>`;

  return new Response(
    `<!doctype html><html><body style="display:grid;place-items:center;min-height:90vh;background:#0A0A0B;color:#fff"><div style="text-align:center;max-width:420px">${body}</div></body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" }, status: ok ? 200 : 400 },
  );
}
