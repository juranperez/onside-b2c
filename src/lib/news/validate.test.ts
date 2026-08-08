import { describe, it, expect } from "vitest";
import { validateArticle, type ValidateContext } from "./validate";

const ok = {
  title: "Chelsea move for Joe Bloggs reaches bid stage",
  dek: "The Athletic reports a formal bid; Onside values the midfielder at EUR 50m.",
  body:
    "The Athletic reports that Chelsea have lodged a formal bid for the Brighton midfielder. " +
    "Onside's model estimates the player's value at EUR 50m, which makes the reported fee broadly fair " +
    "against our valuation. The saga has been tracked across three independent reports so far.",
};
const ctx: ValidateContext = { sourceName: "The Athletic", status: "rumour" };

describe("validateArticle", () => {
  it("accepts an attributed, hedged, data-backed draft", () => {
    expect(validateArticle(ok, ctx).ok).toBe(true);
  });

  it("rejects fabricated quotes — we never supply speech, so any is invented", () => {
    const r = validateArticle({ ...ok, body: `${ok.body} "I am delighted to be here," said Bloggs.` }, ctx);
    expect(r).toMatchObject({ ok: false, reason: "fabricated-quote" });
  });

  it("rejects a draft that never attributes its reporting", () => {
    const body =
      "Chelsea have lodged a formal bid worth EUR 50m for the Brighton midfielder, and Onside's model " +
      "estimates his value at EUR 50m, which makes the reported fee broadly fair against our valuation.";
    expect(validateArticle({ ...ok, body }, ctx)).toMatchObject({ ok: false, reason: "missing-attribution" });
  });

  it("rejects the data supplier's name and governing-body marks", () => {
    expect(validateArticle({ ...ok, body: `${ok.body} Data via Sportmonks.` }, ctx)).toMatchObject({
      ok: false,
      reason: "banned-token",
    });
    expect(validateArticle({ ...ok, body: `${ok.body} Ahead of the FIFA World Cup.` }, ctx)).toMatchObject({
      ok: false,
      reason: "banned-token",
    });
  });

  it("rejects stating an unconfirmed rumour as fact", () => {
    expect(validateArticle({ ...ok, title: "Joe Bloggs has signed for Chelsea" }, ctx)).toMatchObject({
      ok: false,
      reason: "unhedged-claim",
    });
  });

  it("allows completed language once the deal really is confirmed", () => {
    const r = validateArticle({ ...ok, title: "Joe Bloggs has signed for Chelsea" }, { ...ctx, status: "confirmed" });
    expect(r.ok).toBe(true);
  });

  it("rejects drafts too short to be useful", () => {
    expect(validateArticle({ ...ok, body: "Short." }, ctx)).toMatchObject({ ok: false, reason: "too-short" });
  });
});
