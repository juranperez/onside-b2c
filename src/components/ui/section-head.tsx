import { cn } from "@/lib/utils";

interface SectionHeadProps {
  eyebrow?: string;
  title: string;
  action?: React.ReactNode;
  className?: string;
}

export function SectionHead({ eyebrow, title, action, className }: SectionHeadProps) {
  return (
    <div className={cn("flex items-end justify-between gap-4 mb-4", className)}>
      <div>
        {eyebrow && (
          <div className="text-[11px] uppercase tracking-[0.18em] text-mute-soft mb-1.5 num">
            {eyebrow}
          </div>
        )}
        <h2 className="text-2xl md:text-[28px] display tracking-tight">{title}</h2>
      </div>
      {action}
    </div>
  );
}
