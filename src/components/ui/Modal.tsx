"use client";

import React, { useEffect } from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  className,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      {/* Backdrop com desfoque */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Dialog / Mobile Bottom Sheet */}
      <div
        className={cn(
          "relative w-full max-w-lg rounded-t-[28px] sm:rounded-2xl bg-slate-900 border-t sm:border border-slate-700/80 shadow-2xl p-5 sm:p-6 z-10",
          "max-h-[92vh] flex flex-col overflow-y-auto pb-[max(1.5rem,env(safe-area-inset-bottom))]",
          "animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:fade-in-0 sm:zoom-in-95 duration-200",
          className
        )}
      >
        {/* Barra puxador visual para mobile */}
        <div className="sm:hidden w-12 h-1.5 bg-slate-700/80 rounded-full mx-auto mb-3 shrink-0" />

        <button
          onClick={onClose}
          className="absolute right-4 top-4 w-10 h-10 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 active:scale-90 flex items-center justify-center transition-all cursor-pointer"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {title && <h3 className="text-lg font-bold text-slate-100 pr-8">{title}</h3>}
        {description && <p className="mt-1 text-xs sm:text-sm text-slate-400">{description}</p>}

        <div className="mt-4 flex-1">{children}</div>
      </div>
    </div>
  );
};
