import React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "primary" | "secondary" | "success" | "warning" | "accent";
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = "primary",
  children,
  ...props
}) => {
  const variantStyles = {
    primary:
      "bg-blue-50 dark:bg-indigo-500/15 text-[#0071e3] dark:text-indigo-300 border-blue-200 dark:border-indigo-500/30",
    secondary:
      "bg-[#f5f5f7] dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-black/10 dark:border-slate-700 font-semibold",
    success:
      "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30",
    warning:
      "bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30",
    accent:
      "bg-blue-50/80 dark:bg-cyan-500/15 text-[#0071e3] dark:text-cyan-300 border-blue-200 dark:border-cyan-500/30",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border backdrop-blur-md transition-colors",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};
