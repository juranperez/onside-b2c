import type { MetadataRoute } from "next";

const BASE_URL = "https://onsidemarket.com";

/** Non-content surfaces: internal API helpers and auth — not useful to crawl/index. */
const DISALLOW = ["/api/", "/auth/", "/watchlist"];

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
