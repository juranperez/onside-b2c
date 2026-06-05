"use server";

import { revalidatePath } from "next/cache";
import { adminDb } from "@/lib/db/admin";
import { getSessionUser, createSupabaseServer } from "@/lib/db/supabase-server";
import { getRumourById } from "@/lib/queries/rumours";

// Single-owner curation for now. Set ADMIN_EMAIL in env to override.
const OWNER = (process.env.ADMIN_EMAIL ?? "juranperez@gmail.com").toLowerCase();

export async function isCurator(): Promise<boolean> {
  const user = await getSessionUser().catch(() => null);
  return !!user && (user.email ?? "").toLowerCase() === OWNER;
}

function fold(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[\\%_]/g, (m) => `\\${m}`);
}

export type RumourActionState = { ok?: boolean; error?: string; message?: string };

export async function addRumour(_prev: RumourActionState, formData: FormData): Promise<RumourActionState> {
  if (!(await isCurator())) return { error: "Not authorized" };
  const q = String(formData.get("player") ?? "").trim();
  const toClub = String(formData.get("to_club") ?? "").trim();
  const summary = String(formData.get("summary") ?? "").trim();
  const source = String(formData.get("source") ?? "").trim();
  if (!q || !toClub || !summary || !source) return { error: "Player, destination, source and summary are required." };

  const db = adminDb();
  const { data } = await db
    .from("players")
    .select("id,name, player_valuations(value_eur)")
    .ilike("name_norm", `%${fold(q)}%`)
    .limit(25);
  const rows = (data ?? []) as unknown as { id: string; name: string; player_valuations: { value_eur: number } | null }[];
  if (!rows.length) return { error: `No player matches "${q}".` };
  rows.sort((a, b) => (b.player_valuations?.value_eur ?? 0) - (a.player_valuations?.value_eur ?? 0));
  const player = rows[0];

  const feeStr = String(formData.get("fee") ?? "").trim();
  const feeM = feeStr ? parseFloat(feeStr) : NaN;
  const now = new Date().toISOString();

  const { error } = await db.from("rumours").insert({
    player_id: player.id,
    to_club: toClub,
    reported_fee_eur: Number.isFinite(feeM) ? Math.round(feeM * 1e6) : null,
    status: String(formData.get("status") ?? "rumour"),
    summary,
    primary_source: source,
    source_tier: parseInt(String(formData.get("tier") ?? "3"), 10) || 3,
    corroborations: parseInt(String(formData.get("corroborations") ?? "1"), 10) || 1,
    first_seen: now,
    last_update: now,
    url: String(formData.get("url") ?? "").trim() || null,
  });
  if (error) return { error: error.message };
  revalidatePath("/transfers");
  return { ok: true, message: `Added: ${player.name} → ${toClub}` };
}

export async function deleteRumour(id: string): Promise<void> {
  if (!(await isCurator())) return;
  await adminDb().from("rumours").delete().eq("id", id);
  revalidatePath("/transfers");
}

export async function setRumourStatus(id: string, status: "rumour" | "confirmed" | "dead"): Promise<void> {
  if (!(await isCurator())) return;
  const now = new Date().toISOString();
  const update: { status: string; last_update: string; resolved_confidence?: number; resolved_at?: string } = {
    status,
    last_update: now,
  };
  if (status === "confirmed" || status === "dead") {
    // Snapshot the live Confidence % (still computed as an active rumour) so the
    // Accuracy Report can grade how the score performed.
    const r = await getRumourById(id).catch(() => null);
    if (r && r.status === "rumour") {
      update.resolved_confidence = r.confidence.pct;
      update.resolved_at = now;
    }
  }
  await adminDb().from("rumours").update(update).eq("id", id);
  revalidatePath("/transfers");
  revalidatePath(`/transfers/${id}`);
}

// ── Community discussion ──────────────────────────────────────────────────
export type CommentActionState = { ok?: boolean; error?: string };

/** Post a comment on a rumour (signed-in users; RLS scopes to the author). */
export async function postComment(rumourId: string, _prev: CommentActionState, formData: FormData): Promise<CommentActionState> {
  const user = await getSessionUser();
  if (!user) return { error: "Sign in to join the discussion." };
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { error: "Say something first." };

  const supabase = await createSupabaseServer();
  const { data: prof } = await supabase.from("profiles").select("display_name,username").eq("id", user.id).maybeSingle();
  const author = prof?.display_name || prof?.username || (user.email ?? "Member").split("@")[0];

  const { error } = await supabase.from("rumour_comments").insert({
    rumour_id: rumourId,
    profile_id: user.id,
    body: body.slice(0, 1000),
    author_name: author,
  });
  if (error) return { error: error.message };
  revalidatePath(`/transfers/${rumourId}`);
  return { ok: true };
}
