// src/lib/push/support.test.ts
import { describe, it, expect } from "vitest";
import { pushSupport } from "./support";

const IOS_SAFARI = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const ANDROID = "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Mobile Safari/537.36";

describe("pushSupport", () => {
  it("iOS Safari NOT installed → needs install, can't push yet", () => {
    expect(pushSupport(IOS_SAFARI, false)).toEqual({ isIos: true, needsInstall: true, canPrompt: false });
  });
  it("iOS installed as PWA (standalone) → can prompt", () => {
    expect(pushSupport(IOS_SAFARI, true)).toEqual({ isIos: true, needsInstall: false, canPrompt: true });
  });
  it("Android → can prompt directly", () => {
    expect(pushSupport(ANDROID, false)).toEqual({ isIos: false, needsInstall: false, canPrompt: true });
  });
});
