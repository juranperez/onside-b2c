import { describe, it, expect } from "vitest";
import { stageOf, doneLanguage } from "./stage";

describe("doneLanguage — the Senesi class (announced deals must read as done)", () => {
  it("club-subject present simple with a free transfer is done", () => {
    expect(doneLanguage("Marcos Senesi: Tottenham sign Bournemouth defender on free transfer after four-year stay at Cherries")).toBe(true);
  });

  it("OFFICIAL prefix and completed-action verbs are done", () => {
    expect(doneLanguage("OFFICIAL: Marcos Senesi joins Tottenham on a free transfer from Bournemouth")).toBe(true);
    expect(doneLanguage("Senesi signs for Spurs until 2030")).toBe(true);
    expect(doneLanguage("Tottenham have signed Marcos Senesi")).toBe(true);
    expect(doneLanguage("Senesi completes move to Tottenham")).toBe(true);
    expect(doneLanguage("Senesi unveiled as Tottenham's first summer signing")).toBe(true);
    expect(doneLanguage("Tottenham confirmed the signing of Marcos Senesi")).toBe(true);
  });

  it("hedged/future forms are NOT done", () => {
    expect(doneLanguage("Senesi set to sign for Tottenham")).toBe(false);
    expect(doneLanguage("Tottenham want to sign Bournemouth defender on a free transfer")).toBe(false);
    expect(doneLanguage("Senesi will join Spurs when his contract expires")).toBe(false);
    expect(doneLanguage("Senesi close to completing move to Tottenham")).toBe(false);
    expect(doneLanguage("Spurs join race to sign Bournemouth defender")).toBe(false);
    expect(doneLanguage("Senesi expected to be unveiled next week")).toBe(false);
  });

  it("question headlines and progress reports are never done", () => {
    expect(doneLanguage("Who could Spurs sign from the free agent market?")).toBe(false);
    expect(doneLanguage("Manchester City have second bid rejected for Nottingham Forest midfielder")).toBe(false);
    expect(doneLanguage("Club official confirms interest in midfielder")).toBe(false);
    expect(doneLanguage("Official bid submitted for Forest midfielder")).toBe(false);
  });
});

describe("stageOf", () => {
  it("confirmed status is always Done", () => {
    expect(stageOf("anything", "confirmed")).toBe("Done");
  });

  it("done language reads as Done even before the status flip", () => {
    expect(stageOf("Tottenham sign Bournemouth defender on free transfer", "rumour")).toBe("Done");
  });

  it("a medical in progress stays Medical, not Done", () => {
    expect(stageOf("Senesi completes medical ahead of Tottenham move", "rumour")).toBe("Medical");
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
