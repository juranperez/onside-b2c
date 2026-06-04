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
  secondary: "bg-fg text-ink-900 hover:bg-fg/90",
  ghost: "bg-overlay/5 hover:bg-overlay/10 text-fg border border-line",
  outline: "bg-transparent hover:bg-overlay/5 text-fg border border-line",
  danger: "bg-down/15 hover:bg-down/25 text-down border border-down/30",
  quiet: "text-mute hover:text-fg",
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
