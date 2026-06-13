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
  it("is false after the final day", () => {
    expect(isWcWindow(new Date("2026-07-20T00:00:01Z"))).toBe(false);
  });
});
