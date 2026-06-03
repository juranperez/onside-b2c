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
