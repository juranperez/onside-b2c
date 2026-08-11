import { describe, it, expect } from "vitest";
import { feeVerdict } from "./fee-verdict";

describe("feeVerdict", () => {
  it("returns null when there's nothing to judge", () => {
    expect(feeVerdict(null, 50)).toBeNull();
    expect(feeVerdict(50, 0)).toBeNull();
  });

  it("a free transfer of a valued player is pure value gain", () => {
    expect(feeVerdict(0, 50)).toEqual({ label: "Free — pure value gain", tone: "up" });
  });

  it("bands fee-vs-value into fair / above / overpay", () => {
    expect(feeVerdict(50, 50)?.tone).toBe("up"); // ratio 1.0 → fair
    expect(feeVerdict(55, 50)?.tone).toBe("up"); // 1.1 boundary → fair
    expect(feeVerdict(80, 50)?.tone).toBe("acc"); // 1.6 → above value
    expect(feeVerdict(90, 50)?.tone).toBe("acc"); // 1.8 boundary → above value
    expect(feeVerdict(120, 50)?.tone).toBe("down"); // 2.4 → overpay
  });
});
