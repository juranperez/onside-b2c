// src/lib/push/support.ts
export interface PushSupport {
  isIos: boolean;
  needsInstall: boolean; // iOS Safari must be added to the home screen before push works
  canPrompt: boolean; // ok to request Notification permission now
}

/** Decide how to onboard a visitor to push, given their UA + standalone (PWA-installed) state. */
export function pushSupport(userAgent: string, standalone: boolean): PushSupport {
  const isIos = /iphone|ipad|ipod/i.test(userAgent);
  const needsInstall = isIos && !standalone; // iOS only delivers web push to installed PWAs
  return { isIos, needsInstall, canPrompt: !needsInstall };
}
