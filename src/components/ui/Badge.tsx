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
    primary: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
    secondary: "bg-slate-800 text-slate-300 border-slate-700",
    success: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    warning: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    accent: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border backdrop-blur-md",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};
