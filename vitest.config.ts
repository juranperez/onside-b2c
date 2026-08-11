import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: { environment: "node", include: ["src/**/*.test.ts"] },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // `server-only` throws outside an RSC runtime; stub it so server modules
      // (e.g. the receipts resolver imported by rumour-ingest) can be unit-tested.
      "server-only": path.resolve(__dirname, "vitest.server-only.stub.ts"),
    },
  },
});
