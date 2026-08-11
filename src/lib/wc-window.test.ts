import { describe, it, expect } from "vitest";
import { isWcWindow } from "./wc-window";

describe("isWcWindow", () => {
  it("is false before kickoff day", () => {
    expect(isWcWindow(new Date("2026-06-10T23:59:59Z"))).toBe(false);
  });
  it("is true on kickoff day", () => {
    expect(isWcWindow(new Date("2026-06-11T00:00:00Z"))).toBe(true);
  });
  it("is true mid-tournament", () => {
    expect(isWcWindow(new Date("2026-07-01T12:00:00Z"))).toBe(true);
  });
  it("is true through the final (July 19)", () => {
    expect(isWcWindow(new Date("2026-07-19T23:00:00Z"))).toBe(true);
  });
  it("is true late on final night in ET (early July 20 UTC)", () => {
    expect(isWcWindow(new Date("2026-07-20T02:00:00Z"))).toBe(true);
  });
  it("is false once July 19 ends in ET", () => {
    expect(isWcWindow(new Date("2026-07-20T04:00:01Z"))).toBe(false);
  });
});
