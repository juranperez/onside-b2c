import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";
import { getRumours, type RumourItem } from "@/lib/queries/rumours";
import { stageOf } from "@/lib/rumours/stage";
import { feeVerdict } from "@/lib/rumours/fee-verdict";
import { complete } from "@/lib/ask/llm";
import { detectArticleEvents, type ArticleEvent } from "./events";
import { newsworthiness, selectForPublication } from "./rank";
import { buildSlug } from "./slug";
import { validateArticle } from "./validate";
import { parseDraft } from "./parse";
import { buildPrompt, SYSTEM, type ArticleFacts } from "./compose";

const GLOBAL_CAP = 25;
const PER_SAGA_CAP = 4;
const SCAN_LIMIT = 200;

/** Stored article body — prose plus the fact snapshot the page renders around it. */
export interface ArticleBody {
  paragraphs: string[];
  facts: {
    player: string;
    playerSlug: string;
    playerPhoto: string | null;
    fromClub: string;
    toClub: string;
    stage: string;
    source: string;
    sourceUrl: string | null;
    corroborations: number;
    reportedFeeM: number | null;
    onsideValueM: number;
    verdict: string | null;
    confidencePct: number;
  };
}

export interface GenerateResult {
  scanned: number;
  detected: number;
  selected: number;
  published: number;
  corrected: number;
  /** reason → count. Every drop is counted; nothing fails silently. */
  rejected: Record<string, number>;
}

function factsFor(r: RumourItem, e: ArticleEvent): ArticleFacts {
  return {
    player: r.player.name,
    fromClub: r.player.fromClub,
    toClub: r.toClub,
    position: r.player.pos,
    stage: stageOf(r.summary, r.status),
    source: r.source,
    corroborations: r.corroborations,
    reportedFeeM: r.reportedFeeM,
    onsideValueM: r.onsideValueM,
    verdict: feeVerdict(r.reportedFeeM, r.onsideValueM)?.label ?? null,
    confidencePct: r.confidence.pct,
    eventType: e.type,
    summary: r.summary,
  };
}

/**
 * The news pipeline: detect → rank → cap → generate → validate → publish.
 *
 * Every rejection path is counted rather than swallowed, so a run that publishes
 * nothing is diagnosable from the cron response alone.
 */
export async function generateNews(db: SupabaseClient<Database>): Promise<GenerateResult> {
  const result: GenerateResult = { scanned: 0, detected: 0, selected: 0, published: 0, corrected: 0, rejected: {} };
  const drop = (reason: string) => {
    result.rejected[reason] = (result.rejected[reason] ?? 0) + 1;
  };

  // What we've already covered — drives both stateless dedup and the per-saga cap.
  const { data: existing } = await db.from("news_articles").select("event_key,rumour_id");
  const publishedKeys = new Set((existing ?? []).map((a) => a.event_key));
  const publishedPerSaga = new Map<string, number>();
  for (const a of existing ?? []) {
    if (a.rumour_id) publishedPerSaga.set(a.rumour_id, (publishedPerSaga.get(a.rumour_id) ?? 0) + 1);
  }

  // includeDead: a collapsed saga is itself an angle, and drives corrections below.
  const rumours = await getRumours(SCAN_LIMIT, { includeDead: true }).catch(() => [] as RumourItem[]);
  result.scanned = rumours.length;

  const byId = new Map(rumours.map((r) => [r.id, r]));
  const candidates: { event: ArticleEvent; score: number }[] = [];
  for (const r of rumours) {
    for (const e of detectArticleEvents(r, publishedKeys)) {
      candidates.push({
        event: e,
        score: newsworthiness(e, {
          sourceTier: r.sourceTier,
          onsideValueM: r.onsideValueM,
          confidencePct: r.confidence.pct,
          reportedFeeM: r.reportedFeeM,
        }),
      });
    }
  }
  result.detected = candidates.length;

  const selected = selectForPublication(candidates, {
    globalCap: GLOBAL_CAP,
    perSagaCap: PER_SAGA_CAP,
    publishedPerSaga,
  });
  result.selected = selected.length;

  for (const e of selected) {
    const r = byId.get(e.rumourId);
    if (!r) continue;

    const gen = await complete(SYSTEM, [{ role: "user", content: buildPrompt(factsFor(r, e)) }], { json: true });
    if (!gen) {
      drop("llm-unavailable");
      continue;
    }
    const draft = parseDraft(gen.text);
    if (!draft) {
      drop("unparseable");
      continue;
    }
    const verdict = validateArticle(draft, { sourceName: r.source, status: r.status });
    if (!verdict.ok) {
      drop(verdict.reason);
      continue;
    }

    const body: ArticleBody = {
      paragraphs: draft.body.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean),
      facts: {
        player: r.player.name,
        playerSlug: r.player.slug,
        playerPhoto: r.player.photoUrl,
        fromClub: r.player.fromClub,
        toClub: r.toClub,
        stage: stageOf(r.summary, r.status),
        source: r.source,
        sourceUrl: r.url,
        corroborations: r.corroborations,
        reportedFeeM: r.reportedFeeM,
        onsideValueM: r.onsideValueM,
        verdict: feeVerdict(r.reportedFeeM, r.onsideValueM)?.label ?? null,
        confidencePct: r.confidence.pct,
      },
    };

    const { error } = await db.from("news_articles").insert({
      slug: buildSlug(r.player.slug, r.toClub, e.angle),
      rumour_id: r.id,
      player_id: r.player.id,
      event_type: e.type,
      event_key: e.eventKey,
      title: draft.title,
      dek: draft.dek,
      body: body as unknown as Database["public"]["Tables"]["news_articles"]["Insert"]["body"],
      newsworthiness: Math.round(candidates.find((c) => c.event.eventKey === e.eventKey)?.score ?? 0),
    });
    if (error) {
      // Unique violation = another run won the race; anything else is a real fault.
      drop(error.code === "23505" ? "duplicate" : "insert-failed");
      continue;
    }
    publishedKeys.add(e.eventKey);
    result.published++;
  }

  result.corrected = await applyCorrections(db, rumours);
  return result;
}

/**
 * Corrections in place: when a saga we covered later collapses, its articles keep
 * their URLs and gain a visible note. We never silently delete a published record.
 */
async function applyCorrections(db: SupabaseClient<Database>, rumours: RumourItem[]): Promise<number> {
  const deadIds = rumours.filter((r) => r.status === "dead").map((r) => r.id);
  if (!deadIds.length) return 0;
  const { data } = await db
    .from("news_articles")
    .select("id")
    .in("rumour_id", deadIds)
    .is("correction", null)
    .neq("event_type", "dead");
  if (!data?.length) return 0;
  const note = "This deal has since collapsed. Onside now tracks the saga as dead.";
  const { error } = await db
    .from("news_articles")
    .update({ correction: note, status: "corrected", updated_at: new Date().toISOString() })
    .in(
      "id",
      data.map((a) => a.id),
    );
  return error ? 0 : data.length;
}
