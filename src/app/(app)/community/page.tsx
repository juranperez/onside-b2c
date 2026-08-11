import type { Metadata } from "next";
import { MessageCircle } from "lucide-react";
import { ComingSoon } from "@/components/ui";

export const metadata: Metadata = {
  title: "Community — Onside",
  description: "Threads, reputation and receipts are launching soon on Onside.",
};

export default function CommunityPage() {
  return (
    <ComingSoon
      icon={<MessageCircle size={20} />}
      eyebrow="Community"
      title="Community"
      line="Threads, reputation and receipts are launching soon."
      cta={{ label: "Browse players", href: "/players" }}
    />
  );
}
