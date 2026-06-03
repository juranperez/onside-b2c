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
    throw new Error(
      `Invalid environment: ${parsed.error.issues.map((i) => i.path.join(".")).join(", ")}`,
    );
  }
  return parsed.data;
}

/** Lazily-validated process env (server-side). */
let cached: Env | null = null;
export function env(): Env {
  if (!cached) cached = parseEnv(process.env);
  return cached;
}
