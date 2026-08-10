import { describe, it, expect } from "vitest";
import { validateUsername, normalizeUsername, RESERVED_USERNAMES } from "./username";

describe("normalizeUsername", () => {
  it("lowercases, trims and drops a leading @", () => {
    expect(normalizeUsername("  @Perez  ")).toBe("perez");
  });
});

describe("validateUsername", () => {
  it("accepts an ordinary handle", () => {
    expect(validateUsername("perez")).toBeNull();
    expect(validateUsername("perez_99")).toBeNull();
  });
  it("accepts the boundary lengths", () => {
    expect(validateUsername("abc")).toBeNull();
    expect(validateUsername("a".repeat(20))).toBeNull();
  });
  it("rejects handles outside the length bounds", () => {
    expect(validateUsername("ab")).toBe("too_short");
    expect(validateUsername("a".repeat(21))).toBe("too_long");
  });
  it("rejects anything outside [a-z0-9_]", () => {
    expect(validateUsername("perez-99")).toBe("bad_charset");
    expect(validateUsername("perez.99")).toBe("bad_charset");
    expect(validateUsername("pérez")).toBe("bad_charset");
  });
  it("requires a leading letter so handles never read as numbers", () => {
    expect(validateUsername("9perez")).toBe("bad_start");
    expect(validateUsername("_perez")).toBe("bad_start");
  });
  it("rejects a trailing underscore", () => {
    expect(validateUsername("perez_")).toBe("bad_end");
  });
  it("rejects route collisions and impersonation traps", () => {
    expect(validateUsername("transfers")).toBe("reserved");
    expect(validateUsername("admin")).toBe("reserved");
    expect(validateUsername("Onside")).toBe("reserved");
    expect(validateUsername("record")).toBe("reserved");
  });
  it("validates the normalized form, so case never smuggles a reserved word through", () => {
    expect(validateUsername("  @ADMIN ")).toBe("reserved");
  });
  it("every reserved word is itself rejected", () => {
    for (const w of RESERVED_USERNAMES) expect(validateUsername(w)).not.toBeNull();
  });
});
