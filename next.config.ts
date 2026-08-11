import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

// `here` = this project's own directory, derived rather than hardcoded so it's correct
// on any machine. Same idiom used for `here` in src/lib/ingest/normalize.test.ts and
// src/lib/profiles/username.test.ts — `next.config.ts` is ESM (`import`/`export`), so
// there's no CJS `__dirname` global to fall back on.
const here = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Pin the workspace root to this project.
  //
  // A package-lock.json belonging to an unrelated project can sit directly above this
  // repo purely by accident of machine layout. When it does, Next's root heuristic walks
  // up, finds two lockfiles, and picks the OUTER directory as the workspace root —
  // warning at build time: "Next.js inferred your workspace root, but it may not be
  // correct." Left alone, output-file tracing is computed against the wrong root, which
  // is how unrelated files get pulled into a deployment bundle. Pinning both roots makes
  // it deterministic regardless of what sits above the repo.
  //
  // Two subsystems infer independently: `outputFileTracingRoot` for production tracing,
  // `turbopack.root` for dev. Next's warning names the latter as the fix.
  //
  // NOT related to Open Graph routes. That connection was investigated and is false —
  // next/og metadata routes serve a CONTENT-HASHED path (`/u/[username]/opengraph-image-
  // w6r6tt`, per the build route table), so requesting the bare `/opengraph-image` 404s
  // correctly and always has. Verified: with the root misdetected, the hashed URL still
  // returns 200 image/png. Don't reintroduce this config to "fix" an OG 404 — check the
  // hash suffix in the build output instead.
  outputFileTracingRoot: here,
  turbopack: {
    root: here,
  },
  async redirects() {
    return [
      // Insights index folded into Discover (2026-06 nav refactor). Report
      // subpages (/insights/*) keep their URLs — only the index moved.
      { source: "/insights", destination: "/discover", permanent: true },
    ];
  },
};

export default nextConfig;
