import { describe, it, expect } from "vitest";
import { breakSummary } from "./romano-watch";

describe("breakSummary", () => {
  it("carries the reporter's own words, with no borrowed catchphrase prefix", () => {
    expect(breakSummary("Liverpool", "Here we go! Liverpool sign Florian Wirtz, €130m.")).toBe(
      "Here we go! Liverpool sign Florian Wirtz, €130m.",
    );
  });

  it("never prefixes Onside copy with another outlet's catchphrase", () => {
    // Onside brands breaks by the reporter's NAME; the destination already lives
    // in the structured to_club field, so nothing needs inventing here.
    expect(breakSummary("Arsenal", "EXCL: Arsenal set to sign the midfielder.")).not.toMatch(/here we go —/i);
  });

  it("trims but otherwise leaves the report untouched", () => {
    expect(breakSummary("Chelsea", "  Chelsea agree deal.  ")).toBe("Chelsea agree deal.");
  });
});
