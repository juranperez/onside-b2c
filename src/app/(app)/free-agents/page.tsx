import type { Metadata } from "next";
import { UserCheck } from "lucide-react";
import { ComingSoon } from "@/components/ui";

export const metadata: Metadata = {
  title: "Free agents — Onside",
  description: "Contract-expiry tracking is coming soon to Onside.",
};

export default function FreeAgentsPage() {
  return (
    <ComingSoon
      icon={<UserCheck size={20} />}
      eyebrow="Summer window"
      title="Free agents"
      line="Contract-expiry tracking is coming soon."
      cta={{ label: "Browse players", href: "/players" }}
    />
  );
}
