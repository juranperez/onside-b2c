import { describe, it, expect } from "vitest";
import { isHereWeGo, breakText } from "./here-we-go";
import type { BskyPost } from "./bluesky";

const post = (text: string, imageAlt?: string): BskyPost => ({
  uri: "at://x", text, createdAt: "2026-06-13T14:00:00Z", imageAlt,
});

describe("isHereWeGo", () => {
  it("fires on his trademark confirmed break", () => {
    expect(isHereWeGo(post("Here we go! Liverpool sign Florian Wirtz, deal completed."))).toBe(true);
    expect(isHereWeGo(post("HERE WE GO 🚨 Real Madrid agree deal for Alphonso Davies."))).toBe(true);
  });
  it("does NOT fire on hedged / question / quoted-other uses", () => {
    expect(isHereWeGo(post("Could this be here we go soon? Talks ongoing."))).toBe(false);
    expect(isHereWeGo(post("Not yet here we go — still negotiating."))).toBe(false);
    expect(isHereWeGo(post("Big week ahead in the transfer market."))).toBe(false);
  });
});

describe("breakText", () => {
  it("uses the post text, appending image alt for entity context", () => {
    expect(breakText(post("Here we go! Liverpool sign Florian Wirtz.", "Wirtz Liverpool"))).toBe(
      "Here we go! Liverpool sign Florian Wirtz. Wirtz Liverpool",
    );
  });
  it("is just the text when there is no image alt", () => {
    expect(breakText(post("Here we go! Spurs sign Senesi."))).toBe("Here we go! Spurs sign Senesi.");
  });
});
