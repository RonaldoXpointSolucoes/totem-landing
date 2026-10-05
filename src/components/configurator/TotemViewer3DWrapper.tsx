"use client";

import React, { useState, useMemo } from "react";
import { CabinetModel, ColorOption } from "@/types/catalog";
import { Badge } from "@/components/ui";
import { Image as ImageIcon } from "lucide-react";
import { InstagramVideoPlayer, InstagramGlyph, ModelImageCarousel } from "@/components/media";
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
}) => {
  // Lista de fotos reais do modelo selecionado (filtrando SVGs se houver fotos reais)
  const modelImages = useMemo(() => {
    let list: string[] = [];
    if (selectedModel.mainImage) list.push(selectedModel.mainImage);
    if (Array.isArray(selectedModel.images)) list.push(...selectedModel.images);
    if (Array.isArray(selectedModel.dimensions?.images)) list.push(...selectedModel.dimensions.images);

    const valid = list.filter((url) => typeof url === "string" && url.trim().length > 0);
    const hasRealPhoto = valid.some(
      (url) => !url.toLowerCase().endsWith(".svg") && !url.includes("data:image/svg")
    );
    const filtered = hasRealPhoto
      ? valid.filter((url) => !url.toLowerCase().endsWith(".svg") && !url.includes("data:image/svg"))
      : valid;

    const unique = Array.from(new Set(filtered));
    return unique.length > 0 ? unique : [selectedModel.mainImage || "/images/totems/wall/wall-white-1.png"];
  }, [selectedModel]);

  // Lista de vídeos do Instagram extraídos do modelo
  const modelVideos: string[] = useMemo(() => {
    let list: string[] = [];
    if (Array.isArray(selectedModel.videoUrls)) list = [...list, ...selectedModel.videoUrls];
    if (Array.isArray(selectedModel.instagramVideos)) list = [...list, ...selectedModel.instagramVideos];
    if (Array.isArray(selectedModel.dimensions?.videoUrls)) list = [...list, ...selectedModel.dimensions.videoUrls];
    if (Array.isArray(selectedModel.dimensions?.instagramVideos)) list = [...list, ...selectedModel.dimensions.instagramVideos];
    return Array.from(new Set(list.filter(Boolean)));
  }, [selectedModel]);

  // Modo de visualização: "photos" (carrossel automático de 10s e manual) ou "video" (Instagram Reels)
  const [mode, setMode] = useState<"photos" | "video">("photos");
  const [activeVideoIndex, setActiveVideoIndex] = useState<number>(0);

  const currentVideoUrl = modelVideos[activeVideoIndex] || modelVideos[0] || "";

  return (
    <div className="space-y-3 w-full">
      {/* Barra Superior de Navegação (Carrossel de Fotos vs Vídeo do Instagram) */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[#f5f5f7] dark:bg-slate-900 border border-black/10 dark:border-slate-800 transition-colors">
          <button
            onClick={() => setMode("photos")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              mode === "photos"
                ? "bg-white dark:bg-slate-800 text-[#1d1d1f] dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white"
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5 text-[#0071e3]" />
            <span>Fotos ({modelImages.length})</span>
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

        {mode === "video" ? (
          <Badge
            variant="accent"
            className="text-[10px] bg-gradient-to-r from-amber-500/20 to-rose-500/20 text-rose-500 border border-rose-500/30"
          >
            Reels Oficial
          </Badge>
        ) : (
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Troca a cada 10s
            </span>
          </div>
        )}
      </div>

      {/* Janela de Visualização (Carrossel vs Vídeo) */}
      <div className="relative h-[230px] sm:h-[260px] lg:h-[290px] w-full rounded-2xl sm:rounded-3xl bg-gradient-to-b from-[#f8f9fa] to-[#eceef1] dark:from-slate-950/80 dark:to-slate-900/80 border border-black/10 dark:border-slate-800 overflow-hidden shadow-md dark:shadow-xl flex flex-col items-center justify-center transition-colors">
        {mode === "photos" ? (
          /* MODO CARROSSEL: Rotação a cada 10s e Controle Manual (Setas, Dots, Swipe) */
          <div className="relative w-full h-full pb-10">
            <ModelImageCarousel
              images={modelImages}
              alt={selectedModel.name}
              intervalMs={10000}
              className="w-full h-full"
              imageClassName="p-3 drop-shadow-[0_10px_20px_rgba(0,0,0,0.15)] dark:drop-shadow-[0_15px_30px_rgba(79,70,229,0.25)]"
              showArrows={true}
              showDots={true}
              showCounter={true}
              objectFit="contain"
            />
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
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
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
        ) : null}

        {/* Indicador Inferior Permanente de Cor Selecionada */}
        <div className="absolute bottom-2.5 left-3 right-3 p-2 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-black/10 dark:border-slate-800 flex items-center justify-between text-xs backdrop-blur-md shadow-sm z-10 pointer-events-none">
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
    </div>
  );
};
