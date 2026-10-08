"use client";

import React, { useState, useMemo, useEffect } from "react";
import { CabinetModel, ColorOption, MonitorOption, PrinterOption, BarcodeReaderOption } from "@/types/catalog";
import { Badge } from "@/components/ui";
import { Image as ImageIcon, Tv, Printer, QrCode, Ban, Sparkles, Boxes } from "lucide-react";
import { InstagramVideoPlayer, InstagramGlyph, ModelImageCarousel } from "@/components/media";
import { trackEvent, ANALYTICS_EVENTS } from "@/lib/analytics/tracker";
import { isItemKit } from "@/modules/catalog/kitDefaults";

interface TotemViewer3DWrapperProps {
  selectedModel: CabinetModel;
  selectedColor: ColorOption;
  selectedMonitor?: MonitorOption | null;
  selectedPrinter?: PrinterOption | null;
  selectedReader?: BarcodeReaderOption | null;
  useReader?: boolean;
  currentStep?: number;
  hasPrinter?: boolean;
  hasScanner?: boolean;
}

export const TotemViewer3DWrapper: React.FC<TotemViewer3DWrapperProps> = ({
  selectedModel,
  selectedColor,
  selectedMonitor,
  selectedPrinter,
  selectedReader,
  useReader = true,
  currentStep = 1,
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

  // Detecção de equipamento selecionado nas etapas 3, 4 e 5
  const isEquipmentStep = currentStep === 3 || currentStep === 4 || currentStep === 5;

  const currentEquipment = useMemo(() => {
    if (currentStep === 3) {
      if (!selectedMonitor) {
        return {
          type: "monitor" as const,
          title: "Monitor a Definir",
          tabLabel: "Monitor",
          icon: Tv,
          name: "Aguardando Seleção",
          brand: "Obrigatório",
          badge: "Selecione o Display",
          image: undefined,
          notes: "Escolha um monitor homologado, o Kit de Montagem ou personalize sob medida.",
          isCustom: false,
        };
      }
      const isKit = isItemKit(selectedMonitor);
      if (isKit) {
        return {
          type: "monitor" as const,
          title: "Pacote de Montagem",
          tabLabel: "Foto do Kit",
          icon: Boxes,
          name: selectedMonitor?.displayName || "Kit de Montagem Completo",
          brand: "Combo Hardware",
          badge: "AIO Touch + Impressora + Leitor",
          image: selectedMonitor?.image,
          notes: "Pacote industrial de componentes com encaixe e furação CNC calibrados de fábrica.",
          isCustom: false,
        };
      }
      return {
        type: "monitor" as const,
        title: "Monitor Selecionado",
        tabLabel: "Foto do Monitor",
        icon: Tv,
        name: selectedMonitor?.displayName || "Monitor Padrão",
        brand: selectedMonitor?.brand || "Elgin",
        badge: selectedMonitor?.sizeInches
          ? `${selectedMonitor.sizeInches}" • VESA ${selectedMonitor.vesaPattern || "100x100"}`
          : selectedMonitor?.vesaPattern
          ? `VESA ${selectedMonitor.vesaPattern}`
          : "Furação VESA",
        image: selectedMonitor?.image,
        notes: selectedMonitor?.notes || "Usinagem CNC milimétrica para encaixe e furação VESA.",
        isCustom: !!selectedMonitor?.isCustom,
      };
    }
    if (currentStep === 4) {
      return {
        type: "printer" as const,
        title: "Impressora Selecionada",
        tabLabel: "Foto da Impressora",
        icon: Printer,
        name: selectedPrinter?.displayName || "Impressora Térmica",
        brand: selectedPrinter?.brand || "EPSON",
        badge: selectedPrinter?.paperWidthMm ? `Bobina ${selectedPrinter.paperWidthMm}mm` : "Térmica 80mm",
        image: selectedPrinter?.image,
        notes: selectedPrinter?.notes || "Berço interno com rasgo de saída de papel usinado sob medida.",
        isCustom: false,
      };
    }
    if (currentStep === 5) {
      if (!useReader) {
        return {
          type: "reader" as const,
          title: "Leitor Óptico",
          tabLabel: "Gabinete Liso",
          icon: Ban,
          name: "Sem Leitor Óptico",
          brand: "Chassi Liso",
          badge: "Frente Fechada",
          image: undefined,
          notes: "Gabinete usinado liso sem rasgo ou janela para scanner frontal.",
          isCustom: false,
        };
      }
      return {
        type: "reader" as const,
        title: "Leitor Selecionado",
        tabLabel: "Foto do Leitor",
        icon: QrCode,
        name: selectedReader?.displayName || "Leitor de Código de Barras",
        brand: selectedReader?.brand || "Bematech",
        badge: selectedReader?.is2D ? "1D / 2D / QR Code" : "Leitor Óptico",
        image: selectedReader?.image,
        notes: selectedReader?.notes || "Janela frontal angular homologada para leitura ágil de tickets e smartphones.",
        isCustom: false,
      };
    }
    return null;
  }, [currentStep, selectedMonitor, selectedPrinter, selectedReader, useReader]);

  // Modo de visualização: "equipment", "photos" ou "video"
  const [mode, setMode] = useState<"equipment" | "photos" | "video">(() =>
    isEquipmentStep ? "equipment" : "photos"
  );
  const [activeVideoIndex, setActiveVideoIndex] = useState<number>(0);

  // Sincroniza a aba ativa quando a etapa muda
  useEffect(() => {
    if (isEquipmentStep) {
      setMode("equipment");
    } else {
      setMode("photos");
    }
  }, [currentStep, isEquipmentStep]);

  const currentVideoUrl = modelVideos[activeVideoIndex] || modelVideos[0] || "";

  return (
    <div className="space-y-2.5 w-full">
      {/* Barra Superior de Navegação Dinâmica */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[#f5f5f7] dark:bg-slate-900 border border-black/10 dark:border-slate-800 transition-colors">
          {/* Aba do Equipamento Selecionado nas etapas 3, 4 e 5 */}
          {isEquipmentStep && currentEquipment && (
            <button
              onClick={() => setMode("equipment")}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                mode === "equipment"
                  ? "bg-white dark:bg-slate-800 text-[#0071e3] dark:text-cyan-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white"
              }`}
            >
              <currentEquipment.icon className="w-3.5 h-3.5 text-[#0071e3] dark:text-cyan-400" />
              <span>{currentEquipment.tabLabel}</span>
            </button>
          )}

          {/* Aba do Totem */}
          <button
            onClick={() => setMode("photos")}
            className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              mode === "photos"
                ? "bg-white dark:bg-slate-800 text-[#1d1d1f] dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white"
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5 text-[#0071e3]" />
            <span>Totem ({modelImages.length})</span>
          </button>

          {/* Aba de Vídeo Instagram */}
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
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                mode === "video"
                  ? "bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 text-white shadow-md shadow-rose-500/25"
                  : "text-slate-600 dark:text-slate-400 hover:text-rose-500 dark:hover:text-rose-400"
              }`}
            >
              <InstagramGlyph className="w-3.5 h-3.5" />
              <span>Vídeo</span>
            </button>
          )}
        </div>

        {mode === "equipment" && currentEquipment ? (
          <Badge
            variant="accent"
            className="text-[10px] bg-blue-50 dark:bg-indigo-950/60 text-[#0071e3] dark:text-cyan-400 border border-blue-200/60 dark:border-indigo-800/60 font-semibold"
          >
            {currentEquipment.badge}
          </Badge>
        ) : mode === "video" ? (
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

      {/* Janela de Visualização (Equipamento vs Totem vs Vídeo) */}
      <div className="relative h-[200px] sm:h-[220px] lg:h-[235px] xl:h-[255px] w-full rounded-2xl sm:rounded-3xl bg-gradient-to-b from-[#f8f9fa] to-[#eceef1] dark:from-slate-950/80 dark:to-slate-900/80 border border-black/10 dark:border-slate-800 overflow-hidden shadow-md dark:shadow-xl flex flex-col items-center justify-center transition-colors">
        {mode === "equipment" && currentEquipment ? (
          /* MODO EQUIPAMENTO SELECIONADO (MONITOR / IMPRESSORA / LEITOR) */
          <div className="relative w-full h-full p-3 sm:p-4 flex flex-col items-center justify-between animate-in fade-in duration-300">
            {currentEquipment.image ? (
              <div className="relative w-full flex-1 min-h-0 flex items-center justify-center group">
                <img
                  src={currentEquipment.image}
                  alt={currentEquipment.name}
                  className="max-h-full max-w-full object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.18)] dark:drop-shadow-[0_15px_30px_rgba(0,113,227,0.3)] transition-transform duration-300 group-hover:scale-105"
                />
              </div>
            ) : (
              <div className="relative w-full flex-1 min-h-0 flex flex-col items-center justify-center text-center p-3">
                <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-900 border border-black/10 dark:border-slate-800 flex items-center justify-center text-[#0071e3] dark:text-cyan-400 shadow-sm mb-2">
                  <currentEquipment.icon className="w-7 h-7" />
                </div>
                <h4 className="text-xs font-bold text-[#1d1d1f] dark:text-white">
                  {currentEquipment.name}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-[220px] mt-0.5 line-clamp-2">
                  {currentEquipment.notes}
                </p>
              </div>
            )}

            {/* Rodapé Informativo Elegante do Equipamento */}
            <div className="w-full mt-2 px-2.5 py-1.5 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-black/10 dark:border-slate-800 backdrop-blur-md flex items-center justify-between text-xs shadow-sm shrink-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="font-bold text-[#1d1d1f] dark:text-white truncate">
                  {currentEquipment.name}
                </span>
              </div>
              <span className="text-[10px] font-bold text-[#0071e3] dark:text-cyan-400 bg-blue-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-lg border border-blue-200/50 dark:border-indigo-800/50 shrink-0 ml-1">
                {currentEquipment.badge}
              </span>
            </div>
          </div>
        ) : mode === "photos" ? (
          /* MODO CARROSSEL DE FOTOS DO TOTEM */
          <div className="relative w-full h-full">
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
      </div>
    </div>
  );
};
