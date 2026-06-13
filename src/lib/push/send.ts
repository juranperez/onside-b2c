import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";

let configured = false;
function configure(): boolean {
  if (configured) return true;
  const pub = process.env.VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails("mailto:hello@onsidemarket.com", pub, priv);
  configured = true;
  return true;
}

/** Fan a payload out to every stored subscription; prune dead (404/410) endpoints. */
export async function broadcast(db: SupabaseClient<Database>, payload: { title: string; body: string; url: string }): Promise<number> {
  if (!configure()) return 0;
  const { data: subs } = await db.from("push_subscriptions").select("endpoint,p256dh,auth");
  if (!subs?.length) return 0;
  const body = JSON.stringify(payload);
  let sent = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body);
      sent++;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await db.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
    }
  }
  return sent;
}
