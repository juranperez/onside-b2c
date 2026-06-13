import { describe, it, expect } from "vitest";
import { parseAuthorFeed, type BskyPost } from "./bluesky";

// Captured shape of app.bsky.feed.getAuthorFeed (trimmed to fields we use).
const FEED = {
  feed: [
    {
      post: {
        uri: "at://did:plc:abc/app.bsky.feed.post/1",
        record: { text: "Here we go! Liverpool sign Florian Wirtz, deal completed. €130m.", createdAt: "2026-06-13T14:00:00Z" },
        embed: { images: [{ fullsize: "https://cdn/img1.jpg", alt: "Wirtz Liverpool" }] },
      },
    },
    {
      post: {
        uri: "at://did:plc:abc/app.bsky.feed.post/2",
        record: { text: "Good morning everyone!", createdAt: "2026-06-13T08:00:00Z" },
      },
    },
  ],
};

describe("parseAuthorFeed", () => {
  it("flattens posts to {uri,text,createdAt,imageAlt?}", () => {
    const posts: BskyPost[] = parseAuthorFeed(FEED);
    expect(posts).toHaveLength(2);
    expect(posts[0]).toMatchObject({
      uri: "at://did:plc:abc/app.bsky.feed.post/1",
      text: "Here we go! Liverpool sign Florian Wirtz, deal completed. €130m.",
      createdAt: "2026-06-13T14:00:00Z",
      imageAlt: "Wirtz Liverpool",
    });
    expect(posts[1].imageAlt).toBeUndefined();
  });
  it("tolerates a missing/empty feed", () => {
    expect(parseAuthorFeed({})).toEqual([]);
    expect(parseAuthorFeed({ feed: [] })).toEqual([]);
  });
});
