"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUp, MessageCircle, Share2 } from "lucide-react";
import { Card, Button, Chip } from "@/components/ui";

const THREAD = {
  id: "1",
  title: "Is Yamal already better than Messi was at 17?",
  author: "@xG_Pedro",
  time: "2 hours ago",
  content: "Looking at the numbers: Yamal at 17 has 14 La Liga goals, 16 assists, and a Champions League semi-final hat-trick. His ONSIDE valuation is €215M — higher than any teenager in history. At the same age, Messi had just broken into the first team. The question isn't whether Yamal is generational — it's whether he's already surpassed Messi's trajectory at the same age.",
  upvotes: 1842,
  tags: ["La Liga", "Wonderkid", "Barcelona"],
};

const COMMENTS = [
  { id: "1", author: "@TacticsBoard", content: "The numbers don't lie, but context matters. Messi was playing in a less competitive La Liga. Yamal is doing this against better defenses. I'd say trajectory-wise, Yamal is ahead.", upvotes: 342, time: "1h ago" },
  { id: "2", author: "@ScoutVision", content: "As a scout, the thing that separates Yamal isn't the stats — it's the decision-making. He makes choices at 17 that most players don't learn until 24-25. That's what the €215M is pricing in.", upvotes: 218, time: "1h ago" },
  { id: "3", author: "@ValuationNerd", content: "Let's be real: inflation plays a role. Adjusted for market size, Messi's peak valuation would be ~€400M in today's terms. Yamal has a long way to go before surpassing that.", upvotes: 156, time: "45m ago" },
  { id: "4", author: "@DataScout", content: "The ONSIDE model weights form heavily. Yamal has been in exceptional form for 6 months straight. If he has a 2-3 week dip, watch that number correct 10-15%. Still generational though.", upvotes: 89, time: "30m ago" },
  { id: "5", author: "@FutureValue", content: "My prediction: Yamal hits €300M by the World Cup if Spain go deep. He's the tournament's biggest draw. The marketing value alone...", upvotes: 67, time: "15m ago" },
];

export default function ThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <div className="max-w-[900px] mx-auto px-6 py-8">
      <Link href="/community" className="inline-flex items-center gap-1.5 text-[13px] text-mute hover:text-white transition mb-6">
        <ArrowLeft size={14} /> Back to community
      </Link>

      <Card className="p-6 mb-6">
        <div className="flex items-center gap-2 mb-3">
          {THREAD.tags.map((t) => <Chip key={t} tone="neutral">{t}</Chip>)}
        </div>
        <h1 className="text-[22px] font-semibold leading-snug mb-3">{THREAD.title}</h1>
        <div className="flex items-center gap-3 text-[12px] text-mute mb-5">
          <div className="w-7 h-7 rounded-full bg-ink-700 grid place-items-center text-[10px] font-bold">
            {THREAD.author.slice(1, 3).toUpperCase()}
          </div>
          <span className="font-medium text-white">{THREAD.author}</span>
          <span>{THREAD.time}</span>
        </div>
        <p className="text-[14px] leading-relaxed text-mute-soft">{THREAD.content}</p>
        <div className="flex items-center gap-3 mt-5 pt-4 border-t border-line">
          <button className="flex items-center gap-1.5 text-[12px] text-mute hover:text-up transition">
            <ArrowUp size={14} /> {THREAD.upvotes}
          </button>
          <button className="flex items-center gap-1.5 text-[12px] text-mute hover:text-white transition">
            <MessageCircle size={14} /> {COMMENTS.length} replies
          </button>
          <button className="flex items-center gap-1.5 text-[12px] text-mute hover:text-white transition">
            <Share2 size={14} /> Share
          </button>
        </div>
      </Card>

      <div className="space-y-3">
        <h2 className="text-[14px] font-semibold">{COMMENTS.length} replies</h2>
        {COMMENTS.map((c) => (
          <Card key={c.id} className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-ink-700 grid place-items-center text-[9px] font-bold">
                {c.author.slice(1, 3).toUpperCase()}
              </div>
              <span className="text-[12px] font-medium">{c.author}</span>
              <span className="text-[11px] text-mute">{c.time}</span>
            </div>
            <p className="text-[13px] text-mute leading-relaxed">{c.content}</p>
            <div className="mt-3 flex items-center gap-2">
              <button className="flex items-center gap-1 text-[11px] text-mute hover:text-up transition">
                <ArrowUp size={12} /> {c.upvotes}
              </button>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-5 mt-6">
        <div className="text-[13px] text-mute mb-2">Add a reply</div>
        <div className="h-20 rounded-lg bg-ink-800 border border-line mb-3" />
        <Button kind="primary" size="sm">Post reply</Button>
      </Card>
    </div>
  );
}
