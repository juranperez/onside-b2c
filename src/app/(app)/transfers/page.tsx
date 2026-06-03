import type { Metadata } from "next";
import { ArrowRightLeft } from "lucide-react";
import { ComingSoon } from "@/components/ui";

export const metadata: Metadata = {
  title: "Transfers — Onside",
  description: "Live transfer-window tracking is coming soon to Onside.",
};

export default function TransfersPage() {
  return (
    <ComingSoon
      icon={<ArrowRightLeft size={20} />}
      eyebrow="Transfer window"
      title="Transfers"
      line="Live transfer-window tracking is coming soon."
      cta={{ label: "Browse players", href: "/players" }}
    />
  );
}
