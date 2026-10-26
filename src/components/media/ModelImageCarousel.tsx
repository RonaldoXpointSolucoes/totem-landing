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
  // Limpa lista de imagens, converte para WebP otimizado e remove duplicatas
  const cleanImages = useMemo(() => {
    const valid = (images || [])
      .filter((img) => typeof img === "string" && img.trim().length > 0)
      .map((img) => getOptimizedImageUrl(img.trim()));
    return Array.from(new Set(valid));
  }, [images]);

  const total = cleanImages.length;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isInViewport, setIsInViewport] = useState(priority);
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

  // Observa visibilidade no viewport para priorizar LCP da dobra principal e economizar CPU/rede fora da tela
  useEffect(() => {
    if (priority || typeof window === "undefined" || !("IntersectionObserver" in window)) {
      setIsInViewport(true);
      return;
    }

    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInViewport(true);
          }
        });
      },
      { rootMargin: "350px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [priority]);

  // 1. Pré-carregamento inteligente via imageCache apenas quando próximo ao viewport (ou priority)
  useEffect(() => {
    if (total === 0 || !isInViewport) return;

    preloadCarouselImages(cleanImages, currentIndex);

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
  }, [cleanImages, total, currentIndex, isInViewport]);

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

  // Troca automática periódica (10s padrão) com pausa em hover ou fora do viewport
  useEffect(() => {
    if (total <= 1 || isHovered || !isInViewport) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      goToNext();
    }, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [total, isHovered, isInViewport, intervalMs, goToNext]);

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
      <div className={`flex flex-col items-center justify-center p-6 text-slate-600 dark:text-slate-400 ${className}`}>
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
      ref={containerRef}
      className={`relative w-full h-full select-none overflow-hidden group flex items-center justify-center ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Barra de Progresso Superior (Timeline do Carrossel de 10s) */}
      {showProgressBar && total > 1 && isInViewport && (
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
              src={outgoingSrc}
              alt={`${alt} - Foto ${outgoingIndex! + 1}`}
              width={532}
              height={532}
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
            src={currentSrc}
            alt={`${alt} - Foto ${currentIndex + 1} de ${total}`}
            width={532}
            height={532}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
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

      {/* Controles Manuais: Setas Esquerda / Direita com área de toque >= 36x36px */}
      {showArrows && total > 1 && (
        <>
          <button
            type="button"
            onClick={goToPrev}
            aria-label="Foto anterior"
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-slate-950/80 hover:bg-slate-900 text-white backdrop-blur-md border border-white/20 flex items-center justify-center opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-all hover:scale-110 active:scale-95 z-20 cursor-pointer shadow-lg shadow-black/25"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={goToNext}
            aria-label="Próxima foto"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-slate-950/80 hover:bg-slate-900 text-white backdrop-blur-md border border-white/20 flex items-center justify-center opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-all hover:scale-110 active:scale-95 z-20 cursor-pointer shadow-lg shadow-black/25"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Contador Numérico Estilizado à esquerda superior (evita colisão com badge Sob Medida à direita) */}
      {showCounter && total > 1 && (
        <div className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full bg-slate-950/85 backdrop-blur-md border border-white/20 text-white text-[10px] font-mono font-bold tracking-wider z-20 shadow-sm pointer-events-none">
          {currentIndex + 1}/{total}
        </div>
      )}

      {/* Indicadores de Paginação Visuais (sem conflito de touch target pequeno no mobile) */}
      {showDots && total > 1 && (
        <div
          aria-hidden="true"
          className="absolute bottom-2.5 right-3 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-950/85 backdrop-blur-md border border-white/20 z-20 shadow-md pointer-events-none"
        >
          {cleanImages.slice(0, Math.min(total, 9)).map((_, idx) => {
            const isActive = currentIndex === idx;
            return (
              <span
                key={idx}
                className={`transition-all duration-300 rounded-full ${
                  isActive
                    ? "w-5 h-1.5 bg-gradient-to-r from-blue-400 to-[#0071e3] shadow-sm scale-105"
                    : "w-1.5 h-1.5 bg-white/60"
                }`}
              />
            );
          })}
          {total > 9 && (
            <span className="text-[9px] font-mono text-white px-1 font-bold">
              +{total - 9}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
