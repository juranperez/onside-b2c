import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { checkUsername, normalizeUsername, RESERVED_USERNAMES, USERNAME_MAX } from "./username";

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
  // Migration 0005 carries this as a CHECK constraint. The pattern below is read out of
  // that file rather than hand-copied, because a transcribed literal agrees with itself,
  // not with the database — edit the .sql and a hardcoded regex here would stay green.
  // The DB has no reserved-word list, so reserved candidates are skipped below.
  function readDbUsernameRegex(): RegExp {
    const here = dirname(fileURLToPath(import.meta.url));
    const migrationPath = join(here, "..", "..", "..", "supabase", "migrations", "0005_public_profiles.sql");
    const sql = readFileSync(migrationPath, "utf8");
    // Anchor on the ADD CONSTRAINT statement itself, not just the constraint's name —
    // the name alone also appears in this file's rollback comments, which don't carry
    // the pattern and would make the extraction below find nothing from that point on.
    const anchor = sql.indexOf("add constraint profiles_username_format");
    if (anchor === -1) {
      throw new Error(
        `Could not find "add constraint profiles_username_format" in ${migrationPath} — ` +
          "the DB-agreement sweep has nothing to compare checkUsername against.",
      );
    }
    const match = sql.slice(anchor).match(/username ~ '([^']+)'/);
    if (!match) {
      throw new Error(
        `Found the profiles_username_format constraint in ${migrationPath} but couldn't ` +
          "extract its pattern (expected `username ~ '...'`). Refusing to fall back to a " +
          "hardcoded regex — that would silently recreate the drift this test exists to catch.",
      );
    }
    return new RegExp(match[1]);
  }

  const DB_RE = readDbUsernameRegex();
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

  // The exhaustive sweep only reaches length 4, so on its own it can never reach the
  // USERNAME_MAX ceiling (20 today) — a DB_RE hardcoded to the wrong length would sail
  // through it clean. These extra candidates are derived from the constant itself, so if
  // USERNAME_MAX ever moves without a matching edit to the migration, this sweep is what
  // catches the drift instead of shipping it.
  const exhaustive = combinations(CHARSET, 4);
  const candidates = [
    ...exhaustive,
    ...[USERNAME_MAX - 1, USERNAME_MAX, USERNAME_MAX + 1].flatMap((n) => [
      "a".repeat(n),
      "a".repeat(n - 1) + "_",
      "a".repeat(n - 1) + "9",
    ]),
  ];

  it("agrees with the DB regex on every generated candidate up to length 4, plus the USERNAME_MAX boundary", () => {
    // Each of these checks the sweep's own coverage, not checkUsername — and each would
    // stay green even if the property it names were silently deleted. That is exactly
    // what a bare `candidates.length > 1000` check (satisfied by the length-4
    // combinatorics alone, ~7,380 of them) failed to catch before.
    expect(exhaustive.length).toBeGreaterThan(1000); // the exhaustive sweep actually ran
    expect(candidates.some((c) => c.length === USERNAME_MAX)).toBe(true); // reaches the ceiling
    expect(candidates.some((c) => c.length > USERNAME_MAX)).toBe(true); // and goes past it
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
