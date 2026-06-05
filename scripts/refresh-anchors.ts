// One-off anchor refresh for marquee players whose B2B Transfermarkt anchor was
// stale (mostly recent big transfers — the anchor predated the move), making their
// Onside value read far too low. Values are current Transfermarkt market values
// captured 2026-06-05 via public reporting (real data, not fabricated). B2B remains
// the source of truth for everyone else; these are tagged 'tm-refresh-2026-06' so
// the override is auditable and a later B2B re-scrape can supersede it.
// Run: npm run refresh:anchors
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/db/types";

// tokens (all must appear in name_norm) · club (exact) · current market value €M
const OVERRIDES: { t: string[]; c: string; m: number }[] = [
  { t: ["vinicius"], c: "Real Madrid", m: 150 },
  { t: ["rodrygo"], c: "Real Madrid", m: 65 },
  { t: ["araujo"], c: "Barcelona", m: 25 },
  { t: ["julian", "alvarez"], c: "Atletico Madrid", m: 110 },
  { t: ["barrios"], c: "Atletico Madrid", m: 55 },
  { t: ["savio"], c: "Manchester City", m: 38 },
  { t: ["palmer"], c: "Chelsea", m: 100 },
  { t: ["caicedo"], c: "Chelsea", m: 100 },
  { t: ["enzo"], c: "Chelsea", m: 90 },
  { t: ["estevao"], c: "Chelsea", m: 100 },
  { t: ["cucurella"], c: "Chelsea", m: 42 },
  { t: ["bynoe"], c: "Chelsea", m: 45 },
  { t: ["salah"], c: "Liverpool", m: 25 },
  { t: ["maddison"], c: "Tottenham", m: 45 },
  { t: ["sesko"], c: "Manchester United", m: 70 },
  { t: ["pulisic"], c: "AC Milan", m: 42 },
  { t: ["gimenez"], c: "AC Milan", m: 38 },
  { t: ["cambiaso"], c: "Juventus", m: 38 },
  { t: ["lobotka"], c: "Napoli", m: 35 },
  { t: ["grimaldo"], c: "Bayer Leverkusen", m: 24 },
  { t: ["osimhen"], c: "Galatasaray", m: 90 },
];

const MODEL = "tm-refresh-2026-06";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing SUPABASE env");
    process.exit(1);
  }
  const db = createClient<Database>(url, key, { auth: { persistSession: false } });

  // Pull all players once (paged) with club + current value.
  type Row = { id: string; name: string; nn: string; club: string; v: number };
  const all: Row[] = [];
  let from = 0;
  const PAGE = 1000;
  for (;;) {
    const { data, error } = await db
      .from("players")
      .select("id,name,name_norm,clubs(name),player_valuations(value_eur)")
      .range(from, from + PAGE - 1);
    if (error) {
      console.error(error.message);
      break;
    }
    if (!data || !data.length) break;
    for (const p of data as unknown as { id: string; name: string; name_norm: string | null; clubs: { name: string } | null; player_valuations: { value_eur: number } | null }[]) {
      all.push({ id: p.id, name: p.name, nn: (p.name_norm ?? "").toLowerCase(), club: p.clubs?.name ?? "", v: p.player_valuations?.value_eur ?? 0 });
    }
    if (data.length < PAGE) break;
    from += PAGE;
  }

  let done = 0;
  for (const o of OVERRIDES) {
    const cands = all.filter((r) => r.club === o.c && o.t.every((tok) => r.nn.includes(tok)));
    if (!cands.length) {
      console.warn(`· no match: ${o.t.join("+")} @ ${o.c}`);
      continue;
    }
    cands.sort((a, b) => b.v - a.v);
    const p = cands[0];
    const { error } = await db
      .from("player_valuations")
      .update({ value_eur: o.m * 1e6, model_version: MODEL })
      .eq("player_id", p.id);
    if (error) {
      console.error(`✗ ${p.name}: ${error.message}`);
      continue;
    }
    console.log(`✓ ${p.name} [${p.club}]  €${Math.round(p.v / 1e6)}M → €${o.m}M`);
    done++;
  }
  console.log(`\nRefreshed ${done}/${OVERRIDES.length} anchors (model ${MODEL}).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
