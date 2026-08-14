import { describe, it, expect } from "vitest";
import { planClaim, type AnonRow, type ExistingCall } from "./claim-anon";

const row = (over: Partial<AnonRow> & { subject_id: string }): AnonRow => ({
  id: "a1",
  session_id: "s1",
  subject_type: "transfer_saga",
  call_type: "outcome",
  pick: "will",
  house_confidence_pct: 31,
  house_value_eur: null,
  earliness: 0.8,
  locked_at: "2026-07-03T10:00:00.000Z",
  ...over,
});

describe("planClaim", () => {
  it("carries the ORIGINAL locked_at onto the claimed prediction", () => {
    // The whole product rests on this. Letting locked_at default to now() would reset
    // "I called it in July" to the signup date — the receipt would still exist and still
    // score, just quietly worthless. Nothing else in the system would fail.
    const { inserts } = planClaim([row({ subject_id: "deal-1" })], [], "user-1");
    expect(inserts).toHaveLength(1);
    expect(inserts[0].locked_at).toBe("2026-07-03T10:00:00.000Z");
  });

  it("carries the frozen house snapshot and earliness across unchanged", () => {
    const { inserts } = planClaim([row({ subject_id: "deal-1" })], [], "user-1");
    expect(inserts[0].house_confidence_pct).toBe(31);
    expect(inserts[0].earliness).toBe(0.8);
    expect(inserts[0].user_id).toBe("user-1");
    expect(inserts[0].pick).toBe("will");
  });

  it("copies subject_type explicitly rather than leaning on the column default", () => {
    // Both tables pin it to 'transfer_saga' today. The day anon_calls widens, an implicit
    // default would silently file a new subject type as a transfer_saga instead of erroring.
    const { inserts } = planClaim([row({ subject_id: "deal-1" })], [], "user-1");
    expect(inserts[0].subject_type).toBe("transfer_saga");
  });

  it("drops an anon call when the account already called that deal", () => {
    // Their own call was made knowingly, as themselves — it wins.
    const existing: ExistingCall[] = [{ subject_id: "deal-1", call_type: "outcome" }];
    const { inserts, dropped } = planClaim([row({ subject_id: "deal-1" })], existing, "user-1");
    expect(inserts).toHaveLength(0);
    expect(dropped).toEqual(["a1"]);
  });

  it("treats the same deal's outcome and fee calls as independent", () => {
    const existing: ExistingCall[] = [{ subject_id: "deal-1", call_type: "outcome" }];
    const anon = [row({ subject_id: "deal-1", id: "a2", call_type: "fee", pick: "higher" })];
    const { inserts } = planClaim(anon, existing, "user-1");
    expect(inserts).toHaveLength(1);
    expect(inserts[0].call_type).toBe("fee");
  });

  it("never claims the same deal twice from one batch", () => {
    // Two anon rows for one deal shouldn't both insert — the predictions unique index
    // would reject the second and take the whole batch down with it.
    const anon = [
      row({ subject_id: "deal-1", id: "a1" }),
      row({ subject_id: "deal-1", id: "a2" }),
    ];
    const { inserts, dropped } = planClaim(anon, [], "user-1");
    expect(inserts).toHaveLength(1);
    expect(dropped).toEqual(["a2"]);
  });

  it("claims every row it can and reports every id to delete", () => {
    const anon = [
      row({ subject_id: "deal-1", id: "a1" }),
      row({ subject_id: "deal-2", id: "a2" }),
      row({ subject_id: "deal-3", id: "a3" }),
    ];
    const existing: ExistingCall[] = [{ subject_id: "deal-2", call_type: "outcome" }];
    const { inserts, dropped, consumedIds } = planClaim(anon, existing, "user-1");
    expect(inserts.map((i) => i.subject_id).sort()).toEqual(["deal-1", "deal-3"]);
    expect(dropped).toEqual(["a2"]);
    // Everything is consumed — claimed or dropped — so nothing is left to re-claim later.
    expect(consumedIds.sort()).toEqual(["a1", "a2", "a3"]);
  });

  it("is a no-op on an empty set", () => {
    const { inserts, consumedIds } = planClaim([], [], "user-1");
    expect(inserts).toHaveLength(0);
    expect(consumedIds).toHaveLength(0);
  });
});
