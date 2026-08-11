import { Gauge, TrendingUp, Target, CalendarDays, type LucideIcon } from "lucide-react";

/** Model-grounded editorial reports — surfaced on Today (Discover) and the mobile menu. */
export interface Report {
  href: string;
  title: string;
  dek: string;
  icon: LucideIcon;
}

export const REPORTS: Report[] = [
  {
    href: "/insights/undervalued-xi",
    title: "The Undervalued XI",
    dek: "Where the Onside model sees more than the market — the biggest valuation gaps, position by position.",
    icon: Gauge,
  },
  {
    href: "/insights/biggest-movers",
    title: "This Week's Biggest Movers",
    dek: "Who's rising and falling on the Onside board over the last week, and by how much.",
    icon: TrendingUp,
  },
  {
    href: "/insights/accuracy",
    title: "The Onside Accuracy Report",
    dek: "How the Confidence % performs — the share of rumours we rated highly that were confirmed.",
    icon: Target,
  },
  {
    href: "/the-board",
    title: "The Board — weekly digest",
    dek: "The week's biggest movers and the top rumours, in one place. In your inbox every Monday.",
    icon: CalendarDays,
  },
];
