import { describe, it, expect } from "vitest";
import { resolveOutcome, resolveFee } from "./resolve";

describe("resolveOutcome", () => {
  it("confirmed deal: 'will' wins, 'wont' loses", () => {
    expect(resolveOutcome("will", "confirmed")).toBe("won");
    expect(resolveOutcome("wont", "confirmed")).toBe("lost");
  });
  it("expired (window closed, no move): 'wont' wins, 'will' loses", () => {
    expect(resolveOutcome("wont", "expired")).toBe("won");
    expect(resolveOutcome("will", "expired")).toBe("lost");
  });
  it("killed_by_competing (player moved elsewhere): 'will' LOSES, 'wont' VOIDS — never a free win", () => {
    expect(resolveOutcome("will", "killed_by_competing")).toBe("lost");
    expect(resolveOutcome("wont", "killed_by_competing")).toBe("void");
  });
});

describe("resolveFee", () => {
  const VALUE = 50_000_000;
  it("free transfer -> push (no fee to compare)", () => {
    expect(resolveFee("higher", VALUE, null, "free")).toBe("push");
    expect(resolveFee("lower", VALUE, null, "free")).toBe("push");
  });
  it("undisclosed fee -> void", () => {
    expect(resolveFee("higher", VALUE, null, "undisclosed")).toBe("void");
  });
  it("disclosed fee above value: 'higher' wins, 'lower' loses", () => {
    expect(resolveFee("higher", VALUE, 70_000_000, "disclosed")).toBe("won");
    expect(resolveFee("lower", VALUE, 70_000_000, "disclosed")).toBe("lost");
  });
  it("disclosed fee below value: 'lower' wins, 'higher' loses", () => {
    expect(resolveFee("lower", VALUE, 30_000_000, "disclosed")).toBe("won");
    expect(resolveFee("higher", VALUE, 30_000_000, "disclosed")).toBe("lost");
  });
  it("disclosed fee exactly at value -> push", () => {
    expect(resolveFee("higher", VALUE, VALUE, "disclosed")).toBe("push");
  });
});
