import { describe, it, expect } from "vitest";
import { decideIngest, type ExistingRumour } from "./rumour-ingest";

const rumour = (over: Partial<ExistingRumour> = {}): ExistingRumour => ({
  id: "r1",
  status: "rumour",
  to_club: "Manchester City",
  corroborations: 2,
  source_tier: 2,
  reported_fee_eur: 100_000_000,
  ...over,
});

describe("decideIngest", () => {
  it("merges a corroboration of an existing player+destination pair", () => {
    const a = decideIngest({ toClub: "Manchester City", tier: 3, strength: "unique", byPair: rumour(), forPlayer: [rumour()] });
    expect(a.kind).toBe("merge");
  });

  it("destination-less chatter merges into the player's single live saga", () => {
    const a = decideIngest({ toClub: "—", tier: 3, strength: "strong", byPair: undefined, forPlayer: [rumour()] });
    expect(a).toMatchObject({ kind: "merge", promote: false });
  });

  it("destination-less chatter prefers the PUBLISHED saga over a lingering '—' candidate", () => {
    const published = rumour({ id: "pub", status: "rumour", to_club: "Manchester City" });
    const dashCandidate = rumour({ id: "cand", status: "candidate", to_club: "—" });
    const a = decideIngest({ toClub: "—", tier: 3, strength: "strong", byPair: dashCandidate, forPlayer: [published, dashCandidate] });
    expect(a).toMatchObject({ kind: "merge", target: { id: "pub" } });
  });

  it("destination-less chatter with multiple live sagas is skipped, never guessed", () => {
    const a = decideIngest({
      toClub: "—",
      tier: 2,
      strength: "strong",
      byPair: undefined,
      forPlayer: [rumour(), rumour({ id: "r2", to_club: "Liverpool" })],
    });
    expect(a).toMatchObject({ kind: "skip", reason: "ambiguous-target" });
  });

  it("a strong trusted corroboration promotes a queued candidate to live", () => {
    const a = decideIngest({
      toClub: "Manchester City",
      tier: 2,
      strength: "strong",
      byPair: rumour({ status: "candidate" }),
      forPlayer: [rumour({ status: "candidate" })],
    });
    expect(a).toMatchObject({ kind: "merge", promote: true });
  });

  it("a weak corroboration does NOT promote a candidate", () => {
    const a = decideIngest({
      toClub: "Manchester City",
      tier: 3,
      strength: "unique",
      byPair: rumour({ status: "candidate" }),
      forPlayer: [],
    });
    expect(a).toMatchObject({ kind: "merge", promote: false });
  });

  it("dead and confirmed sagas absorb nothing", () => {
    expect(decideIngest({ toClub: "Manchester City", tier: 1, strength: "strong", byPair: rumour({ status: "dead" }), forPlayer: [] }).kind).toBe("skip");
    expect(decideIngest({ toClub: "Manchester City", tier: 1, strength: "strong", byPair: rumour({ status: "confirmed" }), forPlayer: [] }).kind).toBe("skip");
  });

  it("fast-lanes a NEW saga only when trusted + strong + destination resolved", () => {
    const base = { byPair: undefined, forPlayer: [] as ExistingRumour[] };
    expect(decideIngest({ toClub: "Arsenal", tier: 2, strength: "strong", ...base }).kind).toBe("publish");
    expect(decideIngest({ toClub: "Arsenal", tier: 3, strength: "strong", ...base }).kind).toBe("candidate"); // untrusted tier
    expect(decideIngest({ toClub: "Arsenal", tier: 1, strength: "unique", ...base }).kind).toBe("candidate"); // weak match
    expect(decideIngest({ toClub: "—", tier: 1, strength: "strong", ...base }).kind).toBe("candidate"); // no destination
  });
});
