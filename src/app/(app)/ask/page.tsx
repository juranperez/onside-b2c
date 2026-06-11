import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { getSessionUser } from "@/lib/db/supabase-server";
import { getMovers, getWcFixtures } from "@/lib/queries";
import { Card } from "@/components/ui/card";
import { AskChat } from "@/components/ask/AskChat";

export const metadata: Metadata = {
  title: "Ask Onside — AI football intelligence",
  description:
    "Ask anything about player values, stats, transfer rumours, and World Cup forecasts — answered live from Onside data.",
};

export const dynamic = "force-dynamic";

const STATIC_SUGGESTIONS = [
  "Who are the most valuable players right now?",
  "Any transfer rumours worth believing today?",
  "Which players are rising fastest this week?",
];

/** Suggestion chips built from live data so the empty state already feels alive. */
async function buildSuggestions(): Promise<string[]> {
  const out: string[] = [];
  try {
    const fixtures = await getWcFixtures();
    const next = fixtures.find((f) => f.status === "live") ?? fixtures.find((f) => f.status === "scheduled" && f.kickoff && new Date(f.kickoff).getTime() > Date.now());
    if (next) out.push(`Who wins ${next.home.name} vs ${next.away.name}?`);
  } catch {
    // fall through to static suggestions
  }
  try {
    const [mover] = await getMovers(1);
    if (mover) out.push(`Why is ${mover.displayName} ${mover.dWeek >= 0 ? "rising" : "falling"} in value?`);
  } catch {
    // fall through to static suggestions
  }
  for (const s of STATIC_SUGGESTIONS) {
    if (out.length >= 4) break;
    out.push(s);
  }
  return out;
}

export default async function AskPage() {
  const user = await getSessionUser();
  const suggestions = await buildSuggestions();

  if (!user) {
    return (
      <div className="max-w-[640px] mx-auto px-4 py-16">
        <Card className="p-8 text-center">
          <div className="mx-auto mb-4 w-10 h-10 rounded-full bg-acc/15 grid place-items-center">
            <Sparkles size={18} className="text-acc" />
          </div>
          <h1 className="text-xl font-bold tracking-tight mb-2">Ask Onside</h1>
          <p className="text-[13px] text-mute mb-6 max-w-[420px] mx-auto">
            Player values, form, transfer rumours with our Confidence %, and World Cup forecasts — answered in seconds,
            straight from Onside data. Free with an account.
          </p>
          <div className="flex flex-wrap justify-center gap-2 mb-7">
            {suggestions.map((s) => (
              <span key={s} className="rounded-full border border-line bg-overlay/5 px-3 py-1.5 text-[12px] text-mute">
                {s}
              </span>
            ))}
          </div>
          <Link
            href="/login"
            className="inline-flex items-center h-9 px-5 rounded-lg bg-acc text-ink-950 text-[13px] font-semibold hover:bg-acc/90 transition"
          >
            Sign in to start asking
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-[760px] mx-auto px-4 py-8">
      <div className="flex items-center gap-2.5 mb-6">
        <div className="w-8 h-8 rounded-full bg-acc/15 grid place-items-center">
          <Sparkles size={15} className="text-acc" />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight leading-none">Ask Onside</h1>
          <p className="text-[12px] text-mute mt-1">Live answers from Onside values, stats, rumours, and forecasts.</p>
        </div>
      </div>
      <AskChat suggestions={suggestions} />
    </div>
  );
}
