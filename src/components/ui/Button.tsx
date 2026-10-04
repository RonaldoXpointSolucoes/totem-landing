import React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg" | "xl";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading = false, children, disabled, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0071e3] disabled:opacity-50 disabled:cursor-not-allowed select-none rounded-xl active:scale-[0.98] cursor-pointer";

    const variantStyles = {
      primary:
        "bg-[#0071e3] hover:bg-[#0077ed] text-white shadow-md shadow-blue-500/25 border border-blue-400/20 active:scale-[0.98]",
      secondary:
        "bg-[#f5f5f7] hover:bg-[#e8e8ed] text-slate-800 border border-black/10 hover:border-black/20 dark:bg-slate-800/90 dark:hover:bg-slate-700 dark:text-slate-100 dark:border-slate-700/80 shadow-sm backdrop-blur-sm",
      outline:
        "border border-slate-300 hover:border-slate-400 text-slate-800 hover:text-black dark:border-slate-700 dark:hover:border-slate-500 dark:text-slate-200 dark:hover:text-white bg-white/80 hover:bg-slate-100/90 dark:bg-transparent dark:hover:bg-slate-800/50 shadow-sm",
      ghost:
        "text-slate-700 hover:text-black hover:bg-black/5 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800/60 bg-transparent",
      danger:
        "bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/20 border border-rose-500/40",
    };

    const sizeStyles = {
      sm: "h-9 px-3.5 text-xs gap-1.5",
      md: "h-11 px-5 text-sm gap-2",
      lg: "h-12 px-7 text-base gap-2.5 font-semibold",
      xl: "h-14 px-8 text-lg gap-3 font-semibold",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin text-current" />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
