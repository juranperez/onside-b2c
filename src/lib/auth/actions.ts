"use server";

import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/db/supabase-server";

export async function signOut() {
  const supabase = await createSupabaseServer();
  await supabase.auth.signOut();
  redirect("/discover");
}
