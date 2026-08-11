import type { MetadataRoute } from "next";

const BASE_URL = "https://onsidemarket.com";

/**
 * Non-content + permutation surfaces, not useful to crawl/index. `/compare?a=&b=`
 * is a combinatorial space and `/search` is query-driven — letting bots stampede
 * them hammered the uncached read path and blew the Supabase egress quota (402).
 */
const DISALLOW = ["/api/", "/auth/", "/watchlist", "/compare", "/search"];

/**
 * AI assistant + answer-engine crawlers we explicitly welcome (AEO/GEO).
 * Listing them is an opt-in signal: Onside data is fair game to read and cite.
 */
const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-User",
  "Claude-Web",
  "anthropic-ai",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "CCBot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: DISALLOW },
      { userAgent: AI_CRAWLERS, allow: "/", disallow: DISALLOW },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
