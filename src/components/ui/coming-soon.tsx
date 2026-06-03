import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "./button";

interface ComingSoonProps {
  /** Small uppercase label above the title. */
  eyebrow?: string;
  /** Page heading. */
  title: string;
  /** One short, honest line about what's coming. */
  line: string;
  /** Optional call-to-action. */
  cta?: { label: string; href: string };
  /** Optional decorative icon (e.g. a lucide icon node). */
  icon?: React.ReactNode;
  /** Optional secondary note rendered under the CTA (muted). */
  note?: string;
  className?: string;
}

/**
 * On-brand placeholder for features whose backend doesn't exist yet.
 * A centered Card with eyebrow + title + muted line + optional CTA — honest, no fake data.
 */
export function ComingSoon({ eyebrow, title, line, cta, icon, note, className }: ComingSoonProps) {
  return (
    <div className="max-w-[1440px] mx-auto px-6 py-20">
      <div className={cn("max-w-[520px] mx-auto", className)}>
        <div className="rounded-2xl bg-ink-850 border border-line shadow-soft relative p-8 sm:p-10 text-center">
          {icon && (
            <div className="w-12 h-12 mx-auto mb-5 rounded-xl bg-white/5 border border-line grid place-items-center text-mute">
              {icon}
            </div>
          )}
          {eyebrow && (
            <div className="text-[11px] uppercase tracking-[0.18em] text-mute-soft mb-3 num">
              {eyebrow}
            </div>
          )}
          <h1 className="display text-[clamp(26px,4vw,36px)] leading-[1.05] tracking-[-0.03em]">
            {title}
          </h1>
          <p className="text-[14px] text-mute mt-3 leading-relaxed">{line}</p>
          {cta && (
            <div className="mt-7">
              <Link href={cta.href}>
                <Button kind="primary" size="md">
                  {cta.label}
                </Button>
              </Link>
            </div>
          )}
          {note && <p className="text-[11px] text-mute-soft mt-4">{note}</p>}
        </div>
      </div>
    </div>
  );
}
