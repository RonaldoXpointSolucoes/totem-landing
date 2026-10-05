"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { ChevronLeft, ChevronRight, Image as ImageIcon } from "lucide-react";
import {
  preloadCarouselImages,
  preloadSingleImage,
  onImageReady,
  isImagePreloaded,
  getOptimizedImageUrl,
} from "@/lib/media/imageCache";

export { preloadCarouselImages };

interface ModelImageCarouselProps {
  images: string[];
  alt: string;
  intervalMs?: number; // Padrão: 10000 (10 segundos)
  className?: string;
  imageClassName?: string;
  showDots?: boolean;
  showArrows?: boolean;
  showCounter?: boolean;
  showProgressBar?: boolean;
  objectFit?: "contain" | "cover";
  onImageChange?: (index: number) => void;
  priority?: boolean;
}

export function ModelImageCarousel({
  images = [],
  alt,
  intervalMs = 10000,
  className = "",
  imageClassName = "",
  showDots = true,
  showArrows = true,
  showCounter = true,
  showProgressBar = true,
  objectFit = "contain",
  onImageChange,
  priority = false,
}: ModelImageCarouselProps) {
  // Limpa lista de imagens e remove duplicatas ou valores vazios
  const cleanImages = useMemo(() => {
    const valid = (images || []).filter(
      (img) => typeof img === "string" && img.trim().length > 0
    );
    return Array.from(new Set(valid));
  }, [images]);

  const total = cleanImages.length;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [outgoingIndex, setOutgoingIndex] = useState<number | null>(null);
  const [direction, setDirection] = useState<"next" | "prev">("next");
  const [isHovered, setIsHovered] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [loadedUrls, setLoadedUrls] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    if (typeof window !== "undefined") {
      cleanImages.forEach((url) => {
        if (isImagePreloaded(url)) initial.add(url);
      });
    }
    return initial;
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const transitionTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Pré-carregamento prioritário inteligente via imageCache
  useEffect(() => {
    if (total === 0) return;

    // Pré-carrega de imediato a foto atual e a próxima na GPU
    preloadCarouselImages(cleanImages, currentIndex);

    // Registra listeners de prontidão para cada imagem
    const unsubscribes = cleanImages.map((url) =>
      onImageReady(url, () => {
        setLoadedUrls((prev) => {
          if (prev.has(url)) return prev;
          const next = new Set(prev);
          next.add(url);
          return next;
        });
      })
    );

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [cleanImages, total, currentIndex]);

  // Garante que o currentIndex não estoure se a lista mudar dinamicamente
  useEffect(() => {
    if (currentIndex >= total && total > 0) {
      setCurrentIndex(0);
    }
  }, [total, currentIndex]);

  // Função centralizada para executar a transição de slide animada
  const triggerTransition = useCallback(
    (nextIdx: number, dir: "next" | "prev") => {
      if (nextIdx === currentIndex || total <= 1) return;

      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
      }

      setDirection(dir);
      setOutgoingIndex(currentIndex);
      setCurrentIndex(nextIdx);
      setIsTransitioning(true);

      onImageChange?.(nextIdx);

      // Pré-carrega a foto subsequente imediatamente
      const subsequentIdx = dir === "next" ? (nextIdx + 1) % total : (nextIdx - 1 + total) % total;
      if (cleanImages[subsequentIdx]) {
        preloadSingleImage(cleanImages[subsequentIdx]);
      }

      // Encerra estado de transição após 920ms (acompanha os 0.9s da animação suave)
      transitionTimerRef.current = setTimeout(() => {
        setIsTransitioning(false);
        setOutgoingIndex(null);
      }, 920);
    },
    [currentIndex, total, cleanImages, onImageChange]
  );

  const goToNext = useCallback(
    (e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      if (total <= 1) return;
      const next = (currentIndex + 1) % total;
      triggerTransition(next, "next");
    },
    [total, currentIndex, triggerTransition]
  );

  const goToPrev = useCallback(
    (e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      if (total <= 1) return;
      const prev = (currentIndex - 1 + total) % total;
      triggerTransition(prev, "prev");
    },
    [total, currentIndex, triggerTransition]
  );

  const goToIndex = useCallback(
    (idx: number, e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      if (idx >= 0 && idx < total && idx !== currentIndex) {
        const dir = idx > currentIndex ? "next" : "prev";
        triggerTransition(idx, dir);
      }
    },
    [total, currentIndex, triggerTransition]
  );

  // Troca automática periódica (10s padrão) com pausa em hover
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

  // Limpeza de timers na desmontagem
  useEffect(() => {
    return () => {
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Suporte a swipe por toque em dispositivos móveis
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX - touchEndX;
    if (Math.abs(diff) > 35) {
      if (diff > 0) {
        goToNext();
      } else {
        goToPrev();
      }
    }
    setTouchStartX(null);
  };

  if (total === 0) {
    return (
      <div className={`flex flex-col items-center justify-center p-6 text-slate-400 ${className}`}>
        <ImageIcon className="w-8 h-8 opacity-40 mb-2" />
        <span className="text-xs font-medium">Foto indisponível</span>
      </div>
    );
  }

  // Identificação das imagens ativas
  const currentSrc = cleanImages[currentIndex] || "";
  const outgoingSrc = outgoingIndex !== null ? cleanImages[outgoingIndex] : null;

  return (
    <div
      className={`relative w-full h-full select-none overflow-hidden group flex items-center justify-center ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Barra de Progresso Superior (Timeline do Carrossel de 10s) */}
      {showProgressBar && total > 1 && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-black/5 dark:bg-white/5 z-20 overflow-hidden pointer-events-none">
          <div
            key={`progress-${currentIndex}-${isHovered}`}
            className={`h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-r-full ${
              isHovered ? "opacity-40" : "opacity-90"
            }`}
            style={{
              width: "100%",
              transformOrigin: "left center",
              animation: isHovered
                ? "none"
                : `totemCarouselProgress ${intervalMs}ms linear forwards`,
            }}
          />
        </div>
      )}

      {/* Contêiner de Visualização com Animação Suave e Elegante de Dissolve */}
      <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
        {/* Slide Saindo (Outgoing) durante a transição com fade out e sutil drift */}
        {outgoingSrc && isTransitioning && (
          <div
            key={`outgoing-${outgoingSrc}-${outgoingIndex}`}
            className={`absolute inset-0 w-full h-full flex items-center justify-center pointer-events-none transform-gpu ${
              direction === "next"
                ? "animate-totem-outgoing-next"
                : "animate-totem-outgoing-prev"
            }`}
            style={{ willChange: "transform, opacity" }}
          >
            <img
              src={getOptimizedImageUrl(outgoingSrc)}
              alt={`${alt} - Foto ${outgoingIndex! + 1}`}
              className={`w-full h-full ${
                objectFit === "contain" ? "object-contain" : "object-cover"
              } ${imageClassName}`}
              decoding="async"
              draggable={false}
            />
          </div>
        )}

        {/* Slide Entrando / Ativo (Incoming / Active) com fade in e sutil aproximação */}
        <div
          key={`current-${currentSrc}-${currentIndex}`}
          className={`absolute inset-0 w-full h-full flex items-center justify-center pointer-events-auto transform-gpu ${
            isTransitioning
              ? direction === "next"
                ? "animate-totem-incoming-next"
                : "animate-totem-incoming-prev"
              : "translate-x-0 opacity-100 scale-100"
          }`}
          style={{ willChange: "transform, opacity" }}
        >
          {/* Skeleton Shimmer enquanto decodifica na memória */}
          {!loadedUrls.has(currentSrc) && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-200/40 dark:bg-slate-800/40 animate-pulse rounded-2xl">
              <ImageIcon className="w-8 h-8 text-slate-400/40 animate-spin" />
            </div>
          )}

          <img
            src={getOptimizedImageUrl(currentSrc)}
            alt={`${alt} - Foto ${currentIndex + 1} de ${total}`}
            loading={priority || currentIndex === 0 ? "eager" : "lazy"}
            fetchPriority={priority || currentIndex === 0 ? "high" : "auto"}
            onLoad={() => {
              setLoadedUrls((prev) => new Set(prev).add(currentSrc));
            }}
            className={`w-full h-full transition-opacity duration-300 ${
              objectFit === "contain" ? "object-contain" : "object-cover"
            } ${loadedUrls.has(currentSrc) ? "opacity-100" : "opacity-90 blur-[0.5px]"} ${imageClassName}`}
            decoding="async"
            draggable={false}
          />
        </div>
      </div>

      {/* Controles Manuais: Setas Esquerda / Direita com Hover Glow */}
      {showArrows && total > 1 && (
        <>
          <button
            type="button"
            onClick={goToPrev}
            aria-label="Foto anterior"
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-950/70 hover:bg-slate-900 text-white backdrop-blur-md border border-white/15 flex items-center justify-center opacity-85 sm:opacity-0 sm:group-hover:opacity-100 transition-all hover:scale-110 active:scale-95 z-20 cursor-pointer shadow-lg shadow-black/25"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <button
            type="button"
            onClick={goToNext}
            aria-label="Próxima foto"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-950/70 hover:bg-slate-900 text-white backdrop-blur-md border border-white/15 flex items-center justify-center opacity-85 sm:opacity-0 sm:group-hover:opacity-100 transition-all hover:scale-110 active:scale-95 z-20 cursor-pointer shadow-lg shadow-black/25"
          >
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </>
      )}

      {/* Contador Numérico Estilizado (ex: 5/11) */}
      {showCounter && total > 1 && (
        <div className="absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-full bg-slate-950/75 backdrop-blur-md border border-white/15 text-white text-[10px] font-mono font-bold tracking-wider z-20 shadow-sm pointer-events-none">
          {currentIndex + 1}/{total}
        </div>
      )}

      {/* Indicadores de Paginação (Bullets / Dots interativos com expansão fluida) */}
      {showDots && total > 1 && (
        <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 p-1 rounded-full bg-slate-950/65 backdrop-blur-md border border-white/15 z-20 shadow-md">
          {cleanImages.slice(0, Math.min(total, 9)).map((_, idx) => {
            const isActive = currentIndex === idx;
            return (
              <button
                key={idx}
                type="button"
                onClick={(e) => goToIndex(idx, e)}
                aria-label={`Ir para foto ${idx + 1}`}
                className={`transition-all duration-300 rounded-full cursor-pointer ${
                  isActive
                    ? "w-5 h-1.5 bg-gradient-to-r from-blue-400 to-[#0071e3] shadow-sm scale-105"
                    : "w-1.5 h-1.5 bg-white/40 hover:bg-white/80"
                }`}
              />
            );
          })}
          {total > 9 && (
            <span className="text-[9px] font-mono text-white/70 px-1 font-semibold">
              +{total - 9}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
