"use client";

import { Bell, TrendingUp, AlertCircle, MessageCircle, Newspaper } from "lucide-react";
import { Card, Button, Chip } from "@/components/ui";

const NOTIFICATIONS = [
  { icon: "up", title: "Wirtz hit €140.5M (+€6.8M this week)", sub: "Your alert threshold: €5M weekly change", time: "2h ago" },
  { icon: "news", title: "Cole Palmer named in England World Cup squad", sub: "Player on your watchlist", time: "4h ago" },
  { icon: "up", title: "Yamal reaches all-time high: €215.0M", sub: "New peak valuation", time: "6h ago" },
  { icon: "alert", title: "Bellingham hamstring concern", sub: "Minor injury reported in training — monitor", time: "8h ago" },
  { icon: "chat", title: "@ScoutVision replied to your thread", sub: "\"Great analysis on the Wirtz transfer...\"", time: "12h ago" },
  { icon: "news", title: "World Cup squad announcements begin tomorrow", sub: "48 teams announce final 26-man squads", time: "1d ago" },
  { icon: "up", title: "Your watchlist gained €32.2M this week", sub: "Weekly portfolio summary", time: "1d ago" },
  { icon: "chat", title: "Your prediction was correct", sub: "You called Gyökeres €80M+ in March. He's now €82M. +15 rep", time: "2d ago" },
];

export default function NotificationsPage() {
  return (
    <div className="max-w-[800px] mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-mute-soft mb-2 num">Notifications</div>
          <h1 className="display text-[28px] tracking-tight">Activity feed</h1>
        </div>
        <Button kind="ghost" size="sm">Mark all read</Button>
      </div>

      <div className="space-y-2">
        {NOTIFICATIONS.map((n, i) => (
          <Card key={i} className="p-4 hover:bg-ink-800 transition cursor-pointer">
            <div className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-lg grid place-items-center shrink-0 ${
                n.icon === "up" ? "bg-up/15 text-up" :
                n.icon === "alert" ? "bg-down/15 text-down" :
                n.icon === "chat" ? "bg-acc/15 text-acc" :
                "bg-white/5 text-mute"
              }`}>
                {n.icon === "up" && <TrendingUp size={14} />}
                {n.icon === "alert" && <AlertCircle size={14} />}
                {n.icon === "chat" && <MessageCircle size={14} />}
                {n.icon === "news" && <Newspaper size={14} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium leading-snug">{n.title}</div>
                <div className="text-[12px] text-mute mt-0.5">{n.sub}</div>
              </div>
              <span className="text-[11px] text-mute-soft num shrink-0">{n.time}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
