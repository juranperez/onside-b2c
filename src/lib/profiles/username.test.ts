import { describe, it, expect } from "vitest";
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { checkUsername, normalizeUsername, RESERVED_USERNAMES } from "./username";

describe("normalizeUsername", () => {
  it("trims surrounding whitespace", () => {
    expect(normalizeUsername("  perez  ")).toBe("perez");
  });
  it("drops a leading @", () => {
    expect(normalizeUsername("@perez")).toBe("perez");
  });
  it("drops a run of leading @s", () => {
    expect(normalizeUsername("@@@perez")).toBe("perez");
  });
  it("lowercases", () => {
    expect(normalizeUsername("PEREZ")).toBe("perez");
  });
  it("trims, drops a leading @ and lowercases together", () => {
    expect(normalizeUsername("  @Perez  ")).toBe("perez");
  });
  it("only strips a contiguous leading run, so a space right after @ is not part of that run", () => {
    // The @ is stripped; the space that follows it is not whitespace at the string's
    // edge (trim already ran), so it survives normalization. checkUsername still
    // rejects the result — via bad_charset, since a space isn't in [a-z0-9_].
    expect(normalizeUsername("@ perez")).toBe(" perez");
  });
  it("trims a non-breaking-space-padded input", () => {
    expect(normalizeUsername(" perez ")).toBe("perez");
  });
});

describe("checkUsername", () => {
  it("accepts an ordinary handle", () => {
    expect(checkUsername("perez")).toEqual({ ok: true, username: "perez" });
    expect(checkUsername("perez_99")).toEqual({ ok: true, username: "perez_99" });
  });
  it("accepts the boundary lengths", () => {
    expect(checkUsername("abc")).toEqual({ ok: true, username: "abc" });
    expect(checkUsername("a".repeat(20))).toEqual({ ok: true, username: "a".repeat(20) });
  });
  it("rejects handles outside the length bounds", () => {
    expect(checkUsername("ab")).toEqual({ ok: false, error: "too_short" });
    expect(checkUsername("a".repeat(21))).toEqual({ ok: false, error: "too_long" });
  });
  it("reports too_short, not bad_charset, for an empty input", () => {
    // Charset also fails on "", but "at least 3 characters" is the more useful message.
    expect(checkUsername("")).toEqual({ ok: false, error: "too_short" });
  });
  it("rejects anything outside [a-z0-9_]", () => {
    expect(checkUsername("perez-99")).toEqual({ ok: false, error: "bad_charset" });
    expect(checkUsername("perez.99")).toEqual({ ok: false, error: "bad_charset" });
    expect(checkUsername("pérez")).toEqual({ ok: false, error: "bad_charset" });
  });
  it("prefers bad_charset over too_long, so a bad handle isn't diagnosed one round trip at a time", () => {
    const longWithHyphen = "a".repeat(24) + "-"; // 25 chars: too long AND bad charset
    expect(checkUsername(longWithHyphen)).toEqual({ ok: false, error: "bad_charset" });
  });
  it("requires a leading letter so handles never read as numbers", () => {
    expect(checkUsername("9perez")).toEqual({ ok: false, error: "bad_start" });
    expect(checkUsername("_perez")).toEqual({ ok: false, error: "bad_start" });
  });
  it("rejects a trailing underscore", () => {
    expect(checkUsername("perez_")).toEqual({ ok: false, error: "bad_end" });
  });
  it("rejects route collisions and impersonation traps", () => {
    expect(checkUsername("transfers")).toEqual({ ok: false, error: "reserved" });
    expect(checkUsername("admin")).toEqual({ ok: false, error: "reserved" });
    expect(checkUsername("Onside")).toEqual({ ok: false, error: "reserved" });
    expect(checkUsername("record")).toEqual({ ok: false, error: "reserved" });
  });
  it("validates the normalized form, so case never smuggles a reserved word through", () => {
    expect(checkUsername("  @ADMIN ")).toEqual({ ok: false, error: "reserved" });
  });
  it("does not throw on non-string input, and reports invalid_type", () => {
    expect(() => checkUsername(undefined)).not.toThrow();
    expect(checkUsername(undefined)).toEqual({ ok: false, error: "invalid_type" });
    expect(checkUsername(null)).toEqual({ ok: false, error: "invalid_type" });
    expect(checkUsername(42)).toEqual({ ok: false, error: "invalid_type" });
    expect(checkUsername({})).toEqual({ ok: false, error: "invalid_type" });
  });
  it("every reserved word is itself rejected", () => {
    for (const w of RESERVED_USERNAMES) expect(checkUsername(w).ok).toBe(false);
  });
  it("rejects well-formed reserved words specifically for being reserved, not for a formatting reason", () => {
    // Catches anyone reordering the reserved check above the charset/length checks:
    // words like "data-sources" are excluded here because they'd fail on charset
    // regardless of the reserved list, so they don't exercise this guarantee.
    const wellFormed = [...RESERVED_USERNAMES].filter(
      (w) => w.length >= 3 && w.length <= 20 && /^[a-z][a-z0-9_]*[a-z0-9]$/.test(w),
    );
    expect(wellFormed.length).toBeGreaterThan(0); // sanity: the filter isn't vacuous
    for (const w of wellFormed) {
      expect(checkUsername(w)).toEqual({ ok: false, error: "reserved" });
    }
  });
});

describe("agreement with the database check constraint", () => {
  // Migration 0005 (not yet written) is intended to carry this as a CHECK constraint.
  // The DB has no reserved-word list, so reserved candidates are skipped below.
  const DB_RE = /^[a-z][a-z0-9_]{1,18}[a-z0-9]$/;
  const CHARSET = ["a", "b", "9", "_", "-", "A", ".", "@", " "];

  function combinations(charset: string[], maxLen: number): string[] {
    const out: string[] = [];
    const build = (prefix: string) => {
      if (prefix.length > 0) out.push(prefix);
      if (prefix.length === maxLen) return;
      for (const c of charset) build(prefix + c);
    };
    build("");
    return out;
  }

  it("agrees with the DB regex on every generated candidate up to length 4", () => {
    const candidates = combinations(CHARSET, 4);
    expect(candidates.length).toBeGreaterThan(1000); // sanity: the sweep actually ran
    for (const candidate of candidates) {
      const normalized = normalizeUsername(candidate);
      if (RESERVED_USERNAMES.has(normalized)) continue; // the DB has no reserved list
      expect(checkUsername(candidate).ok).toBe(DB_RE.test(normalized));
    }
  });
});

describe("route sync", () => {
  it("reserves every top-level directory under src/app/(app)", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const appDir = join(here, "..", "..", "app", "(app)");
    const dirs = readdirSync(appDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
    expect(dirs.length).toBeGreaterThan(0); // sanity: we actually read real routes
    for (const dir of dirs) {
      expect(RESERVED_USERNAMES.has(dir)).toBe(true);
    }
  });
});
