import "server-only";

/**
 * Streaming LLM cascade for Ask Onside: Groq (free, fast) first, Gemini as
 * fallback — per the house doctrine (free tiers before paid). Both speak SSE;
 * we normalise either into a plain text byte stream. No SDK dependencies.
 */

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

/** Pipe an SSE response into a text byte stream, extracting per-event text via `pick`. */
function sseToTextStream(body: ReadableStream<Uint8Array>, pick: (json: unknown) => string | undefined): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  return body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        buffer += decoder.decode(chunk, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const data = line.startsWith("data:") ? line.slice(5).trim() : null;
          if (!data || data === "[DONE]") continue;
          try {
            const text = pick(JSON.parse(data));
            if (text) controller.enqueue(encoder.encode(text));
          } catch {
            // partial/keepalive line — ignore
          }
        }
      },
    }),
  );
}

type GroqEvent = { choices?: Array<{ delta?: { content?: string } }> };
type GeminiEvent = { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };

async function tryGroq(system: string, messages: ChatMessage[]): Promise<ReadableStream<Uint8Array> | null> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return null;
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: GROQ_MODEL,
      stream: true,
      temperature: 0.4,
      max_tokens: 700,
      // gpt-oss is a reasoning model — low effort keeps first-token latency chat-grade.
      ...(GROQ_MODEL.includes("gpt-oss") ? { reasoning_effort: "low" } : {}),
      messages: [{ role: "system", content: system }, ...messages],
    }),
  });
  if (!res.ok || !res.body) return null;
  return sseToTextStream(res.body, (j) => (j as GroqEvent).choices?.[0]?.delta?.content);
}

async function tryGemini(system: string, messages: ChatMessage[]): Promise<ReadableStream<Uint8Array> | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
      generationConfig: { temperature: 0.4, maxOutputTokens: 700 },
    }),
  });
  if (!res.ok || !res.body) return null;
  return sseToTextStream(res.body, (j) => (j as GeminiEvent).candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join(""));
}

export type AskStreamResult = { stream: ReadableStream<Uint8Array>; provider: "groq" | "gemini" } | { stream: null; provider: "none" };

export async function askStream(system: string, messages: ChatMessage[]): Promise<AskStreamResult> {
  try {
    const groq = await tryGroq(system, messages);
    if (groq) return { stream: groq, provider: "groq" };
  } catch {
    // fall through to Gemini
  }
  try {
    const gemini = await tryGemini(system, messages);
    if (gemini) return { stream: gemini, provider: "gemini" };
  } catch {
    // fall through to none
  }
  return { stream: null, provider: "none" };
}

export type CompleteResult = { text: string; provider: "groq" | "gemini" } | null;

async function completeGroq(
  system: string,
  messages: ChatMessage[],
  maxTokens: number,
  json: boolean,
): Promise<string | null> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return null;
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0.4,
      max_tokens: maxTokens,
      // Server-side JSON mode: the API guarantees syntactically valid JSON, which
      // models otherwise break by emitting raw newlines inside string values.
      ...(json ? { response_format: { type: "json_object" } } : {}),
      ...(GROQ_MODEL.includes("gpt-oss") ? { reasoning_effort: "low" } : {}),
      messages: [{ role: "system", content: system }, ...messages],
    }),
  });
  if (!res.ok) return null;
  const j = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return j.choices?.[0]?.message?.content?.trim() ?? null;
}

async function completeGemini(
  system: string,
  messages: ChatMessage[],
  maxTokens: number,
  json: boolean,
): Promise<string | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: maxTokens,
        ...(json ? { responseMimeType: "application/json" } : {}),
      },
    }),
  });
  if (!res.ok) return null;
  const j = (await res.json()) as GeminiEvent;
  const text = j.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim();
  return text || null;
}

/**
 * Non-streaming completion for batch jobs (news generation). Same Groq→Gemini
 * cascade and free-tier-first doctrine as askStream, minus the SSE plumbing.
 * Returns null when every provider fails so callers can skip rather than throw.
 */
export async function complete(
  system: string,
  messages: ChatMessage[],
  opts: { maxTokens?: number; json?: boolean } = {},
): Promise<CompleteResult> {
  const { maxTokens = 900, json = false } = opts;
  try {
    const groq = await completeGroq(system, messages, maxTokens, json);
    if (groq) return { text: groq, provider: "groq" };
  } catch {
    // fall through to Gemini
  }
  try {
    const gemini = await completeGemini(system, messages, maxTokens, json);
    if (gemini) return { text: gemini, provider: "gemini" };
  } catch {
    // fall through to null
  }
  return null;
}
