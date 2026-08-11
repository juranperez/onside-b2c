import { describe, it, expect } from "vitest";
import { slugify, buildSlug } from "./slug";

describe("slugify", () => {
  it("lowercases, strips accents and punctuation, collapses hyphens", () => {
    expect(slugify("Real Madrid")).toBe("real-madrid");
    expect(slugify("Bayern München")).toBe("bayern-munchen");
    expect(slugify("A.F.C.  Bournemouth!")).toBe("a-f-c-bournemouth");
  });
});

describe("buildSlug", () => {
  it("is keyword-rich, date-free and stable", () => {
    expect(buildSlug("marc-cucurella", "Real Madrid", "medical")).toBe("marc-cucurella-real-madrid-medical");
  });

  it("builds a distinct slug per angle so a saga's articles never collide", () => {
    expect(buildSlug("joe-bloggs", "Chelsea", "bid")).toBe("joe-bloggs-chelsea-bid");
    expect(buildSlug("joe-bloggs", "Chelsea", "confirmed")).toBe("joe-bloggs-chelsea-confirmed");
  });
});
