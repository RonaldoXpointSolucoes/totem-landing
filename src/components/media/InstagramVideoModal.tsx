"use client";

import React, { useEffect } from "react";
import { X, ExternalLink } from "lucide-react";
import { InstagramVideoPlayer, InstagramGlyph } from "./InstagramVideoPlayer";
import { parseInstagramUrl } from "@/lib/media/videoUtils";

interface InstagramVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string;
  title?: string;
  productName?: string;
}

export function InstagramVideoModal({
  isOpen,
  onClose,
  videoUrl,
  title,
  productName,
}: InstagramVideoModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !videoUrl) return null;

  const parsed = parseInstagramUrl(videoUrl);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xl p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] my-auto animate-in zoom-in-95 duration-200">
        {/* Cabeçalho do Modal */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center shadow-lg shadow-rose-500/20 text-white">
              <InstagramGlyph className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-white tracking-tight leading-snug">
                {productName ? `${productName} em Vídeo` : title || "Demonstração do Produto"}
              </h3>
              <span className="text-[11px] text-slate-400 font-medium block">
                {parsed.isInstagram ? "Instagram Reels Oficial" : "Vídeo Demonstrativo"}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-all active:scale-95"
            title="Fechar (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo com o Player de Vídeo */}
        <div className="p-4 sm:p-5 flex-1 flex flex-col items-center justify-center overflow-y-auto">
          <div className="w-full h-[480px] sm:h-[540px] max-h-[70vh]">
            <InstagramVideoPlayer
              url={videoUrl}
              title={title}
              showDirectButton={false}
              className="h-full w-full"
            />
          </div>
        </div>

        {/* Rodapé com botão Abrir no Instagram */}
        <div className="px-5 py-3.5 border-t border-slate-800/80 bg-slate-950/60 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Deseja curtir ou comentar?
          </span>
          <a
            href={parsed.canonicalUrl || parsed.originalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 hover:brightness-110 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-rose-500/20 transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            <span>Ver no Instagram</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
