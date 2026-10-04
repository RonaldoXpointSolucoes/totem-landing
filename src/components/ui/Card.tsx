import React from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  selected?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, interactive = false, selected = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "relative rounded-2xl sm:rounded-3xl border p-5 transition-all duration-300",
          "bg-white dark:bg-slate-900/70 border-black/10 dark:border-slate-800 text-[#1d1d1f] dark:text-white shadow-md dark:shadow-xl backdrop-blur-xl",
          interactive &&
            "cursor-pointer hover:border-[#0071e3]/40 dark:hover:border-slate-700 hover:bg-slate-50/60 dark:hover:bg-slate-850/70 hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.99]",
          selected &&
            "border-[#0071e3] bg-blue-50/50 dark:bg-indigo-950/50 ring-2 ring-[#0071e3]/30 shadow-lg shadow-blue-500/10 dark:shadow-indigo-500/20",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";
