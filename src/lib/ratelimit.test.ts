import { describe, it, expect, beforeEach } from "vitest";
import { rateLimit, resetRateLimits } from "./ratelimit";

describe("rateLimit", () => {
  beforeEach(() => resetRateLimits());

  it("allows up to max requests in a window", () => {
    const t0 = 1_000_000;
    expect(rateLimit("k", 3, 60_000, t0).ok).toBe(true);
    expect(rateLimit("k", 3, 60_000, t0 + 1).ok).toBe(true);
    expect(rateLimit("k", 3, 60_000, t0 + 2).ok).toBe(true);
    const denied = rateLimit("k", 3, 60_000, t0 + 3);
    expect(denied.ok).toBe(false);
    expect(denied.retryAfterSec).toBeGreaterThan(0);
  });

  it("resets after the window elapses", () => {
    const t0 = 1_000_000;
    rateLimit("k", 1, 60_000, t0);
    expect(rateLimit("k", 1, 60_000, t0 + 1).ok).toBe(false);
    expect(rateLimit("k", 1, 60_000, t0 + 60_001).ok).toBe(true);
  });

  it("tracks keys independently", () => {
    const t0 = 1_000_000;
    rateLimit("a", 1, 60_000, t0);
    expect(rateLimit("a", 1, 60_000, t0 + 1).ok).toBe(false);
    expect(rateLimit("b", 1, 60_000, t0 + 1).ok).toBe(true);
  });

  it("reports remaining quota", () => {
    const t0 = 1_000_000;
    expect(rateLimit("r", 5, 60_000, t0).remaining).toBe(4);
    expect(rateLimit("r", 5, 60_000, t0 + 1).remaining).toBe(3);
  });
});
