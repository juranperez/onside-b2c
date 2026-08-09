import { describe, it, expect } from "vitest";
import { extractFeeEur, isFreeTransfer } from "./fee";

describe("extractFeeEur", () => {
  it("reads plain euro fees", () => {
    expect(extractFeeEur("Chelsea agree €55m deal")).toBe(55_000_000);
    expect(extractFeeEur("a €4.5m loan fee")).toBe(4_500_000);
    expect(extractFeeEur("€1.2bn valuation")).toBe(1_200_000_000);
  });

  it("CONVERTS sterling instead of treating it as euros", () => {
    // The real Stones case: "£40m" stored as €40m understated the fee and could
    // flip the fee-vs-value verdict.
    expect(extractFeeEur("Leeds agree £40m club-record deal")).toBe(46_800_000);
  });

  it("converts dollars too", () => {
    expect(extractFeeEur("a $50m package")).toBe(46_000_000);
  });

  it("reads currency codes and worded amounts", () => {
    expect(extractFeeEur("fee of EUR 25m")).toBe(25_000_000);
    expect(extractFeeEur("worth 30 million euros")).toBe(30_000_000);
    expect(extractFeeEur("GBP 20m rising")).toBe(23_400_000);
  });

  it("takes the FIRST figure — the headline fixed fee, not add-ons or options", () => {
    expect(extractFeeEur("€30m fixed fee plus €6m in add-ons")).toBe(30_000_000);
    expect(extractFeeEur("initial loan costing €4m with an €11m buy-option")).toBe(4_000_000);
  });

  it("reads fees embedded in prose, as breaking posts write them", () => {
    expect(extractFeeEur("Real Madrid have activated the €25m release clause")).toBe(25_000_000);
    expect(extractFeeEur("Medical completed on the €41m package move")).toBe(41_000_000);
  });

  it("returns null rather than guessing when no fee is reported", () => {
    expect(extractFeeEur("Newcastle get transfer green light")).toBeNull();
    expect(extractFeeEur("he wore the number 9 shirt")).toBeNull();
  });
});

describe("isFreeTransfer", () => {
  it("detects free transfers only", () => {
    expect(isFreeTransfer("joins on a free transfer")).toBe(true);
    expect(isFreeTransfer("available as a free agent")).toBe(true);
    expect(isFreeTransfer("a €10m deal")).toBe(false);
  });
});
