// Seeds reported contract-end years for marquee players (public facts).
// Conservative, high-confidence set — comprehensive coverage needs a paid feed.
// Matched against the folded name_norm column; the highest-valued match wins
// (disambiguates common surnames). Run: npm run seed:contracts
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/db/types";

const CONTRACTS: { match: string; until: number; label: string }[] = [
  { match: "lamine yamal", until: 2031, label: "Lamine Yamal" },
  { match: "haaland", until: 2034, label: "Erling Haaland" },
  { match: "mbappe", until: 2029, label: "Kylian Mbappé" },
  { match: "edward kane", until: 2027, label: "Harry Kane" },
  { match: "declan rice", until: 2028, label: "Declan Rice" },
  { match: "enzo jeremias", until: 2032, label: "Enzo Fernández" },
  { match: "borges fernandes", until: 2027, label: "Bruno Fernandes" },
  { match: "vinicius jose", until: 2027, label: "Vinícius Júnior" },
  { match: "szoboszlai", until: 2028, label: "Dominik Szoboszlai" },
  { match: "bruno guimaraes", until: 2028, label: "Bruno Guimarães" },
  { match: "dias belloli", until: 2028, label: "Raphinha" },
  { match: "dos santos magalhaes", until: 2029, label: "Gabriel Magalhães" },
];

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }
  const db = createClient<Database>(url, key, { auth: { persistSession: false } });

  let applied = 0;
  for (const c of CONTRACTS) {
    const { data, error } = await db
      .from("players")
      .select("id,name, player_valuations(value_eur)")
      .ilike("name_norm", `%${c.match}%`);
    if (error) {
      console.error(`✗ ${c.label}: ${error.message}`);
      continue;
    }
    const rows = (data ?? []) as unknown as {
      id: string;
      name: string;
      player_valuations: { value_eur: number } | null;
    }[];
    if (!rows.length) {
      console.warn(`· no match for ${c.label} (${c.match})`);
      continue;
    }
    rows.sort((a, b) => (b.player_valuations?.value_eur ?? 0) - (a.player_valuations?.value_eur ?? 0));
    const top = rows[0];
    const { error: uErr } = await db.from("players").update({ contract_until: c.until }).eq("id", top.id);
    if (uErr) {
      console.error(`✗ ${c.label}: ${uErr.message}`);
      continue;
    }
    console.log(`✓ ${c.label} → ${top.name} (until ${c.until})`);
    applied++;
  }
  console.log(`\nApplied ${applied}/${CONTRACTS.length} contracts. Re-run "npm run value" to recompute.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
