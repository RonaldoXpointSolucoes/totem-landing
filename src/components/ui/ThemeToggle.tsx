"use client";

import React from "react";
import { useTheme } from "@/lib/theme/ThemeContext";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 select-none cursor-pointer border ${
        theme === "light"
          ? "bg-[#f5f5f7] hover:bg-[#e8e8ed] text-[#1d1d1f] border-black/10 shadow-sm"
          : "bg-slate-900/80 hover:bg-slate-800 text-slate-200 border-slate-700/80 shadow-md"
      } ${className}`}
      title={theme === "light" ? "Mudar para Modo Escuro" : "Mudar para Modo Claro (Apple iMac)"}
      aria-label="Alternar tema claro e escuro"
    >
      <div className="relative w-4 h-4 flex items-center justify-center">
        {theme === "light" ? (
          <Sun className="w-4 h-4 text-amber-500 animate-in spin-in-180 duration-300" />
        ) : (
          <Moon className="w-4 h-4 text-indigo-400 animate-in spin-in-180 duration-300" />
        )}
      </div>
      <span className="text-[11px] font-medium hidden sm:inline">
        {theme === "light" ? "Claro (iMac)" : "Escuro"}
      </span>
    </button>
  );
}
