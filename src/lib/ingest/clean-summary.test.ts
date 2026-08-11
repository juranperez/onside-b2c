import { describe, it, expect } from "vitest";
import { cleanBreakSummary } from "./clean-summary";

describe("cleanBreakSummary", () => {
  // Verbatim from the live Wire on 2026-08-08.
  it("removes the handle/URL tail that was showing on real cards", () => {
    const raw =
      "🚨 Shea Charles to undergo medical on Monday ahead of completing transfer from Southampton to Fulham on 5yr contract. " +
      "Deal for 22yo #SaintsFC holding package €26m & could reach €30m if #FFC milestones met 🚨 " +
      "@theathleticfc.bsky.social post @fabrizioromano.yopro20.com www.nytim";
    const out = cleanBreakSummary(raw);
    expect(out).not.toMatch(/@/);
    expect(out).not.toMatch(/www\./);
    expect(out).not.toMatch(/bsky|yopro20/);
    expect(out).toContain("Shea Charles to undergo medical");
    expect(out).toContain("€26m");
  });

  it("keeps hashtags — those are the reporter's voice, not plumbing", () => {
    expect(cleanBreakSummary("Nørgaard set to join #EFC from #AFC for £7m")).toContain("#EFC");
  });

  it("strips full URLs and leaves the sentence intact", () => {
    expect(cleanBreakSummary("Deal agreed for the winger. https://t.co/abc123")).toBe("Deal agreed for the winger.");
  });

  it("drops connector words left dangling once their link is gone", () => {
    expect(cleanBreakSummary("Medical booked for Tuesday. More: https://x.test/a")).toBe("Medical booked for Tuesday.");
    expect(cleanBreakSummary("Agreement in place via @ornstein")).toBe("Agreement in place");
  });

  // Deleting an inline mention mangles the sentence — keep the readable name.
  it("keeps mid-sentence attributions grammatical", () => {
    expect(cleanBreakSummary("Touré will sign this week, as @TeleFootball reports.")).toBe(
      "Touré will sign this week, as TeleFootball reports.",
    );
    expect(cleanBreakSummary("Deal agreed, @David_Ornstein says.")).toBe("Deal agreed, David_Ornstein says.");
  });

  it("truncates on a word boundary rather than mid-token", () => {
    const long = `${"word ".repeat(80)}end`;
    const out = cleanBreakSummary(long, 60);
    expect(out.length).toBeLessThanOrEqual(60);
    expect(out.endsWith("…")).toBe(true);
    expect(out).not.toMatch(/wor…$/); // never a half-eaten word
  });

  it("cleans BEFORE truncating, so no half-domain tail survives", () => {
    const raw = `${"Chelsea agree a deal for the midfielder. ".repeat(6)}www.nytimes.com/article/very-long-slug`;
    const out = cleanBreakSummary(raw, 280);
    expect(out).not.toMatch(/www|nytim/);
  });

  it("leaves an already-clean report untouched", () => {
    const clean = "Everton have reached agreement in principle with Arsenal to sign Christian Nørgaard.";
    expect(cleanBreakSummary(clean)).toBe(clean);
  });
});
