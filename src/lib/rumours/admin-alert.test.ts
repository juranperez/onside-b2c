import { describe, it, expect } from "vitest";
import { breakAlertMessage } from "./admin-alert";

describe("breakAlertMessage", () => {
  it("names the player, club and a manage link", () => {
    const m = breakAlertMessage({ player: "Florian Wirtz", club: "Liverpool", rumourId: "r1", source: "Fabrizio Romano" });
    expect(m.subject).toBe("🚨 Break live: Florian Wirtz → Liverpool (Fabrizio Romano)");
    expect(m.body).toContain("Retract");
    expect(m.body).toContain("/transfers/manage");
  });
});
