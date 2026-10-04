"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { CabinetModel, ColorOption } from "@/types/catalog";
import { Badge, Button } from "@/components/ui";
import { Box, Image as ImageIcon, RotateCw, Sparkles, AlertCircle, Wrench, ShieldCheck } from "lucide-react";
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
  // Modo de visualização: "2d" (estático) ou "3d" (interativo Three.js)
  const [mode, setMode] = useState<"2d" | "3d">("2d");
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
        // Envia estado inicial assim que o visualizador fica pronto
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

  return (
    <div className="space-y-4">
      {/* Barra de Alternância 2D / 3D */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800">
          <button
            onClick={() => setMode("2d")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              mode === "2d"
                ? "bg-slate-800 text-white shadow-sm"
                : "text-slate-400 hover:text-white"
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
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              mode === "3d"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Box className="w-3.5 h-3.5 text-cyan-400" />
            <span>3D Interativo 360°</span>
          </button>
        </div>

        {mode === "3d" ? (
          <Badge variant="accent" className="text-[10px] animate-pulse">
            WebGL Live
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-[10px]">
            Foto Estática
          </Badge>
        )}
      </div>

      {/* Janela de Visualização (2D vs 3D) */}
      <div className="relative aspect-[3/4] w-full rounded-2xl bg-slate-950/80 border border-slate-800 overflow-hidden shadow-2xl flex flex-col items-center justify-center">
        {mode === "2d" ? (
          /* MODO 2D: Imagem Estática Leve (<50KB) com máxima velocidade */
          <div className="relative w-full h-full p-6 flex flex-col items-center justify-center animate-fade-in">
            <img
              src={selectedModel.mainImage}
              alt={selectedModel.name}
              className="h-full w-auto object-contain drop-shadow-[0_15px_30px_rgba(79,70,229,0.25)] transition-all duration-300"
            />

            {/* Botão Convite para Ativar 3D */}
            <button
              onClick={() => setMode("3d")}
              className="absolute bottom-16 px-4 py-2 rounded-xl bg-indigo-600/90 hover:bg-indigo-600 text-white text-xs font-bold backdrop-blur-md border border-indigo-400/40 shadow-xl shadow-indigo-600/30 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
            >
              <Box className="w-4 h-4 text-cyan-300 animate-spin" />
              <span>Girar em 3D (360°)</span>
            </button>
          </div>
        ) : (
          /* MODO 3D: Iframe isolado em sandbox de alta performance */
          <div className="relative w-full h-full animate-fade-in">
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
                className="pointer-events-auto px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-[11px] font-bold text-white shadow-xl backdrop-blur-md transition-all flex items-center gap-1.5"
              >
                <span>{isDoorOpen ? "🚪 Fechar Porta" : "🚪 Abrir Porta Técnica"}</span>
              </button>

              <button
                onClick={() => postToViewer({ type: "RESET_VIEW" })}
                className="pointer-events-auto px-2.5 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-[11px] font-bold text-slate-300 shadow-xl backdrop-blur-md transition-all"
                title="Centralizar Câmera"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Indicador Inferior Permanente de Cor Selecionada */}
        <div className="absolute bottom-3 left-3 right-3 p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between text-xs backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span
              className="w-3.5 h-3.5 rounded-full border border-slate-600 shadow-inner"
              style={{ background: selectedColor.hexReference }}
            />
            <span className="font-semibold text-slate-200">{selectedColor.name}</span>
          </div>
          {selectedColor.priceAdjustmentCents > 0 && (
            <span className="text-indigo-400 font-bold">
              +{formatBRL(selectedColor.priceAdjustmentCents)}
            </span>
          )}
        </div>
      </div>

      {/* Feedback de Hotspot Clicado */}
      {activeHotspotMessage && (
        <div className="p-3 bg-indigo-950/40 border border-indigo-500/30 rounded-xl text-xs space-y-1 animate-fade-in">
          <div className="flex items-center justify-between text-indigo-400 font-bold">
            <span className="flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5" />
              <span>Inpeção Técnica 3D</span>
            </span>
            <button
              onClick={() => setActiveHotspotMessage(null)}
              className="text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            {activeHotspotMessage}
          </p>
        </div>
      )}

      {/* Garantia Visual de Isolamento Comercial */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800/80 text-[11px] text-slate-400">
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
        <span>Tolerância CNC submilimétrica sincronizada em tempo real.</span>
      </div>
    </div>
  );
};
