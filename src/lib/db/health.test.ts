import { describe, it, expect } from "vitest";
import { checkDb } from "./health";

describe("checkDb", () => {
  it("returns ok:true when the query succeeds", async () => {
    const fake = { from: () => ({ select: () => ({ limit: async () => ({ error: null }) }) }) };
    const res = await checkDb(fake as never);
    expect(res.ok).toBe(true);
  });
  it("returns ok:false with the error message on failure", async () => {
    const fake = {
      from: () => ({ select: () => ({ limit: async () => ({ error: { message: "boom" } }) }) }),
    };
    const res = await checkDb(fake as never);
    expect(res).toEqual({ ok: false, error: "boom" });
  });
});
