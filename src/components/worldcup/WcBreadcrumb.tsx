import Link from "next/link";
import { ChevronRight, Trophy } from "lucide-react";

/** Back-nav for the WC subpages: "World Cup › {current}". */
export function WcBreadcrumb({ current }: { current: string }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[12px] text-mute-soft mb-4">
      <Link href="/worldcup" className="inline-flex items-center gap-1 hover:text-acc transition">
        <Trophy size={12} /> World Cup
      </Link>
      <ChevronRight size={12} className="opacity-50" />
      <span className="text-mute">{current}</span>
    </nav>
  );
}
