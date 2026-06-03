import type { Metadata } from "next";
import { ClipboardList } from "lucide-react";
import { ComingSoon } from "@/components/ui";

export const metadata: Metadata = {
  title: "Managers — Onside",
  description: "Manager profiles are coming soon to Onside.",
};

export default function ManagersPage() {
  return (
    <ComingSoon
      icon={<ClipboardList size={20} />}
      eyebrow="Elite coaches"
      title="Managers"
      line="Manager profiles are coming soon."
      cta={{ label: "Browse players", href: "/players" }}
    />
  );
}
