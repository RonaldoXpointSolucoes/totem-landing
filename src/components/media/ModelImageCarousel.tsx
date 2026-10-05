"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight, Image as ImageIcon } from "lucide-react";

interface ModelImageCarouselProps {
  images: string[];
  alt: string;
  intervalMs?: number; // Padrão: 10000 (10 segundos)
  className?: string;
  imageClassName?: string;
  showDots?: boolean;
  showArrows?: boolean;
  showCounter?: boolean;
  objectFit?: "contain" | "cover";
  onImageChange?: (index: number) => void;
  priority?: boolean;
}

export function ModelImageCarousel({
  images = [],
  alt,
  intervalMs = 10000, // 10 segundos conforme solicitado pelo usuário
  className = "",
  imageClassName = "",
  showDots = true,
  showArrows = true,
  showCounter = true,
  objectFit = "contain",
  onImageChange,
}: ModelImageCarouselProps) {
  // Limpa lista de imagens e remove duplicatas ou valores vazios
  const cleanImages = React.useMemo(() => {
    const valid = (images || []).filter(
      (img) => typeof img === "string" && img.trim().length > 0
    );
    // Remove duplicatas mantendo a ordem
    return Array.from(new Set(valid));
  }, [images]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Total de imagens
  const total = cleanImages.length;

  // Garante que o currentIndex não estoure se a lista mudar
  useEffect(() => {
    if (currentIndex >= total && total > 0) {
      setCurrentIndex(0);
    }
  }, [total, currentIndex]);

  const goToNext = useCallback(
    (e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      if (total <= 1) return;
      setCurrentIndex((prev) => {
        const next = (prev + 1) % total;
        onImageChange?.(next);
        return next;
      });
    },
    [total, onImageChange]
  );

  const goToPrev = useCallback(
    (e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      if (total <= 1) return;
      setCurrentIndex((prev) => {
        const prevIdx = (prev - 1 + total) % total;
        onImageChange?.(prevIdx);
        return prevIdx;
      });
    },
    [total, onImageChange]
  );

  const goToIndex = useCallback(
    (idx: number, e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      if (idx >= 0 && idx < total) {
        setCurrentIndex(idx);
        onImageChange?.(idx);
      }
    },
    [total, onImageChange]
  );

  // Troca automática de fotos a cada 10 segundos (reseta ao interagir manualmente)
  useEffect(() => {
    if (total <= 1 || isHovered) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      goToNext();
    }, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [total, isHovered, intervalMs, goToNext]);

  // Suporte a swipe touch em dispositivos móveis
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX - touchEndX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        goToNext();
      } else {
        goToPrev();
      }
    }
    setTouchStartX(null);
  };

  // Se não houver imagens
  if (total === 0) {
    return (
      <div className={`flex flex-col items-center justify-center p-6 text-slate-400 ${className}`}>
        <ImageIcon className="w-8 h-8 opacity-40 mb-2" />
        <span className="text-xs font-medium">Foto indisponível</span>
      </div>
    );
  }

  const currentImage = cleanImages[currentIndex] || cleanImages[0];

  return (
    <div
      className={`relative w-full h-full select-none overflow-hidden group flex items-center justify-center ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Imagem Atual com Transição Fade */}
      <img
        key={`${currentImage}-${currentIndex}`}
        src={currentImage}
        alt={`${alt} - Foto ${currentIndex + 1} de ${total}`}
        className={`w-full h-full drop-shadow-md transition-opacity duration-300 animate-in fade-in ${
          objectFit === "contain" ? "object-contain" : "object-cover"
        } ${imageClassName}`}
        loading="lazy"
      />

      {/* Controles Manuais: Setas Esquerda / Direita (Aparecem no hover no Desktop ou visíveis no mobile) */}
      {showArrows && total > 1 && (
        <>
          <button
            type="button"
            onClick={goToPrev}
            aria-label="Foto anterior"
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-950/60 hover:bg-slate-900/90 text-white backdrop-blur-md border border-white/10 flex items-center justify-center opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-all hover:scale-110 active:scale-95 z-20 cursor-pointer shadow-lg shadow-black/20"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={goToNext}
            aria-label="Próxima foto"
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-950/60 hover:bg-slate-900/90 text-white backdrop-blur-md border border-white/10 flex items-center justify-center opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-all hover:scale-110 active:scale-95 z-20 cursor-pointer shadow-lg shadow-black/20"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </>
      )}

      {/* Contador Numérico Discreto (ex: 1/11) */}
      {showCounter && total > 1 && (
        <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-slate-950/70 backdrop-blur-md border border-white/10 text-white text-[10px] font-mono font-bold tracking-wider z-10 shadow-sm pointer-events-none">
          {currentIndex + 1}/{total}
        </div>
      )}

      {/* Indicadores de Paginação (Dots clicáveis na parte inferior) */}
      {showDots && total > 1 && (
        <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 p-1 rounded-full bg-slate-950/50 backdrop-blur-md border border-white/10 z-20 shadow-md">
          {cleanImages.slice(0, Math.min(total, 9)).map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={(e) => goToIndex(idx, e)}
              aria-label={`Ir para foto ${idx + 1}`}
              className={`transition-all rounded-full cursor-pointer ${
                currentIndex === idx
                  ? "w-4 h-1.5 bg-gradient-to-r from-blue-400 to-[#0071e3] shadow-sm"
                  : "w-1.5 h-1.5 bg-white/40 hover:bg-white/70"
              }`}
            />
          ))}
          {total > 9 && (
            <span className="text-[9px] font-mono text-white/60 px-1">
              +{total - 9}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
