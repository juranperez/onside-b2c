import { cn } from "@/lib/utils";
import { forwardRef } from "react";

type ButtonKind = "primary" | "secondary" | "ghost" | "outline" | "danger" | "quiet";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  kind?: ButtonKind;
  size?: ButtonSize;
  icon?: React.ReactNode;
}

const sizes: Record<ButtonSize, string> = {
  sm: "h-7 px-2.5 text-xs gap-1.5",
  md: "h-9 px-3.5 text-sm gap-2",
  lg: "h-11 px-4 text-sm gap-2",
};

const kinds: Record<ButtonKind, string> = {
  primary: "bg-acc text-ink-900 hover:bg-acc/90",
  secondary: "bg-white text-ink-900 hover:bg-white/90",
  ghost: "bg-white/5 hover:bg-white/10 text-white border border-line",
  outline: "bg-transparent hover:bg-white/5 text-white border border-line",
  danger: "bg-down/15 hover:bg-down/25 text-down border border-down/30",
  quiet: "text-mute hover:text-white",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ kind = "ghost", size = "md", icon, className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-medium rounded-lg transition focus-ring cursor-pointer",
          sizes[size],
          kinds[kind],
          className
        )}
        {...props}
      >
        {icon}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
