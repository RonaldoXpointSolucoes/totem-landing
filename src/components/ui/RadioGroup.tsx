"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export interface RadioOption {
  id: string;
  label: string;
  description?: string;
  priceTag?: string;
  icon?: React.ReactNode;
}

export interface RadioGroupProps {
  options: RadioOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export const RadioGroup: React.FC<RadioGroupProps> = ({
  options,
  value,
  onChange,
  className,
}) => {
  return (
    <div className={cn("grid gap-3", className)}>
      {options.map((opt) => {
        const isSelected = value === opt.id;
        return (
          <div
            key={opt.id}
            onClick={() => onChange(opt.id)}
            className={cn(
              "flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer select-none",
              "bg-slate-900/60 backdrop-blur-md border-slate-800",
              isSelected
                ? "border-indigo-500 bg-indigo-950/20 shadow-md shadow-indigo-500/10 ring-1 ring-indigo-500/50"
                : "hover:border-slate-700 hover:bg-slate-850/60"
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "w-5 h-5 rounded-full border flex items-center justify-center transition-colors",
                  isSelected
                    ? "border-indigo-500 bg-indigo-600 text-white"
                    : "border-slate-600 bg-slate-800"
                )}
              >
                {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
              {opt.icon && <div className="text-slate-300">{opt.icon}</div>}
              <div>
                <p className="text-sm font-semibold text-slate-100">{opt.label}</p>
                {opt.description && (
                  <p className="text-xs text-slate-400 mt-0.5">{opt.description}</p>
                )}
              </div>
            </div>
            {opt.priceTag && (
              <span
                className={cn(
                  "text-xs font-semibold px-2.5 py-1 rounded-md border",
                  isSelected
                    ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
                    : "bg-slate-800/80 text-slate-400 border-slate-700"
                )}
              >
                {opt.priceTag}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};
