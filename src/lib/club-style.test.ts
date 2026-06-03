import { describe, it, expect } from "vitest";
import { clubStyle, monogram } from "./club-style";

describe("clubStyle", () => {
  it("is deterministic and returns hex colors", () => {
    const a = clubStyle("liverpool");
    expect(a).toEqual(clubStyle("liverpool"));
    expect(a.bg).toMatch(/^#[0-9A-F]{6}$/i);
    expect(a.color).toMatch(/^#[0-9A-F]{6}$/i);
  });
  it("varies across clubs", () => {
    const slugs = ["liverpool", "real-madrid", "bayern-munich", "psg", "juventus"];
    const bgs = new Set(slugs.map((s) => clubStyle(s).bg));
    expect(bgs.size).toBeGreaterThan(1);
  });
  it("handles empty input without throwing", () => {
    expect(clubStyle("").bg).toMatch(/^#/);
  });
});

describe("monogram", () => {
  it("builds an initials tile from the club name", () => {
    expect(monogram("Manchester United")).toBe("MUN");
    expect(monogram("Liverpool")).toBe("LIV");
    expect(monogram("")).toBe("FC");
  });
});
