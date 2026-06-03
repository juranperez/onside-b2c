import type { Metadata } from "next";
import { Sparkles } from "lucide-react";
import { ComingSoon } from "@/components/ui";

export const metadata: Metadata = {
  title: "AI Coach — Onside",
  description: "Ask anything about players, transfers and tactics. The Onside AI Coach is coming soon.",
};

export default function CoachPage() {
  return (
    <ComingSoon
      icon={<Sparkles size={20} className="text-acc" />}
      eyebrow="AI Coach · Pro"
      title="AI Coach"
      line="Ask anything about players, transfers and tactics — the AI Coach is coming soon."
      cta={{ label: "Browse players", href: "/players" }}
      note="Included with Onside Pro at launch."
    />
  );
}
