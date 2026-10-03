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
          "relative rounded-2xl border p-5 transition-all duration-300",
          "bg-slate-900/60 backdrop-blur-xl border-slate-800/80 shadow-xl",
          interactive &&
            "cursor-pointer hover:border-slate-700 hover:bg-slate-850/70 hover:shadow-2xl hover:shadow-indigo-500/5 active:scale-[0.99]",
          selected &&
            "border-indigo-500/80 bg-slate-900/90 ring-2 ring-indigo-500/30 shadow-indigo-500/20 shadow-lg",
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
