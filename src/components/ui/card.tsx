import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      className={cn("rounded-2xl bg-ink-850 border border-line shadow-soft relative", className)}
      {...props}
    >
      {children}
    </div>
  );
}
