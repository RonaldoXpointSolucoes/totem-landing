"use client";

import React, { useEffect } from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className,
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Container */}
      <div
        className={cn(
          "relative z-10 w-full rounded-t-3xl bg-slate-900 border-t border-slate-700/80 shadow-2xl p-6 max-h-[85vh] overflow-y-auto",
          "animate-in slide-in-from-bottom duration-300",
          className
        )}
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-700" />
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          {title && <h3 className="text-base font-semibold text-slate-100">{title}</h3>}
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="pt-4">{children}</div>
      </div>
    </div>
  );
};
