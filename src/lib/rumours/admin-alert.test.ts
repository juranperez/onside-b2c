import { describe, it, expect } from "vitest";
import { breakAlertMessage } from "./admin-alert";

describe("breakAlertMessage", () => {
  it("names the player, club and a manage link", () => {
    const m = breakAlertMessage({ player: "Florian Wirtz", club: "Liverpool", rumourId: "r1" });
    expect(m.subject).toBe("🚨 Romano break live: Florian Wirtz → Liverpool");
    expect(m.body).toContain("Retract");
    expect(m.body).toContain("/transfers/manage");
  });
});
