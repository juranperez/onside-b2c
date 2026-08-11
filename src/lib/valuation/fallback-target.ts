// Model-version vocabulary for player_valuations, plus the predicate that decides
// which valuations the B2B fallback re-value (scripts/value-fallback.ts) may touch.
//
// The fallback formula must only (re)compute players that are NOT anchored — neither
// sourced from the B2B anchored sync nor protected by a manual Transfermarkt marquee
// override. Re-valuing a `tm-refresh-2026-06` row would clobber a hand-set marquee
// value (e.g. Vinícius €150M → a capped formula value), which is the Jun-11
// "anchor refresh dead / clobbered by later value runs" incident class.

export const B2B_MODEL_VERSION = "b2b-sios-v2.1";
export const FALLBACK_MODEL_VERSION = "b2b-sios-v2.1-fallback";
export const TM_REFRESH_MODEL_VERSION = "tm-refresh-2026-06";

/** Valuations the fallback re-value must never overwrite: the B2B anchored sync and the manual marquee overrides. */
export const PROTECTED_MODEL_VERSIONS = [B2B_MODEL_VERSION, TM_REFRESH_MODEL_VERSION] as const;

/**
 * True when a player's current valuation should be (re)computed by the B2B fallback
 * formula — i.e. anything that isn't anchored by the B2B sync or a manual marquee
 * override. A null/absent model_version is treated as not-a-target, mirroring the
 * PostgREST `.neq` filter (`col <> x` is NULL — and therefore excludes nulls).
 */
export function isFallbackTarget(modelVersion: string | null | undefined): boolean {
  return modelVersion != null && !(PROTECTED_MODEL_VERSIONS as readonly string[]).includes(modelVersion);
}
