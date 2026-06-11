import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/db/supabase-server";
import { rateLimit } from "@/lib/ratelimit";
import { buildAskContext } from "@/lib/ask/context";
import { askStream, type ChatMessage } from "@/lib/ask/llm";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const bodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(2000),
      }),
    )
    .min(1)
    .max(12),
});

function systemPrompt(contextBlock: string): string {
  const today = new Date().toISOString().slice(0, 10);
  return [
    `You are Onside AI — the football intelligence assistant of onsidemarket.com. Today is ${today} and the 2026 World Cup is on.`,
    `Answer ONLY from the CONTEXT below. If the answer isn't in context, say so briefly and tell the user what you can answer (player values, stats, transfer rumours with our Confidence %, World Cup fixtures and forecasts) — suggest naming a player, club, or nation.`,
    `Style: sharp, concise, football-native. Under 120 words unless comparing players. Use display names. Cite numbers exactly as given.`,
    `Values are Onside model estimates — phrase as "Onside values X at €…", never as objective fact. Win probabilities are the Onside Forecast (squad-value model) — entertainment, never betting advice; politely decline any betting/gambling request.`,
    `Stay on football. For anything else, decline in one short sentence.`,
    ``,
    `CONTEXT:`,
    contextBlock,
  ].join("\n");
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "sign-in-required" }, { status: 401 });
  }

  // The owner account is never throttled (same convention as /transfers/manage).
  const isOwner = user.email === (process.env.ADMIN_EMAIL ?? "juranperez@gmail.com");
  if (!isOwner) {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
    const ipGate = rateLimit(`ask:ip:${ip}`, 20, 60_000);
    // Per-user quotas: short window for bursts, daily cap for cost control.
    const minuteGate = rateLimit(`ask:u:${user.id}:m`, 6, 60_000);
    const dayGate = rateLimit(`ask:u:${user.id}:d`, 40, 86_400_000);
    const gate = !ipGate.ok ? ipGate : !minuteGate.ok ? minuteGate : dayGate;
    if (!gate.ok) {
      return NextResponse.json({ error: "rate-limited", retryAfterSec: gate.retryAfterSec }, { status: 429 });
    }
  }

  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  }

  const lastUser = [...parsed.messages].reverse().find((m) => m.role === "user");
  if (!lastUser) return NextResponse.json({ error: "bad-request" }, { status: 400 });

  const { block, sources } = await buildAskContext(lastUser.content);
  const history = parsed.messages.slice(-8) as ChatMessage[];

  const result = await askStream(systemPrompt(block), history);
  if (!result.stream) {
    return NextResponse.json({ error: "not-configured" }, { status: 503 });
  }

  return new Response(result.stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Ask-Provider": result.provider,
      "X-Ask-Sources": encodeURIComponent(JSON.stringify(sources)),
    },
  });
}
