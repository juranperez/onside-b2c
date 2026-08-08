import { describe, it, expect } from "vitest";
import { buildPrompt, SYSTEM, type ArticleFacts } from "./compose";

const facts: ArticleFacts = {
  player: "Joe Bloggs",
  fromClub: "Brighton",
  toClub: "Chelsea",
  position: "CM",
  stage: "Bid",
  source: "The Athletic",
  corroborations: 3,
  reportedFeeM: 50,
  onsideValueM: 40,
  verdict: "Above our value",
  confidencePct: 62,
  eventType: "stage_advance",
  summary: "Chelsea lodge a bid for the midfielder",
};

describe("compose", () => {
  it("forbids invention and quotes in the system prompt", () => {
    expect(SYSTEM).toMatch(/never invent/i);
    expect(SYSTEM).toMatch(/quote/i);
  });

  it("puts every fact in the prompt so the model needs to invent nothing", () => {
    const p = buildPrompt(facts);
    for (const v of ["Joe Bloggs", "Chelsea", "Brighton", "The Athletic", "50", "40", "62"]) {
      expect(p).toContain(v);
    }
  });

  it("separates the lead source from the all-outlet report count", () => {
    const p = buildPrompt(facts);
    expect(p).toMatch(/Lead source[^\n]*The Athletic/);
    expect(p).toMatch(/outlets following this story in total[^\n]*3/);
  });

  it("never leaks the internal trigger into the prompt", () => {
    expect(buildPrompt(facts)).not.toContain("stage_advance");
  });

  it("instructs a specific, keyword-rich headline and bans process talk", () => {
    expect(SYSTEM).toMatch(/name the player AND the destination club/i);
    expect(SYSTEM).toMatch(/never explain why this briefing is being published/i);
  });

  it("names the source so the draft can satisfy the attribution check", () => {
    expect(buildPrompt(facts)).toContain("The Athletic");
  });

  it("describes a missing fee without inventing one", () => {
    expect(buildPrompt({ ...facts, reportedFeeM: null })).toContain("not reported");
    expect(buildPrompt({ ...facts, reportedFeeM: 0 })).toContain("free transfer");
  });
});
