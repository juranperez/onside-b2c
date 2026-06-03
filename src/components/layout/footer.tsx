import Link from "next/link";
import { OnsideMark } from "@/components/ui/logo";

const LINKS = {
  Product: [
    { href: "/players", label: "Players" },
    { href: "/clubs", label: "Clubs" },
    { href: "/leagues", label: "Leagues" },
    { href: "/transfers", label: "Transfers" },
    { href: "/worldcup", label: "World Cup 2026" },
  ],
  Community: [
    { href: "/community", label: "Forums" },
    { href: "/coach", label: "AI Coach" },
    { href: "/compare", label: "Compare" },
  ],
  Company: [
    { href: "/pricing", label: "Pricing" },
    { href: "#", label: "About" },
    { href: "#", label: "Privacy" },
    { href: "#", label: "Terms" },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-line bg-ink-950">
      <div className="max-w-[1440px] mx-auto px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <OnsideMark size={18} />
              <span className="text-[14px] font-bold tracking-[-0.03em]">Onside<span className="text-up">.</span></span>
            </div>
            <p className="text-[12px] text-mute leading-relaxed">
              Every player. Every valuation. Live.
            </p>
          </div>
          {Object.entries(LINKS).map(([section, links]) => (
            <div key={section}>
              <h4 className="text-[11px] uppercase tracking-[0.18em] text-mute-soft mb-3 num">
                {section}
              </h4>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-[13px] text-mute hover:text-white transition"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 pt-6 border-t border-line flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[11px] text-mute-soft num">
            &copy; 2026 Onside Global, Inc.
          </p>
          <p className="text-[11px] text-mute-soft">
            Data is illustrative. Not financial advice.
          </p>
        </div>
      </div>
    </footer>
  );
}
