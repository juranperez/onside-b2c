import { readDb } from "@/lib/db/server";
import type { ArticleBody } from "./generate";

/** News is the freshest surface on the site — a stale index is a defect, not a saving. */
const NEWS_REVALIDATE_SECONDS = 60;
const newsDb = () => readDb({ revalidate: NEWS_REVALIDATE_SECONDS });

export interface ArticleListItem {
  slug: string;
  title: string;
  dek: string;
  eventType: string;
  publishedAt: string;
  playerPhoto: string | null;
  player: string;
  toClub: string;
}

export interface ArticleDetail extends ArticleListItem {
  body: ArticleBody;
  rumourId: string | null;
  playerSlug: string;
  correction: string | null;
  updatedAt: string;
}

const SELECT = "slug,title,dek,event_type,published_at,updated_at,body,rumour_id,correction";

type Row = {
  slug: string;
  title: string;
  dek: string;
  event_type: string;
  published_at: string;
  updated_at: string;
  body: unknown;
  rumour_id: string | null;
  correction: string | null;
};

function toListItem(r: Row): ArticleListItem {
  const body = r.body as ArticleBody;
  return {
    slug: r.slug,
    title: r.title,
    dek: r.dek,
    eventType: r.event_type,
    publishedAt: r.published_at,
    playerPhoto: body?.facts?.playerPhoto ?? null,
    player: body?.facts?.player ?? "",
    toClub: body?.facts?.toClub ?? "",
  };
}

/** Newest-first briefings for the /news index and the homepage. */
export async function listArticles(limit = 40): Promise<ArticleListItem[]> {
  const { data } = await newsDb()
    .from("news_articles")
    .select(SELECT)
    .order("published_at", { ascending: false })
    .limit(limit);
  return ((data ?? []) as Row[]).map(toListItem);
}

export async function getArticleBySlug(slug: string): Promise<ArticleDetail | null> {
  const { data } = await newsDb().from("news_articles").select(SELECT).eq("slug", slug).maybeSingle();
  if (!data) return null;
  const row = data as Row;
  const body = row.body as ArticleBody;
  return {
    ...toListItem(row),
    body,
    rumourId: row.rumour_id,
    playerSlug: body?.facts?.playerSlug ?? "",
    correction: row.correction,
    updatedAt: row.updated_at,
  };
}

/** Slugs + timestamps for the sitemap. */
export async function articleSitemapEntries(): Promise<{ slug: string; updatedAt: string }[]> {
  const { data } = await newsDb()
    .from("news_articles")
    .select("slug,updated_at")
    .order("published_at", { ascending: false })
    .limit(5000);
  return ((data ?? []) as { slug: string; updated_at: string }[]).map((r) => ({
    slug: r.slug,
    updatedAt: r.updated_at,
  }));
}
