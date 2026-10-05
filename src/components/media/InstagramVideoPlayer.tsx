"use client";

import React, { useState } from "react";
import { parseInstagramUrl } from "@/lib/media/videoUtils";
import { ExternalLink, Play, AlertCircle, RefreshCw } from "lucide-react";

interface InstagramVideoPlayerProps {
  url: string;
  title?: string;
  className?: string;
  aspectRatio?: "portrait" | "square" | "video" | "auto";
  autoPlay?: boolean;
  showDirectButton?: boolean;
  compact?: boolean;
}

export function InstagramVideoPlayer({
  url,
  title,
  className = "",
  aspectRatio = "auto",
  autoPlay = false,
  showDirectButton = true,
  compact = false,
}: InstagramVideoPlayerProps) {
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeError, setIframeError] = useState(false);

  const parsed = parseInstagramUrl(url);

  // Aspect ratio classes
  const aspectClass =
    aspectRatio === "portrait"
      ? "aspect-[9/16] max-h-[580px]"
      : aspectRatio === "square"
      ? "aspect-square"
      : aspectRatio === "video"
      ? "aspect-video"
      : "h-full w-full";

  if (!url) {
    return (
      <div className={`flex flex-col items-center justify-center p-6 bg-slate-900/60 border border-slate-800 rounded-2xl text-slate-400 ${className}`}>
        <AlertCircle className="w-6 h-6 mb-2 text-slate-500" />
        <span className="text-xs font-medium">Nenhum vídeo cadastrado</span>
      </div>
    );
  }

  // 1. Caso seja vídeo direto (.mp4, .webm)
  if (parsed.isDirectVideo) {
    return (
      <div className={`relative overflow-hidden rounded-2xl bg-black flex flex-col items-center justify-center ${aspectClass} ${className}`}>
        <video
          src={parsed.originalUrl}
          controls
          playsInline
          autoPlay={autoPlay}
          className="w-full h-full object-contain"
        />
        {title && (
          <div className="absolute top-2 left-2 right-2 px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-md text-white text-xs font-semibold truncate">
            {title}
          </div>
        )}
      </div>
    );
  }

  // 2. Caso seja Instagram (Reel, Post, TV)
  return (
    <div className={`relative flex flex-col items-center justify-center rounded-2xl bg-slate-950 border border-slate-800/80 overflow-hidden shadow-xl ${aspectClass} ${className}`}>
      {/* Botão de Ação Rápida: Abrir no Instagram */}
      {showDirectButton && (
        <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1.5">
          <a
            href={parsed.canonicalUrl || parsed.originalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 hover:brightness-110 text-white text-[11px] font-bold shadow-lg shadow-rose-500/25 flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-sm"
            title="Abrir no aplicativo ou site do Instagram"
          >
            <InstagramGlyph className="w-3.5 h-3.5" />
            <span>Abrir no Instagram</span>
            <ExternalLink className="w-3 h-3 ml-0.5 opacity-80" />
          </a>
        </div>
      )}

      {/* Título Opcional Flutuante */}
      {title && (
        <div className="absolute top-2.5 left-2.5 z-20 max-w-[60%] px-3 py-1.5 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-700/60 text-white text-xs font-bold truncate shadow-md">
          {title}
        </div>
      )}

      {/* Loading Skeleton enquanto o iframe carrega */}
      {!iframeLoaded && !iframeError && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950/90 gap-3 text-slate-400 p-4 text-center">
          <div className="w-8 h-8 rounded-full border-2 border-rose-500 border-t-transparent animate-spin" />
          <span className="text-xs font-medium">Carregando vídeo do Instagram...</span>
          <span className="text-[10px] text-slate-500 max-w-xs">
            Se o vídeo demorar a carregar devido a bloqueadores de cookies, utilize o botão acima para abrir direto no Instagram.
          </span>
        </div>
      )}

      {/* Iframe oficial do Instagram Embed */}
      {parsed.embedUrl ? (
        <iframe
          src={parsed.embedUrl}
          title={title || "Vídeo Demonstrativo do Instagram"}
          className={`w-full h-full border-0 transition-opacity duration-300 ${
            iframeLoaded ? "opacity-100" : "opacity-0"
          }`}
          loading="lazy"
          allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
          allowFullScreen
          onLoad={() => setIframeLoaded(true)}
          onError={() => {
            setIframeLoaded(true);
            setIframeError(true);
          }}
        />
      ) : (
        <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400 gap-3">
          <AlertCircle className="w-8 h-8 text-amber-500" />
          <p className="text-xs">Não foi possível gerar a pré-visualização direta.</p>
          <a
            href={parsed.canonicalUrl || parsed.originalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5"
          >
            <InstagramGlyph className="w-4 h-4" />
            <span>Assistir no Instagram</span>
          </a>
        </div>
      )}

      {/* Fallback caso ocorra erro no iframe */}
      {iframeError && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950 p-6 text-center text-white gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center shadow-lg">
            <InstagramGlyph className="w-6 h-6 text-white" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-bold">Visualizar no Instagram</p>
            <p className="text-xs text-slate-400 max-w-xs">
              As diretrizes de privacidade do seu navegador bloquearam a incorporação direta deste vídeo.
            </p>
          </div>
          <a
            href={parsed.canonicalUrl || parsed.originalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 text-white text-xs font-bold flex items-center gap-2 shadow-lg hover:scale-105 transition-transform"
          >
            <span>Abrir Vídeo no Instagram</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}
    </div>
  );
}

/**
 * Ícone estilizado do Instagram em SVG puro para máxima nitidez e fidelidade
 */
export function InstagramGlyph({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}
