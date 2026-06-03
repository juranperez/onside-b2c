import { describe, it, expect } from "vitest";
import { parsePublicEnv, parseServerEnv } from "./env";

describe("parsePublicEnv", () => {
  it("throws when a required public var is missing", () => {
    expect(() => parsePublicEnv({ NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co" })).toThrow();
  });
  it("returns typed config when url + anon present", () => {
    const cfg = parsePublicEnv({
      NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
    });
    expect(cfg.NEXT_PUBLIC_SUPABASE_URL).toBe("https://x.supabase.co");
  });
});

describe("parseServerEnv", () => {
  it("throws when the service-role key is missing", () => {
    expect(() => parseServerEnv({ API_FOOTBALL_KEY: "k" })).toThrow();
  });
  it("defaults ASA_BASE_URL and returns secrets", () => {
    const cfg = parseServerEnv({ API_FOOTBALL_KEY: "k", SUPABASE_SERVICE_ROLE_KEY: "svc" });
    expect(cfg.SUPABASE_SERVICE_ROLE_KEY).toBe("svc");
    expect(cfg.ASA_BASE_URL).toContain("americansocceranalysis");
  });
});
