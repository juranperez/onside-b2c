import { describe, it, expect } from "vitest";
import { buildPlayerIndex, matchPlayer, stripJournalists, buildClubIndex, matchDestClub } from "./match";

// A small population reproducing the real misfires from the 2026-06-11 queue audit.
const PLAYERS = [
  { id: "schmid", name_norm: "romano schmid" },
  { id: "osimhen", name_norm: "victor james osimhen" },
  { id: "raul", name_norm: "raul alonso jimenez rodriguez" },
  { id: "alejandro", name_norm: "alejandro jimenez" },
  { id: "anderson", name_norm: "elliot anderson" },
  { id: "baleba", name_norm: "carlos noom quomah baleba" },
  { id: "manhoef", name_norm: "million manhoef" },
  { id: "under", name_norm: "cengiz under" },
  { id: "waldo", name_norm: "waldo emilio madrid quezada" },
  { id: "bkdavies", name_norm: "benjamin keith davies" },
  { id: "brown", name_norm: "nathaniel brown" },
  { id: "trafford", name_norm: "james trafford" },
  { id: "ligue", name_norm: "calixte ligue" },
  { id: "gpalace", name_norm: "genino palace" },
  { id: "koemanp", name_norm: "ronald koeman" },
];

const idx = buildPlayerIndex(PLAYERS);

describe("stripJournalists", () => {
  it("removes full journalist names but keeps bare surnames", () => {
    expect(stripJournalists("Fabrizio Romano confirms Liverpool boost")).not.toContain("romano");
    expect(stripJournalists("Romano Schmid agrees move")).toContain("romano schmid");
  });
});

describe("matchPlayer with byline stripping", () => {
  it("a Fabrizio Romano byline never matches Romano Schmid", () => {
    const h = stripJournalists("'Here we go': Crystal Palace reach agreement for Pierre Sage - Fabrizio Romano");
    expect(matchPlayer(h, idx)).toBeNull();
  });

  it("a real Romano Schmid story still matches him strongly", () => {
    const h = stripJournalists("Romano Schmid open to Premier League transfer this summer");
    expect(matchPlayer(h, idx)).toEqual({ playerId: "schmid", strength: "strong" });
  });

  it("Raul Jimenez resolves to Raul, not Alejandro, when both are indexed", () => {
    const h = stripJournalists("Raul Jimenez: Wolves re-sign Mexico striker from Fulham");
    expect(matchPlayer(h, idx)?.playerId).toBe("raul");
  });

  it("Osimhen resolves via his unique surname", () => {
    const h = stripJournalists("Victor Osimhen transfer: Atletico Madrid lead Chelsea in race");
    expect(matchPlayer(h, idx)?.playerId).toBe("osimhen");
  });

  it("Baleba resolves via his unique surname even though the headline lacks his other names", () => {
    const h = stripJournalists("Brighton midfielder Carlos Baleba discusses potential Old Trafford move");
    expect(matchPlayer(h, idx)?.playerId).toBe("baleba");
  });

  it("Anderson full-name match is strong", () => {
    const h = stripJournalists("Forest want British record for Elliot Anderson as Man City have bid rejected");
    expect(matchPlayer(h, idx)).toEqual({ playerId: "anderson", strength: "strong" });
  });
});

describe("matchPlayer — generic-word and adjacency hardening (Jun 11 queue failures)", () => {
  it("'20 million apart' never matches Million Manhoef", () => {
    expect(matchPlayer(stripJournalists("Gordon moves closer to Bayern, the clubs are 20 million apart"), idx)).toBeNull();
  });

  it("'medical team under Flick' never matches Cengiz Ünder", () => {
    expect(matchPlayer(stripJournalists("Barcelona's medical team under Hansi Flick set for sweeping changes"), idx)).toBeNull();
  });

  it("'Real Madrid open talks' never matches a player with Madrid in his legal name", () => {
    expect(matchPlayer(stripJournalists("Real Madrid Open Talks With AIK For New Winger"), idx)).toBeNull();
  });

  it("non-adjacent token co-occurrence is not a strong match (Keith Wyness + Benjamin Nygren)", () => {
    expect(matchPlayer(stripJournalists("Keith Wyness claims Benjamin Nygren is close to a move to Valencia"), idx)).toBeNull();
  });

  it("real full names still match strongly via adjacency", () => {
    expect(matchPlayer(stripJournalists("Million Manhoef stars again for Stoke in transfer shop window"), idx)?.playerId).toBe("manhoef");
    expect(matchPlayer(stripJournalists("Positive negotiations for Nathaniel Brown transfer"), idx)?.playerId).toBe("brown");
  });

  it("a lone generic surname is never a unique key", () => {
    expect(matchPlayer(stripJournalists("Frankfurt's Brown attracting transfer interest"), idx)).toBeNull();
  });
});

describe("matchPlayer — stadium, coach and word-collision classes (Jun 12 audit)", () => {
  it("'Old Trafford' never matches the keeper James Trafford", () => {
    expect(matchPlayer(stripJournalists("Star keen on a move to Old Trafford as United accelerate pursuit"), idx)).toBeNull();
  });

  it("a real James Trafford story still matches him", () => {
    expect(matchPlayer(stripJournalists("James Trafford in line for England squad after fine season"), idx)?.playerId).toBe("trafford");
  });

  it("'Ligue 1' and 'Crystal Palace' never match players named Ligue / Palace", () => {
    expect(matchPlayer(stripJournalists("Liverpool could turn to Ligue 1 in midfield transfer search"), idx)).toBeNull();
    expect(matchPlayer(stripJournalists("Crystal Palace agrees to appoint new head coach until June 2029"), idx)).toBeNull();
  });

  it("a coach's full name never matches a player who shares it", () => {
    expect(matchPlayer(stripJournalists("Ronald Koeman doesn't rule out Everton move for jettisoned star"), idx)).toBeNull();
    expect(matchPlayer(stripJournalists("Jose Mourinho and Real Madrid in talks to hijack Manchester United transfer"), idx)).toBeNull();
  });
});

// ---- Destination clubs — the 2026-06-12 phantom-destination audit ------------

const CLUBS = [
  { id: "ner", name: "New England Revolution", name_norm: "new england revolution", short_name: null },
  { id: "redstar", name: "RED Star FC 93", name_norm: "red star fc 93", short_name: null },
  { id: "spurs", name: "Tottenham", name_norm: "tottenham", short_name: null },
  { id: "bou", name: "Bournemouth", name_norm: "bournemouth", short_name: null },
  { id: "mcfc", name: "Manchester City", name_norm: "manchester city", short_name: null },
  { id: "mufc", name: "Manchester United", name_norm: "manchester united", short_name: null },
  { id: "rm", name: "Real Madrid", name_norm: "real madrid", short_name: null },
  { id: "atm", name: "Atletico Madrid", name_norm: "atletico madrid", short_name: null },
  { id: "inter", name: "Inter", name_norm: "inter", short_name: null },
  { id: "acm", name: "AC Milan", name_norm: "ac milan", short_name: null },
  { id: "forest", name: "Nottingham Forest", name_norm: "nottingham forest", short_name: null },
  { id: "ars", name: "Arsenal", name_norm: "arsenal", short_name: null },
  { id: "kc", name: "Kaizer Chiefs", name_norm: "kaizer chiefs", short_name: null },
  { id: "hearts", name: "Heart Of Midlothian", name_norm: "heart of midlothian", short_name: null },
  { id: "shw", name: "Sheffield Wednesday", name_norm: "sheffield wednesday", short_name: null },
  { id: "shu", name: "Sheffield Utd", name_norm: "sheffield utd", short_name: null },
  { id: "junior", name: "Junior", name_norm: "junior", short_name: null },
  { id: "cfire", name: "Chicago Fire", name_norm: "chicago fire", short_name: null },
];
const clubIdx = buildClubIndex(CLUBS);

describe("matchDestClub — generic-word guard (the England/star phantoms)", () => {
  it("'England mainstay' never resolves to New England Revolution", () => {
    expect(matchDestClub("Elliot Anderson brings the noise and promise of England mainstay amid City transfer talk", clubIdx, "Nottingham Forest")).toBeNull();
  });

  it("'Real Madrid star' never resolves to RED Star FC 93", () => {
    expect(matchDestClub("Man Utd transfer tipped for Real Madrid star who can be Elliot Anderson alternative", clubIdx, "Nottingham Forest")).toBeNull();
  });

  it("'Arsenal chiefs' resolves to Arsenal, never Kaizer Chiefs", () => {
    expect(matchDestClub("Arsenal chiefs plot summer swoop for winger", clubIdx, "Bournemouth")).toBe("Arsenal");
  });

  it("'heart set on a move' and 'agreed on Wednesday' resolve to nothing", () => {
    expect(matchDestClub("Striker has his heart set on a summer move", clubIdx, null)).toBeNull();
    expect(matchDestClub("Personal terms agreed on Wednesday says agent", clubIdx, null)).toBeNull();
  });

  it("'Vinicius Junior' never resolves to Junior (Barranquilla)", () => {
    expect(matchDestClub("Vinicius Junior agrees new deal amid transfer talk", clubIdx, "Real Madrid")).toBeNull();
  });

  it("multi-word clubs still match via adjacency", () => {
    expect(matchDestClub("New England Revolution sign veteran defender", clubIdx, "Bournemouth")).toBe("New England Revolution");
    expect(matchDestClub("Sheffield Wednesday complete loan move for keeper", clubIdx, "Arsenal")).toBe("Sheffield Wednesday");
  });
});

describe("matchDestClub — phrase tokens make the giants reachable", () => {
  it("resolves Manchester City (was unreachable: 'city' stopped, 'manchester' ambiguous)", () => {
    expect(matchDestClub("Manchester City have second bid rejected for Nottingham Forest midfielder", clubIdx, "Nottingham Forest")).toBe("Manchester City");
    expect(matchDestClub("Man City prepare third bid for midfielder", clubIdx, "Nottingham Forest")).toBe("Manchester City");
  });

  it("resolves Real Madrid via the phrase, not the ambiguous 'madrid' token", () => {
    expect(matchDestClub("Real Madrid agree deal for Bournemouth defender", clubIdx, "Bournemouth")).toBe("Real Madrid");
  });

  it("'Inter Milan' resolves to Inter, never AC Milan", () => {
    expect(matchDestClub("Inter Milan agree fee for Bournemouth defender", clubIdx, "Bournemouth")).toBe("Inter");
  });

  it("the Senesi headline resolves Tottenham with Bournemouth as current club", () => {
    expect(matchDestClub("Marcos Senesi: Tottenham sign Bournemouth defender on free transfer after four-year stay at Cherries", clubIdx, "Bournemouth")).toBe("Tottenham");
  });

  it("two competing destinations stay null — never guess", () => {
    expect(matchDestClub("Arsenal and Tottenham battle for defender", clubIdx, "Bournemouth")).toBeNull();
  });
});
