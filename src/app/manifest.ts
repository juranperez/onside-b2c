// src/app/manifest.ts
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Onside Market",
    short_name: "Onside",
    description: "Every player. Every valuation. Live.",
    start_url: "/",
    display: "standalone",
    background_color: "#0b0e11",
    theme_color: "#0b0e11",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
