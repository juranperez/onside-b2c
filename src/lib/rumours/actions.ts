"use server";

import { revalidatePath } from "next/cache";
import { adminDb } from "@/lib/db/admin";
import { getSessionUser } from "@/lib/db/supabase-server";

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
  await adminDb().from("rumours").update({ status, last_update: new Date().toISOString() }).eq("id", id);
  revalidatePath("/transfers");
}
