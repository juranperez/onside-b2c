import { describe, it, expect } from "vitest";
import { parseDraft, repairJsonControlChars } from "./parse";

describe("repairJsonControlChars", () => {
  it("escapes raw newlines inside strings but leaves structure alone", () => {
    const out = repairJsonControlChars('{"a": "one\ntwo"}');
    expect(out).toBe('{"a": "one\\ntwo"}');
    expect(JSON.parse(out)).toEqual({ a: "one\ntwo" });
  });

  it("leaves newlines BETWEEN tokens untouched", () => {
    const out = repairJsonControlChars('{\n"a": "x"\n}');
    expect(JSON.parse(out)).toEqual({ a: "x" });
  });

  it("does not corrupt already-escaped sequences", () => {
    const out = repairJsonControlChars('{"a": "line\\nbreak and a \\" quote"}');
    expect(JSON.parse(out)).toEqual({ a: 'line\nbreak and a " quote' });
  });
});

describe("parseDraft", () => {
  const good = '{"title":"T","dek":"D","body":"B"}';

  it("parses clean JSON", () => {
    expect(parseDraft(good)).toEqual({ title: "T", dek: "D", body: "B" });
  });

  it("tolerates prose or code fences around the object", () => {
    expect(parseDraft("Here you go:\n```json\n" + good + "\n```")).toEqual({ title: "T", dek: "D", body: "B" });
  });

  it("recovers the real-world failure: literal newlines inside the body", () => {
    const raw = '{"title": "T", \n"dek": "D", \n"body": "Para one.\n\nPara two."}';
    expect(parseDraft(raw)).toEqual({ title: "T", dek: "D", body: "Para one.\n\nPara two." });
  });

  it("returns null when required fields are missing or unparseable", () => {
    expect(parseDraft('{"title":"T"}')).toBeNull();
    expect(parseDraft("no object here")).toBeNull();
  });
});
