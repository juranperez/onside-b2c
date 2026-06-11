import { describe, it, expect } from "vitest";
import { extractShingles, foldTerm, classifyIntent } from "./shingles";

describe("foldTerm", () => {
  it("strips accents like the name_norm columns", () => {
    expect(foldTerm("Mbappé")).toBe("mbappe");
    expect(foldTerm("Gyökeres")).toBe("gyokeres");
    expect(foldTerm("Bellingham")).toBe("bellingham");
  });

  it("escapes LIKE wildcards", () => {
    expect(foldTerm("100%_done")).toBe("100\\%\\_done");
  });
});

describe("extractShingles", () => {
  it("pulls player names out of questions", () => {
    const s = extractShingles("How much is Mbappé worth right now?");
    expect(s).toContain("mbappe");
  });

  it("prefers bigrams for full names", () => {
    const s = extractShingles("Compare Erling Haaland and Kylian Mbappé");
    expect(s[0]).toBe("erling haaland");
    expect(s).toContain("kylian mbappe");
  });

  it("drops stopwords and short words", () => {
    const s = extractShingles("Who is the most valuable player in the world?");
    expect(s).not.toContain("most");
    expect(s).not.toContain("valuable");
    expect(s).not.toContain("the");
  });

  it("caps the candidate list", () => {
    const long = "Bellingham Haaland Mbappe Vinicius Palmer Saka Wirtz Musiala Yamal Foden Rice Rodri";
    expect(extractShingles(long).length).toBeLessThanOrEqual(8);
  });
});

describe("classifyIntent", () => {
  it("detects world cup / fixture questions", () => {
    expect(classifyIntent("Who wins Mexico vs South Korea tonight?").worldCup).toBe(true);
    expect(classifyIntent("World Cup group C standings").worldCup).toBe(true);
  });

  it("detects market questions", () => {
    expect(classifyIntent("Who is the most valuable U21 player?").market).toBe(true);
  });

  it("detects rumour questions", () => {
    expect(classifyIntent("Any transfer rumours about Anthony Gordon?").rumours).toBe(true);
  });

  it("detects comparisons", () => {
    expect(classifyIntent("Haaland vs Mbappé — who is better?").compare).toBe(true);
  });
});
