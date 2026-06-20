import type { MetadataRoute } from "next";

const BASE_URL = "https://onsidemarket.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Permutation/dynamic surfaces with no index value: /compare?a=&b= is a
      // combinatorial space, /search is query-driven, /api is non-content.
      // Letting bots crawl these stampeded the uncached read path and exhausted
      // the Supabase egress quota.
      disallow: ["/compare", "/search", "/api/"],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
