import type { Metadata } from "next";
import { MessageCircle } from "lucide-react";
import { ComingSoon } from "@/components/ui";

export const metadata: Metadata = {
  title: "Community — Onside",
  description: "Threads, reputation and receipts are launching soon on Onside.",
};

export default async function ThreadPage({ params }: { params: Promise<{ id: string }> }) {
  await params;
  return (
    <ComingSoon
      icon={<MessageCircle size={20} />}
      eyebrow="Community"
      title="This thread isn't available yet"
      line="Threads, reputation and receipts are launching soon."
      cta={{ label: "Back to community", href: "/community" }}
    />
  );
}
