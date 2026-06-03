import type { Metadata } from "next";
import { Bell } from "lucide-react";
import { ComingSoon } from "@/components/ui";

export const metadata: Metadata = {
  title: "Notifications — Onside",
  description: "Price alerts and transfer updates will appear here once you have an Onside account.",
};

export default function NotificationsPage() {
  return (
    <ComingSoon
      icon={<Bell size={20} />}
      eyebrow="Notifications"
      title="Notifications"
      line="Price alerts and transfer updates will appear here once you have an account."
      cta={{ label: "Browse players", href: "/players" }}
    />
  );
}
