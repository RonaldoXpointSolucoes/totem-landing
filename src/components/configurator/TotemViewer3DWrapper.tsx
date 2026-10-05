"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { CabinetModel, ColorOption } from "@/types/catalog";
import { Badge, Button } from "@/components/ui";
import { Box, Image as ImageIcon, RotateCw, Sparkles, AlertCircle, Wrench, ShieldCheck, Film } from "lucide-react";
import { InstagramVideoPlayer, InstagramGlyph } from "@/components/media";
import { formatBRL } from "@/modules/pricing/pricingEngine";
import { trackEvent, ANALYTICS_EVENTS } from "@/lib/analytics/tracker";

interface TotemViewer3DWrapperProps {
  selectedModel: CabinetModel;
  selectedColor: ColorOption;
  hasPrinter?: boolean;
  hasScanner?: boolean;
}

export const TotemViewer3DWrapper: React.FC<TotemViewer3DWrapperProps> = ({
  selectedModel,
  selectedColor,
  hasPrinter = true,
  hasScanner = true,
}) => {
  // Lista de vídeos do Instagram extraídos do modelo
  const modelVideos: string[] = useMemo(() => {
    let list: string[] = [];
    if (Array.isArray(selectedModel.videoUrls)) list = [...list, ...selectedModel.videoUrls];
    if (Array.isArray(selectedModel.instagramVideos)) list = [...list, ...selectedModel.instagramVideos];
    if (Array.isArray(selectedModel.dimensions?.videoUrls)) list = [...list, ...selectedModel.dimensions.videoUrls];
    if (Array.isArray(selectedModel.dimensions?.instagramVideos)) list = [...list, ...selectedModel.dimensions.instagramVideos];
    return Array.from(new Set(list.filter(Boolean)));
  }, [selectedModel]);

  // Modo de visualização: "2d" (estático), "3d" (interativo Three.js) ou "video" (Instagram Reels)
  const [mode, setMode] = useState<"2d" | "3d" | "video">("2d");
  const [activeVideoIndex, setActiveVideoIndex] = useState<number>(0);
  const [is3DLoaded, setIs3DLoaded] = useState<boolean>(false);
  const [isDoorOpen, setIsDoorOpen] = useState<boolean>(false);
  const [activeHotspotMessage, setActiveHotspotMessage] = useState<string | null>(null);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Envio de comandos via postMessage para o iframe 3D
  const postToViewer = useCallback((message: Record<string, unknown>) => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(message, "*");
    }
  }, []);

  // Sincroniza modelo, cor e periféricos sempre que mudarem no configurador
  useEffect(() => {
    if (mode === "3d" && is3DLoaded) {
      postToViewer({
        type: "UPDATE_TOTEM",
        model: selectedModel.id,
        modelName: selectedModel.name,
        colorHex: selectedColor.hexReference,
        colorName: selectedColor.name,
        hasPrinter,
        hasScanner,
        isDoorOpen,
      });
    }
  }, [mode, is3DLoaded, selectedModel, selectedColor, hasPrinter, hasScanner, isDoorOpen, postToViewer]);

  // Listener de eventos vindos do iframe (postMessage bidirecional)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== "object") return;

      if (data.type === "VIEWER_READY") {
        setIs3DLoaded(true);
        postToViewer({
          type: "UPDATE_TOTEM",
          model: selectedModel.id,
          modelName: selectedModel.name,
          colorHex: selectedColor.hexReference,
          colorName: selectedColor.name,
          hasPrinter,
          hasScanner,
          isDoorOpen: false,
        });
      }

      if (data.type === "HOTSPOT_CLICKED") {
        setActiveHotspotMessage(`${data.title}: ${data.description}`);
      }

      if (data.type === "DOOR_STATE_CHANGED") {
        setIsDoorOpen(!!data.isDoorOpen);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [selectedModel, selectedColor, hasPrinter, hasScanner, postToViewer]);

  const handleToggleDoor = () => {
    const next = !isDoorOpen;
    setIsDoorOpen(next);
    trackEvent(ANALYTICS_EVENTS.INTERACT_3D, {
      action: next ? "open_door" : "close_door",
      modelId: selectedModel.id,
      modelName: selectedModel.name,
    });
    postToViewer({
      type: "TOGGLE_DOOR",
    });
  };

  const currentVideoUrl = modelVideos[activeVideoIndex] || modelVideos[0] || "";

  return (
    <div className="space-y-4">
      {/* Barra de Alternância 2D / 3D / Vídeo Instagram */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[#f5f5f7] dark:bg-slate-900 border border-black/10 dark:border-slate-800 transition-colors">
          <button
            onClick={() => setMode("2d")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              mode === "2d"
                ? "bg-white dark:bg-slate-800 text-[#1d1d1f] dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white"
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Foto 2D</span>
          </button>

          <button
            onClick={() => {
              setMode("3d");
              trackEvent(ANALYTICS_EVENTS.VIEW_3D_MODEL, {
                modelId: selectedModel.id,
                modelName: selectedModel.name,
                color: selectedColor.name,
                mode: "3d_interactive",
              });
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              mode === "3d"
                ? "bg-[#0071e3] text-white shadow-md shadow-blue-500/25"
                : "text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white"
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span>3D Interativo 360°</span>
          </button>

          {modelVideos.length > 0 && (
            <button
              onClick={() => {
                setMode("video");
                trackEvent(ANALYTICS_EVENTS.INTERACT_3D, {
                  action: "watch_instagram_video",
                  modelId: selectedModel.id,
                  modelName: selectedModel.name,
                });
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                mode === "video"
                  ? "bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 text-white shadow-md shadow-rose-500/25"
                  : "text-slate-600 dark:text-slate-400 hover:text-rose-500 dark:hover:text-rose-400"
              }`}
            >
              <InstagramGlyph className="w-3.5 h-3.5" />
              <span>Vídeo (Instagram)</span>
            </button>
          )}
        </div>

        {mode === "3d" ? (
          <Badge variant="accent" className="text-[10px] animate-pulse">
            WebGL Live
          </Badge>
        ) : mode === "video" ? (
          <Badge variant="accent" className="text-[10px] bg-gradient-to-r from-amber-500/20 to-rose-500/20 text-rose-500 border border-rose-500/30">
            Reels Oficial
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-[10px]">
            Foto Estática
          </Badge>
        )}
      </div>

      {/* Janela de Visualização (2D vs 3D vs Vídeo) */}
      <div className="relative h-[210px] sm:h-[240px] lg:h-[270px] w-full rounded-2xl sm:rounded-3xl bg-gradient-to-b from-[#f8f9fa] to-[#eceef1] dark:from-slate-950/80 dark:to-slate-900/80 border border-black/10 dark:border-slate-800 overflow-hidden shadow-md dark:shadow-xl flex flex-col items-center justify-center transition-colors">
        {mode === "2d" ? (
          /* MODO 2D: Imagem Estática Leve (<50KB) com máxima velocidade */
          <div className="relative w-full h-full p-4 flex flex-col items-center justify-center animate-in fade-in duration-300">
            <img
              src={selectedModel.mainImage}
              alt={selectedModel.name}
              className="h-full w-auto object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.15)] dark:drop-shadow-[0_15px_30px_rgba(79,70,229,0.25)] transition-all duration-300"
            />

            {/* Botões Convite para Ativar 3D ou Vídeo */}
            <div className="absolute bottom-11 flex items-center gap-2 z-10">
              <button
                onClick={() => setMode("3d")}
                className="px-3.5 py-1.5 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white text-[11px] font-bold shadow-md shadow-blue-500/25 flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <Box className="w-3.5 h-3.5" />
                <span>Girar em 3D</span>
              </button>

              {modelVideos.length > 0 && (
                <button
                  onClick={() => setMode("video")}
                  className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 hover:brightness-110 text-white text-[11px] font-bold shadow-md shadow-rose-500/25 flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                  title="Assistir Reels do Instagram"
                >
                  <InstagramGlyph className="w-3.5 h-3.5" />
                  <span>Ver Vídeo</span>
                </button>
              )}
            </div>
          </div>
        ) : mode === "video" && currentVideoUrl ? (
          /* MODO VÍDEO DO INSTAGRAM */
          <div className="relative w-full h-full animate-in fade-in duration-300 bg-black flex flex-col items-center justify-center">
            <InstagramVideoPlayer
              url={currentVideoUrl}
              title={`${selectedModel.name} no Instagram`}
              showDirectButton={true}
              className="w-full h-full"
            />

            {/* Alternador de Múltiplos Vídeos se houver */}
            {modelVideos.length > 1 && (
              <div className="absolute bottom-14 left-3 right-3 flex items-center justify-center gap-1.5 z-20 pointer-events-none">
                <div className="pointer-events-auto flex items-center gap-1 p-1 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700 shadow-lg">
                  {modelVideos.map((_, vIdx) => (
                    <button
                      key={vIdx}
                      onClick={() => setActiveVideoIndex(vIdx)}
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-all ${
                        activeVideoIndex === vIdx
                          ? "bg-rose-500 text-white"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Vídeo {vIdx + 1}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* MODO 3D: Iframe isolado em sandbox de alta performance */
          <div className="relative w-full h-full animate-in fade-in duration-300">
            <iframe
              ref={iframeRef}
              src="/viewer3d"
              title="Visualizador 3D Totem Pro"
              className="w-full h-full border-0 select-none"
              loading="lazy"
            />

            {/* Controles Flutuantes do 3D dentro do Configurador */}
            <div className="absolute bottom-14 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
              <button
                onClick={handleToggleDoor}
                className="pointer-events-auto px-3.5 py-1.5 rounded-full bg-white/90 dark:bg-slate-900/90 hover:bg-white dark:hover:bg-slate-800 border border-black/10 dark:border-slate-700 text-[11px] font-bold text-[#1d1d1f] dark:text-white shadow-lg backdrop-blur-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>{isDoorOpen ? "🚪 Fechar Porta" : "🚪 Abrir Porta Técnica"}</span>
              </button>

              <button
                onClick={() => postToViewer({ type: "RESET_VIEW" })}
                className="pointer-events-auto p-2 rounded-full bg-white/90 dark:bg-slate-900/90 hover:bg-white dark:hover:bg-slate-800 border border-black/10 dark:border-slate-700 text-[#1d1d1f] dark:text-slate-300 shadow-lg backdrop-blur-md transition-all cursor-pointer"
                title="Centralizar Câmera"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Indicador Inferior Permanente de Cor Selecionada */}
        <div className="absolute bottom-3 left-3 right-3 p-2.5 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-black/10 dark:border-slate-800 flex items-center justify-between text-xs backdrop-blur-md shadow-sm z-10">
          <div className="flex items-center gap-2">
            <span
              className="w-3.5 h-3.5 rounded-full border border-black/20 dark:border-slate-600 shadow-inner"
              style={{ background: selectedColor.hexReference }}
            />
            <span className="font-bold text-[#1d1d1f] dark:text-slate-200">{selectedColor.name}</span>
          </div>
          {selectedColor.priceAdjustmentCents > 0 && (
            <span className="text-[#0071e3] dark:text-cyan-400 font-bold">
              +{formatBRL(selectedColor.priceAdjustmentCents)}
            </span>
          )}
        </div>
      </div>

      {/* Feedback de Hotspot Clicado */}
      {activeHotspotMessage && (
        <div className="p-3 bg-blue-50/80 dark:bg-indigo-950/40 border border-blue-200 dark:border-indigo-500/30 rounded-2xl text-xs space-y-1 animate-in fade-in">
          <div className="flex items-center gap-1.5 text-[#0071e3] dark:text-cyan-400 font-bold">
            <Wrench className="w-3.5 h-3.5" />
            <span>Detalhe de Engenharia:</span>
          </div>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{activeHotspotMessage}</p>
        </div>
      )}
    </div>
  );
};
