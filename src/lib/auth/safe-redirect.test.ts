import { describe, it, expect } from "vitest";
import { safeRedirect } from "./safe-redirect";

describe("safeRedirect", () => {
  it("returns the fallback for empty/nullish input", () => {
    expect(safeRedirect("")).toBe("/discover");
    expect(safeRedirect(null)).toBe("/discover");
    expect(safeRedirect(undefined)).toBe("/discover");
  });

  it("allows same-site absolute paths", () => {
    expect(safeRedirect("/players/mbappe")).toBe("/players/mbappe");
    expect(safeRedirect("/transfers?status=confirmed")).toBe("/transfers?status=confirmed");
  });

  it("blocks protocol-relative and external destinations", () => {
    expect(safeRedirect("//evil.com")).toBe("/discover");
    expect(safeRedirect("/\\evil.com")).toBe("/discover");
    expect(safeRedirect("https://evil.com")).toBe("/discover");
    expect(safeRedirect("javascript:alert(1)")).toBe("/discover");
    expect(safeRedirect("evil.com")).toBe("/discover");
  });

  it("honours a custom fallback", () => {
    expect(safeRedirect("", "/")).toBe("/");
    expect(safeRedirect(null, "/worldcup")).toBe("/worldcup");
  });
});
