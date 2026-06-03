import type { Metadata } from "next";
import { FileText } from "lucide-react";
import { ComingSoon } from "@/components/ui";

export const metadata: Metadata = {
  title: "Contracts — Onside",
  description: "Contract intelligence is coming soon to Onside.",
};

export default function ContractsPage() {
  return (
    <ComingSoon
      icon={<FileText size={20} />}
      eyebrow="Contract intelligence"
      title="Contracts"
      line="Contract intelligence is coming soon."
      cta={{ label: "Browse players", href: "/players" }}
    />
  );
}
