import { z } from "zod";

/** Public config — safe for the read path and the browser. */
const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().url().optional(),
});

/** Server-only secrets — required for ingestion and writes. */
const serverSchema = z.object({
  API_FOOTBALL_KEY: z.string().min(1),
  FOOTBALL_DATA_API_KEY: z.string().optional(),
  ASA_BASE_URL: z.string().url().default("https://app.americansocceranalysis.com/api/v1"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SENTRY_DSN: z.string().optional(),
  // Ask Onside LLM cascade — both optional; /api/ask degrades to 503 when absent.
  GROQ_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  // Sportmonks (xG/positions sync + official transfers cron).
  SPORTMONKS_API_TOKEN: z.string().optional(),
});

export type PublicEnv = z.infer<typeof publicSchema>;
export type ServerEnv = z.infer<typeof serverSchema>;

function fail(error: z.ZodError): never {
  throw new Error(
    `Invalid environment: ${error.issues.map((i) => i.path.join(".")).join(", ")}`,
  );
}

export function parsePublicEnv(src: Record<string, string | undefined>): PublicEnv {
  const r = publicSchema.safeParse(src);
  if (!r.success) fail(r.error);
  return r.data;
}

export function parseServerEnv(src: Record<string, string | undefined>): ServerEnv {
  const r = serverSchema.safeParse(src);
  if (!r.success) fail(r.error);
  return r.data;
}

let pub: PublicEnv | null = null;
/** Validated public env (URL + anon). Used by the read path. */
export function publicEnv(): PublicEnv {
  if (!pub) pub = parsePublicEnv(process.env);
  return pub;
}

let srv: ServerEnv | null = null;
/** Validated server secrets (service-role + provider keys). Used by ingestion/writes. */
export function serverEnv(): ServerEnv {
  if (!srv) srv = parseServerEnv(process.env);
  return srv;
}
