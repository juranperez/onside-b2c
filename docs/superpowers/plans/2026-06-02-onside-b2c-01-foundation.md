# Onside B2C — Plan 01: Foundation & Data Backbone

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the real backbone for Onside B2C — a Supabase Postgres database with the full schema, typed server clients, a test harness, and a working health check — without touching the existing design system.

**Architecture:** Keep the deployed Next.js 16 / React 19 / Tailwind 4 frontend as-is. Add a `src/lib/db` layer (typed Supabase clients) and a `src/lib/env` validated-config module. All football, valuation, and user data lives in one Supabase Postgres project (single source of truth). Server Components will read it directly (later plans); ingestion jobs write to it with a service-role key.

**Tech Stack:** Next.js 16, TypeScript 5, Supabase (`@supabase/supabase-js`, `@supabase/ssr`), Zod, Vitest. Package manager: **npm** (repo has `package-lock.json`).

---

## File Structure

| File | Responsibility |
|---|---|
| `vitest.config.ts` | Test runner config (node env, path alias `@/`) |
| `src/lib/env.ts` | Zod-validated environment config; single import point for all secrets |
| `src/lib/db/admin.ts` | Service-role Supabase client (server-only writes; ingestion) |
| `src/lib/db/server.ts` | Anon/read Supabase client for Server Components |
| `src/lib/db/types.ts` | Generated Supabase TS types (`Database`) |
| `src/lib/format.ts` | Pure formatters: `fmtVal`, `fmtDelta`, `slugify` (TDD example unit) |
| `src/lib/format.test.ts` | Unit tests for formatters |
| `supabase/migrations/0001_init.sql` | Full initial schema (football + valuations + user) |
| `src/app/api/health/route.ts` | Health endpoint: verifies DB connectivity |
| `.env.example` | Documents every required env var (committed, no values) |
| `.env.local` | Real secrets (gitignored; already holds `API_FOOTBALL_KEY`) |

> The existing design system (`src/components/ui/*`, `src/app/globals.css` tokens) is **not modified** in this plan.

---

### Task 1: Test harness (Vitest)

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json` (add `test` scripts + devDeps)
- Create: `src/lib/format.ts`, `src/lib/format.test.ts`

- [ ] **Step 1: Install test + core deps**

Run:
```bash
cd "/Users/perezmoodley/onside-b2c"
npm i @supabase/supabase-js @supabase/ssr zod
npm i -D vitest @types/node
```
Expected: installs succeed, `package-lock.json` updates.

- [ ] **Step 2: Add Vitest config**

Create `vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: { environment: "node", include: ["src/**/*.test.ts"] },
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
});
```

- [ ] **Step 3: Add test scripts to package.json**

In `package.json` `"scripts"`, add:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Write a failing formatter test**

Create `src/lib/format.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { fmtVal, fmtDelta, slugify } from "./format";

describe("fmtVal", () => {
  it("formats millions with one decimal and € prefix", () => {
    expect(fmtVal(215_000_000)).toBe("€215.0M");
    expect(fmtVal(48_000_000)).toBe("€48.0M");
  });
  it("formats billions for values >= 1e9", () => {
    expect(fmtVal(1_600_000_000)).toBe("€1.6B");
  });
  it("formats sub-million in thousands", () => {
    expect(fmtVal(750_000)).toBe("€750K");
  });
});

describe("fmtDelta", () => {
  it("prefixes positive deltas with +", () => {
    expect(fmtDelta(9_300_000)).toBe("+€9.3M");
  });
  it("prefixes negative deltas with -", () => {
    expect(fmtDelta(-4_800_000)).toBe("-€4.8M");
  });
});

describe("slugify", () => {
  it("lowercases and hyphenates, stripping accents", () => {
    expect(slugify("Désiré Doué")).toBe("desire-doue");
    expect(slugify("Manchester United")).toBe("manchester-united");
  });
});
```

- [ ] **Step 5: Run it to confirm it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module './format'`.

- [ ] **Step 6: Implement the formatters**

Create `src/lib/format.ts`:
```ts
/** Format a euro value into a compact string: €215.0M, €1.6B, €750K. */
export function fmtVal(eur: number): string {
  const abs = Math.abs(eur);
  if (abs >= 1_000_000_000) return `€${(eur / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `€${(eur / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `€${Math.round(eur / 1_000)}K`;
  return `€${Math.round(eur)}`;
}

/** Format a signed euro delta: +€9.3M, -€4.8M. */
export function fmtDelta(eur: number): string {
  const sign = eur >= 0 ? "+" : "-";
  return `${sign}${fmtVal(Math.abs(eur))}`;
}

/** URL-safe slug: lowercase, accent-stripped, hyphenated. */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
```

- [ ] **Step 7: Run tests to confirm pass**

Run: `npm test`
Expected: PASS (3 suites, 7 assertions).

- [ ] **Step 8: Commit**

```bash
git add vitest.config.ts package.json package-lock.json src/lib/format.ts src/lib/format.test.ts
git commit -m "chore: add Vitest harness and core formatters with tests"
```

---

### Task 2: Environment config (Zod-validated)

**Files:**
- Create: `.env.example`
- Create: `src/lib/env.ts`
- Create: `src/lib/env.test.ts`

- [ ] **Step 1: Document required env vars**

Create `.env.example`:
```bash
# --- Football data providers ---
API_FOOTBALL_KEY=
FOOTBALL_DATA_API_KEY=
ASA_BASE_URL=https://app.americansocceranalysis.com/api/v1

# --- Supabase ---
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# --- Analytics / errors (reused from B2B) ---
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
SENTRY_DSN=
```

- [ ] **Step 2: Write a failing env test**

Create `src/lib/env.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { parseEnv } from "./env";

describe("parseEnv", () => {
  it("throws when a required var is missing", () => {
    expect(() => parseEnv({ API_FOOTBALL_KEY: "x" })).toThrow();
  });
  it("returns a typed config when all required vars present", () => {
    const cfg = parseEnv({
      API_FOOTBALL_KEY: "k",
      NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
      SUPABASE_SERVICE_ROLE_KEY: "svc",
    });
    expect(cfg.NEXT_PUBLIC_SUPABASE_URL).toBe("https://x.supabase.co");
  });
});
```

- [ ] **Step 3: Run it to confirm it fails**

Run: `npm test src/lib/env.test.ts`
Expected: FAIL — `Cannot find module './env'`.

- [ ] **Step 4: Implement validated env**

Create `src/lib/env.ts`:
```ts
import { z } from "zod";

const schema = z.object({
  API_FOOTBALL_KEY: z.string().min(1),
  FOOTBALL_DATA_API_KEY: z.string().optional(),
  ASA_BASE_URL: z.string().url().default("https://app.americansocceranalysis.com/api/v1"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().url().optional(),
  SENTRY_DSN: z.string().optional(),
});

export type Env = z.infer<typeof schema>;

/** Parse + validate an env-like object. Throws with a clear message if invalid. */
export function parseEnv(source: Record<string, string | undefined>): Env {
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    throw new Error(`Invalid environment: ${parsed.error.issues.map((i) => i.path.join(".")).join(", ")}`);
  }
  return parsed.data;
}

/** Lazily-validated process env (server-side). */
let cached: Env | null = null;
export function env(): Env {
  if (!cached) cached = parseEnv(process.env);
  return cached;
}
```

- [ ] **Step 5: Run tests to confirm pass**

Run: `npm test src/lib/env.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add .env.example src/lib/env.ts src/lib/env.test.ts
git commit -m "feat: zod-validated environment config + .env.example"
```

---

### Task 3: Provision the Supabase project

> Requires the user's Supabase account. Use the connected Supabase MCP (preferred) or the Supabase CLI. This task captures credentials into `.env.local`.

- [ ] **Step 1: List organizations** — via MCP `list_organizations` (or CLI `supabase orgs list`). Confirm which org to use with the user.

- [ ] **Step 2: Create project** — MCP `create_project` (name: `onside-b2c`, region nearest users, confirm cost via `confirm_cost`). Free tier is fine for launch.

- [ ] **Step 3: Capture credentials** — get `NEXT_PUBLIC_SUPABASE_URL` (MCP `get_project_url`), `NEXT_PUBLIC_SUPABASE_ANON_KEY` (MCP `get_publishable_keys`), and the service-role key (Supabase dashboard → Project Settings → API). Append all three to `.env.local`:
```bash
printf 'NEXT_PUBLIC_SUPABASE_URL=%s\nNEXT_PUBLIC_SUPABASE_ANON_KEY=%s\nSUPABASE_SERVICE_ROLE_KEY=%s\n' "<url>" "<anon>" "<service>" >> "/Users/perezmoodley/onside-b2c/.env.local"
```

- [ ] **Step 4: Verify gitignore** — confirm `.env.local` is still ignored:
```bash
git -C "/Users/perezmoodley/onside-b2c" check-ignore .env.local && echo OK
```
Expected: `OK` (prints `.env.local`).

---

### Task 4: Initial schema migration

**Files:**
- Create: `supabase/migrations/0001_init.sql`

- [ ] **Step 1: Write the schema**

Create `supabase/migrations/0001_init.sql`:
```sql
-- Onside B2C initial schema: football data + valuations + user data.
create extension if not exists pgcrypto;

-- ============ FOOTBALL ============
create table leagues (
  id            text primary key,          -- provider id (string-safe)
  slug          text unique not null,
  name          text not null,
  country       text,
  tier          int,
  season        int,
  total_value   bigint default 0,
  club_count    int default 0,
  data_source   text,
  fetched_at    timestamptz default now()
);

create table managers (
  id            text primary key,
  name          text not null,
  nationality   text,
  age           int,
  tenure_start  date,
  data_source   text,
  fetched_at    timestamptz default now()
);

create table clubs (
  id              text primary key,
  slug            text unique not null,
  name            text not null,
  short_name      text,
  league_id       text references leagues(id) on delete set null,
  country         text,
  primary_color   text,
  secondary_color text,
  stadium         text,
  manager_id      text references managers(id) on delete set null,
  squad_value     bigint default 0,
  founded         int,
  data_source     text,
  fetched_at      timestamptz default now()
);
create index clubs_league_idx on clubs(league_id);

create table players (
  id           text primary key,
  slug         text unique not null,
  name         text not null,
  position     text,                       -- GK/DEF/MID/FWD (normalized)
  detailed_pos text,                        -- ST/AM/CB etc.
  age          int,
  dob          date,
  nationality  text,
  club_id      text references clubs(id) on delete set null,
  height_cm    int,
  foot         text,
  shirt_no     int,
  data_source  text,
  fetched_at   timestamptz default now()
);
create index players_club_idx on players(club_id);

create table player_stats (
  player_id    text references players(id) on delete cascade,
  season       int not null,
  apps         int default 0,
  minutes      int default 0,
  goals        int default 0,
  assists      int default 0,
  goals_p90    real,
  assists_p90  real,
  xg           real,                        -- nullable: honest "limited data"
  xa           real,
  rating       real,
  data_source  text,
  fetched_at   timestamptz default now(),
  primary key (player_id, season)
);

create table fixtures (
  id           text primary key,
  competition  text,
  home_id      text references clubs(id) on delete set null,
  away_id      text references clubs(id) on delete set null,
  kickoff      timestamptz,
  status       text,                        -- scheduled/live/finished
  score_home   int,
  score_away   int,
  data_source  text,
  fetched_at   timestamptz default now()
);

create table transfers (
  id           text primary key,
  player_id    text references players(id) on delete set null,
  from_club_id text references clubs(id) on delete set null,
  to_club_id   text references clubs(id) on delete set null,
  fee          bigint,
  type         text,                        -- transfer/loan/free
  status       text,                        -- confirmed/rumored/official
  confidence   int,                         -- 0-100 for rumors
  date         date,
  source       text,
  data_source  text,
  fetched_at   timestamptz default now()
);
create index transfers_player_idx on transfers(player_id);

create table national_teams (
  id           text primary key,
  slug         text unique not null,
  name         text not null,
  confederation text,
  fifa_rank    int,
  group_letter text,
  manager_id   text references managers(id) on delete set null,
  squad_value  bigint default 0,
  data_source  text,
  fetched_at   timestamptz default now()
);

create table national_team_squads (
  national_team_id text references national_teams(id) on delete cascade,
  player_id        text references players(id) on delete cascade,
  caps             int,
  primary key (national_team_id, player_id)
);

-- ============ VALUATIONS ============
create table player_valuations (
  player_id     text primary key references players(id) on delete cascade,
  value_eur     bigint not null,
  pillar_scores jsonb not null default '{}',
  confidence_pct int not null default 50,
  band_low      bigint not null,
  band_high     bigint not null,
  model_version text not null,
  computed_at   timestamptz default now()
);

create table valuation_history (
  player_id  text references players(id) on delete cascade,
  date       date not null,
  value_eur  bigint not null,
  primary key (player_id, date)
);
create index valhist_player_date_idx on valuation_history(player_id, date desc);

-- ============ USER ============
create table profiles (
  id           uuid primary key,            -- == auth.users.id
  username     text unique,
  display_name text,
  tier         text not null default 'free' check (tier in ('free','plus','pro')),
  created_at   timestamptz default now()
);

create table watchlist_items (
  profile_id      uuid references profiles(id) on delete cascade,
  player_id       text references players(id) on delete cascade,
  alert_threshold bigint,
  added_at        timestamptz default now(),
  primary key (profile_id, player_id)
);

create table alerts (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  player_id  text references players(id) on delete cascade,
  type       text not null,                 -- price_cross/rumor/injury
  condition  jsonb not null default '{}',
  active      boolean not null default true,
  created_at timestamptz default now()
);

create table notifications (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  type       text not null,
  payload    jsonb not null default '{}',
  read       boolean not null default false,
  created_at timestamptz default now()
);
create index notifications_profile_idx on notifications(profile_id, created_at desc);

-- ============ RLS ============
-- Football + valuation tables are public-read (no RLS needed for anon SELECT;
-- writes happen only via service-role key which bypasses RLS).
-- User tables: enable RLS, owner-only access.
alter table profiles        enable row level security;
alter table watchlist_items enable row level security;
alter table alerts          enable row level security;
alter table notifications   enable row level security;

create policy "own profile"  on profiles        for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "own watchlist" on watchlist_items for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);
create policy "own alerts"    on alerts          for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);
create policy "own notifs"    on notifications   for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);
```

- [ ] **Step 2: Lint the SQL visually** — confirm no trailing commas, all FKs reference existing tables, every `create index` targets a real column. (No tooling step; read it top-to-bottom.)

---

### Task 5: Apply migration + generate types

- [ ] **Step 1: Apply** — via MCP `apply_migration` (name `0001_init`, the SQL above) OR CLI:
```bash
cd "/Users/perezmoodley/onside-b2c"
npx supabase link --project-ref <ref>
npx supabase db push
```
Expected: migration applies with no errors.

- [ ] **Step 2: Verify tables exist** — MCP `list_tables` (or dashboard). Expected: 15 tables present.

- [ ] **Step 3: Generate TS types** — MCP `generate_typescript_types` (or CLI) → write to `src/lib/db/types.ts`:
```bash
npx supabase gen types typescript --project-id <ref> > src/lib/db/types.ts
```
Expected: `src/lib/db/types.ts` exports a `Database` type with all tables.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0001_init.sql src/lib/db/types.ts
git commit -m "feat: initial Supabase schema (football + valuations + user) and generated types"
```

---

### Task 6: Typed Supabase clients

**Files:**
- Create: `src/lib/db/admin.ts` (service-role; server-only writes)
- Create: `src/lib/db/server.ts` (anon; Server Component reads)

- [ ] **Step 1: Admin (service-role) client**

Create `src/lib/db/admin.ts`:
```ts
import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { env } from "@/lib/env";

/** Service-role client for ingestion/writes. NEVER import into client components. */
export function adminDb() {
  const e = env();
  return createClient<Database>(e.NEXT_PUBLIC_SUPABASE_URL, e.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
```

- [ ] **Step 2: Server (anon) read client**

Create `src/lib/db/server.ts`:
```ts
import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { env } from "@/lib/env";

/** Read-only anon client for Server Components (public data; RLS applies). */
export function readDb() {
  const e = env();
  return createClient<Database>(e.NEXT_PUBLIC_SUPABASE_URL, e.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/db/admin.ts src/lib/db/server.ts
git commit -m "feat: typed Supabase admin + read clients"
```

---

### Task 7: Health check route

**Files:**
- Create: `src/lib/db/health.ts`, `src/lib/db/health.test.ts`
- Create: `src/app/api/health/route.ts`

- [ ] **Step 1: Failing test for the health checker**

Create `src/lib/db/health.test.ts`:
```ts
import { describe, it, expect, vi } from "vitest";
import { checkDb } from "./health";

describe("checkDb", () => {
  it("returns ok:true when the query succeeds", async () => {
    const fake = { from: () => ({ select: () => ({ limit: async () => ({ error: null }) }) }) };
    const res = await checkDb(fake as never);
    expect(res.ok).toBe(true);
  });
  it("returns ok:false with the error message on failure", async () => {
    const fake = { from: () => ({ select: () => ({ limit: async () => ({ error: { message: "boom" } }) }) }) };
    const res = await checkDb(fake as never);
    expect(res).toEqual({ ok: false, error: "boom" });
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npm test src/lib/db/health.test.ts`
Expected: FAIL — `Cannot find module './health'`.

- [ ] **Step 3: Implement the checker**

Create `src/lib/db/health.ts`:
```ts
import type { SupabaseClient } from "@supabase/supabase-js";

export type HealthResult = { ok: true } | { ok: false; error: string };

/** Cheap connectivity probe: select 1 row from leagues. */
export async function checkDb(db: Pick<SupabaseClient, "from">): Promise<HealthResult> {
  const { error } = await db.from("leagues").select("id").limit(1);
  return error ? { ok: false, error: error.message } : { ok: true };
}
```

- [ ] **Step 4: Run tests to confirm pass**

Run: `npm test src/lib/db/health.test.ts`
Expected: PASS.

- [ ] **Step 5: Wire the route**

Create `src/app/api/health/route.ts`:
```ts
import { NextResponse } from "next/server";
import { readDb } from "@/lib/db/server";
import { checkDb } from "@/lib/db/health";

export const dynamic = "force-dynamic";

export async function GET() {
  const res = await checkDb(readDb());
  return NextResponse.json(res, { status: res.ok ? 200 : 503 });
}
```

- [ ] **Step 6: Manual verification against the live DB**

Run:
```bash
cd "/Users/perezmoodley/onside-b2c" && npm run dev &
sleep 6 && curl -s http://localhost:3000/api/health ; echo ; kill %1
```
Expected: `{"ok":true}` (empty `leagues` table still returns ok — the query succeeds with zero rows).

- [ ] **Step 7: Commit**

```bash
git add src/lib/db/health.ts src/lib/db/health.test.ts src/app/api/health/route.ts
git commit -m "feat: DB health checker + /api/health route"
```

---

### Task 8: Verify build + push branch

- [ ] **Step 1: Typecheck**

Run: `cd "/Users/perezmoodley/onside-b2c" && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 2: Full test run**

Run: `npm test`
Expected: all suites pass.

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: build succeeds (per `AGENTS.md`, if any Next 16 API warns as changed, read `node_modules/next/dist/docs/` before adjusting).

- [ ] **Step 4: Set Vercel env (production)** — add `API_FOOTBALL_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` to the `onside-b2c` Vercel project (via Vercel MCP `create`/dashboard). Service-role key = server env only, never `NEXT_PUBLIC_`.

- [ ] **Step 5: Push**

```bash
git -C "/Users/perezmoodley/onside-b2c" push -u origin feat/wc-launch
```
Expected: branch pushed; Vercel preview deploy starts.

---

## Self-Review

- **Spec coverage:** Implements spec §5 (architecture clients), §6 (full data model — all 15 tables present incl. provenance + RLS), and the test-harness portion of §12. Ingestion (§2-pipeline), valuation (§7), pages (§4/§5), auth (§6-decisions), and the core loop are intentionally out of scope for Plan 01 and covered by Plans 02–08.
- **Placeholder scan:** No TBD/TODO. The only `<placeholders>` are credential values (`<url>`, `<ref>`) that must be filled from the live Supabase project at execution — unavoidable and explicitly sourced in Task 3/5.
- **Type consistency:** `Database` type (Task 5) is consumed by `admin.ts`/`server.ts` (Task 6); `checkDb` signature (Task 7) matches its test; `parseEnv`/`env` (Task 2) consumed by both clients. Table/column names in the migration match those referenced by `checkDb` (`leagues.id`).
