// src/lib/push/goal-copy.test.ts
import { describe, it, expect } from "vitest";
import { goalPushCopy } from "./goal-copy";

describe("goalPushCopy", () => {
  it("builds title/body/url for a goal", () => {
    const c = goalPushCopy({
      scorerName: "Tyler Adams", scorerSlug: "tyler-adams-100",
      home: "USA", away: "Paraguay", scoreHome: 2, scoreAway: 0,
    });
    expect(c.title).toBe("⚽ Tyler Adams scores!");
    expect(c.body).toBe("USA 2–0 Paraguay");
    expect(c.url).toBe("/players/tyler-adams-100");
  });
});
