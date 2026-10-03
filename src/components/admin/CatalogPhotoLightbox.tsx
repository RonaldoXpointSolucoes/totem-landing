"use client";

import React, { useEffect } from "react";
import { X, ChevronLeft, ChevronRight, Image as ImageIcon } from "lucide-react";

interface CatalogPhotoLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  images: string[];
  initialIndex?: number;
}

export function CatalogPhotoLightbox({
  isOpen,
  onClose,
  title,
  images,
  initialIndex = 0,
}: CatalogPhotoLightboxProps) {
  const [currentIndex, setCurrentIndex] = React.useState(initialIndex);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentIndex, images.length]);

  if (!isOpen || images.length === 0) return null;

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

  const currentUrl = images[currentIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 sm:p-6 animate-in fade-in duration-200">
      {/* Botão Fechar */}
      <button
        onClick={onClose}
        className="absolute top-5 right-5 z-20 p-2.5 rounded-full bg-slate-800/80 hover:bg-slate-700 text-white transition-all border border-slate-700 active:scale-95"
        title="Fechar (Esc)"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Conteúdo Central */}
      <div className="relative max-w-4xl w-full h-[80vh] flex flex-col items-center justify-center">
        {/* Título e Contador */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between text-white px-2 py-2">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-indigo-400" />
            <span className="font-bold text-sm tracking-tight text-white">{title}</span>
          </div>
          <span className="text-xs bg-slate-800/80 px-2.5 py-1 rounded-full text-slate-300 font-mono border border-slate-700">
            {currentIndex + 1} de {images.length}
          </span>
        </div>

        {/* Imagem Principal */}
        <div className="w-full h-full flex items-center justify-center p-4">
          {currentUrl.endsWith(".svg") ? (
            <img
              src={currentUrl}
              alt={title}
              className="max-h-full max-w-full object-contain filter drop-shadow-2xl"
            />
          ) : (
            <img
              src={currentUrl}
              alt={title}
              className="max-h-full max-w-full object-contain rounded-2xl shadow-2xl"
            />
          )}
        </div>

        {/* Setas de Navegação */}
        {images.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white transition-all border border-slate-700 active:scale-95"
              title="Foto Anterior"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white transition-all border border-slate-700 active:scale-95"
              title="Próxima Foto"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}

        {/* Barra de Miniaturas no Rodapé */}
        {images.length > 1 && (
          <div className="absolute bottom-2 flex items-center gap-2 overflow-x-auto max-w-full py-2 px-4 bg-slate-950/70 backdrop-blur-md rounded-2xl border border-slate-800/80">
            {images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`w-12 h-12 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${
                  currentIndex === idx
                    ? "border-indigo-500 scale-105 shadow-md shadow-indigo-500/30"
                    : "border-slate-800 opacity-50 hover:opacity-100"
                }`}
              >
                <img src={img} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
