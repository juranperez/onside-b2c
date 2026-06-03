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
