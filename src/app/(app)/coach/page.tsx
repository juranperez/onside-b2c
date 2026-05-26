"use client";

import { useState } from "react";
import { Send, Sparkles, User } from "lucide-react";
import { Card, Button, Chip } from "@/components/ui";

const SAMPLE_CONVERSATION = [
  {
    role: "assistant",
    content: "Hey — I'm your AI Coach. Ask me anything about players, valuations, transfers, or tactics. I have access to the full ONSIDE dataset.",
  },
  {
    role: "user",
    content: "Find me undervalued strikers under 23 in Ligue 1 with at least 10 goals this season",
  },
  {
    role: "assistant",
    content: "I found 3 strikers matching your criteria. All are priced below their expected market value based on output:\n\n**1. Elye Wahi** — Marseille\n- Age: 22 | Goals: 14 | xG: 11.8\n- Current value: €28M | Fair value model: €38M\n- Gap: **€10M undervalued**\n\n**2. Mathys Tel** — Lyon (loan from Bayern)\n- Age: 21 | Goals: 12 | xG: 10.2\n- Current value: €22M | Fair value model: €31M\n- Gap: **€9M undervalued**\n\n**3. Mohamed Bayo** — Lille\n- Age: 22 | Goals: 11 | xG: 9.8\n- Current value: €15M | Fair value model: €22M\n- Gap: **€7M undervalued**\n\nWahi has the highest ceiling — his shot map shows elite positioning. Want me to compare them head-to-head?",
    chips: ["Compare all 3", "Show Wahi's shot map", "Similar players in other leagues"],
  },
];

export default function CoachPage() {
  const [input, setInput] = useState("");

  return (
    <div className="max-w-[900px] mx-auto px-6 py-8">
      <div className="flex items-center gap-2 mb-6">
        <Sparkles size={18} className="text-acc" />
        <h1 className="display text-[28px] tracking-tight">AI Coach</h1>
        <Chip tone="acc">Pro</Chip>
      </div>

      <div className="space-y-4 mb-6">
        {SAMPLE_CONVERSATION.map((msg, i) => (
          <div key={i} className={msg.role === "user" ? "flex justify-end" : ""}>
            <Card
              className={`p-4 max-w-[85%] ${
                msg.role === "user"
                  ? "bg-ink-700 border-line"
                  : "bg-ink-850 border-line"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                {msg.role === "assistant" ? (
                  <Sparkles size={12} className="text-acc" />
                ) : (
                  <User size={12} className="text-mute" />
                )}
                <span className="text-[11px] text-mute font-medium">
                  {msg.role === "assistant" ? "AI Coach" : "You"}
                </span>
              </div>
              <div className="text-[13px] leading-relaxed whitespace-pre-wrap">{msg.content}</div>
              {msg.chips && (
                <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-line">
                  {msg.chips.map((c) => (
                    <button
                      key={c}
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-line text-[11px] font-medium text-mute hover:text-white transition"
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </Card>
          </div>
        ))}
      </div>

      <Card className="p-3 flex items-center gap-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything about players, transfers, tactics..."
          className="flex-1 bg-transparent text-[14px] outline-none placeholder:text-mute-soft"
        />
        <Button kind="primary" size="sm" icon={<Send size={13} />}>
          Send
        </Button>
      </Card>

      <div className="mt-4 flex flex-wrap gap-2">
        {[
          "Who's the most undervalued midfielder in the PL?",
          "Compare Yamal and Musiala",
          "Best free agents this summer",
          "World Cup 2026 predictions",
        ].map((q) => (
          <button
            key={q}
            onClick={() => setInput(q)}
            className="px-3 py-1.5 rounded-lg bg-ink-800 border border-line text-[12px] text-mute hover:text-white hover:bg-ink-700 transition"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
