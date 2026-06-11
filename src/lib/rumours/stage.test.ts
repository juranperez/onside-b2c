import { describe, it, expect } from "vitest";
import { stageOf } from "./stage";

describe("stageOf", () => {
  it("confirmed status is always Done", () => {
    expect(stageOf("anything", "confirmed")).toBe("Done");
  });

  it("detects medicals", () => {
    expect(stageOf("Player set for medical on Thursday", "rumour")).toBe("Medical");
  });

  it("detects agreements (here we go, personal terms)", () => {
    expect(stageOf("'Here we go' — deal agreed", "rumour")).toBe("Agreed");
    expect(stageOf("Striker has agreed personal terms with Roma", "rumour")).toBe("Agreed");
  });

  it("detects bids and record fees", () => {
    expect(stageOf("Forest want British record as Man City have bid rejected", "rumour")).toBe("Bid");
    expect(stageOf("City make €123m offer for midfielder", "rumour")).toBe("Bid");
  });

  it("detects talks", () => {
    expect(stageOf("Juventus have held talks with the agent", "rumour")).toBe("Talks");
  });

  it("falls back to Linked", () => {
    expect(stageOf("Arsenal keeping tabs on winger", "rumour")).toBe("Linked");
  });
});
