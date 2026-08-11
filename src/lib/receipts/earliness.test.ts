import { describe, it, expect } from "vitest";
import { earlinessOf } from "./earliness";

describe("earlinessOf", () => {
  it("an early 'Linked' call is worth more than a late 'Agreed' call", () => {
    expect(earlinessOf("Linked")).toBeGreaterThan(earlinessOf("Agreed"));
  });
  it("a 'Done'-stage call carries no earliness bonus", () => {
    expect(earlinessOf("Done")).toBe(0);
  });
  it("returns values in [0,1]", () => {
    for (const s of ["Linked", "Talks", "Bid", "Agreed", "Medical", "Done"] as const) {
      const e = earlinessOf(s);
      expect(e).toBeGreaterThanOrEqual(0);
      expect(e).toBeLessThanOrEqual(1);
    }
  });
});
