import { describe, it, expect } from "vitest";
import { breakSummary } from "./romano-watch";

describe("breakSummary", () => {
  it("reads as a confirmed-break Wire summary", () => {
    expect(breakSummary("Liverpool", "Here we go! Liverpool sign Florian Wirtz, €130m.")).toBe(
      "Here We Go — Liverpool. Here we go! Liverpool sign Florian Wirtz, €130m.",
    );
  });
});
