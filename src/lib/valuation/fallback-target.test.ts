import { describe, it, expect } from "vitest";
import {
  isFallbackTarget,
  PROTECTED_MODEL_VERSIONS,
  B2B_MODEL_VERSION,
  FALLBACK_MODEL_VERSION,
  TM_REFRESH_MODEL_VERSION,
} from "./fallback-target";

describe("isFallbackTarget", () => {
  it("excludes the B2B anchored sync", () => {
    expect(isFallbackTarget(B2B_MODEL_VERSION)).toBe(false);
  });

  it("excludes the manual tm-refresh marquee overrides (a re-value must not clobber e.g. Vinícius €150M)", () => {
    expect(isFallbackTarget(TM_REFRESH_MODEL_VERSION)).toBe(false);
  });

  it("includes existing fallback players (they get recomputed)", () => {
    expect(isFallbackTarget(FALLBACK_MODEL_VERSION)).toBe(true);
  });

  it("includes any other / newly-introduced model version (so new unvalued players aren't missed)", () => {
    expect(isFallbackTarget("some-future-model")).toBe(true);
  });

  it("treats a missing model_version as not-a-target (mirrors the PostgREST .neq null behaviour)", () => {
    expect(isFallbackTarget(null)).toBe(false);
    expect(isFallbackTarget(undefined)).toBe(false);
  });
});

describe("PROTECTED_MODEL_VERSIONS", () => {
  it("protects both the B2B sync and the marquee overrides, but not the fallback set itself", () => {
    expect(PROTECTED_MODEL_VERSIONS).toContain(B2B_MODEL_VERSION);
    expect(PROTECTED_MODEL_VERSIONS).toContain(TM_REFRESH_MODEL_VERSION);
    expect(PROTECTED_MODEL_VERSIONS as readonly string[]).not.toContain(FALLBACK_MODEL_VERSION);
  });
});
