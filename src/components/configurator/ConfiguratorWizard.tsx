"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  CABINET_MODELS,
  COLOR_OPTIONS,
  HOMOLOGATED_MONITORS,
  HOMOLOGATED_PRINTERS,
  HOMOLOGATED_READERS,
} from "@/modules/catalog/catalogData";
import { calculateTotemPrice, formatBRL } from "@/modules/pricing/pricingEngine";
import { CabinetModel, ColorOption, MonitorOption, PrinterOption, BarcodeReaderOption } from "@/types/catalog";
import { TotemConfiguration } from "@/types/order";
import { useCart } from "@/modules/cart/CartContext";
import { StepModel } from "./StepModel";
import { StepColor } from "./StepColor";
import { StepMonitor } from "./StepMonitor";
import { StepPrinter } from "./StepPrinter";
import { StepReader } from "./StepReader";
import { StepReview } from "./StepReview";
import { StickyBottomBar } from "./StickyBottomBar";
import { ConfiguratorModalCustomization } from "./ConfiguratorModalCustomization";
import { TotemViewer3DWrapper } from "./TotemViewer3DWrapper";
import { Card, Badge, Button, Modal } from "@/components/ui";
import {
  ShoppingCart,
  CheckCircle2,
  ArrowRight,
  RotateCcw,
  Box,
  Image as ImageIcon,
  Palette,
  Tv,
  Printer,
  QrCode,
  Check,
} from "lucide-react";
import { trackEvent, ANALYTICS_EVENTS } from "@/lib/analytics/tracker";

interface ConfiguratorWizardProps {
  initialModelId?: string;
  initialStep?: number;
  onOpenCart?: () => void;
  onBackToHome?: () => void;
}

export const ConfiguratorWizard: React.FC<ConfiguratorWizardProps> = ({
  initialModelId,
  initialStep,
  onOpenCart,
  onBackToHome,
}) => {
  const { addItem, updateItem, editingItem, setEditingItem } = useCart();

  // Catálogo dinâmico sincronizado com o Appwrite (com fallback imediato para dados estáticos)
  const [catalog, setCatalog] = useState({
    models: CABINET_MODELS,
    colors: COLOR_OPTIONS,
    monitors: HOMOLOGATED_MONITORS,
    printers: HOMOLOGATED_PRINTERS,
    readers: HOMOLOGATED_READERS,
  });

  useEffect(() => {
    fetch("/api/catalog")
      .then((res) => res.json())
      .then((res) => {
        if (res?.ok && res.data) {
          setCatalog({
            models: res.data.cabinetModels?.length ? res.data.cabinetModels : CABINET_MODELS,
            colors: res.data.colors?.length ? res.data.colors : COLOR_OPTIONS,
            monitors: res.data.monitors?.length ? res.data.monitors : HOMOLOGATED_MONITORS,
            printers: res.data.printers?.length ? res.data.printers : HOMOLOGATED_PRINTERS,
            readers: res.data.barcodeReaders?.length ? res.data.barcodeReaders : HOMOLOGATED_READERS,
          });
        }
      })
      .catch((err) => console.warn("Catálogo offline:", err));
  }, []);

  // 1. Estado da Configuração (se estiver em edição, carrega a configuração existente)
  const [selectedModel, setSelectedModel] = useState<CabinetModel>(() => {
    if (editingItem) return editingItem.configuration.model;
    if (initialModelId) {
      const found = CABINET_MODELS.find((m) => m.id === initialModelId);
      if (found) return found;
    }
    return CABINET_MODELS.find((m) => m.id === "cabinet-wall") || CABINET_MODELS[0];
  });

  const [selectedColor, setSelectedColor] = useState<ColorOption>(() => {
    if (editingItem) return editingItem.configuration.color;
    return COLOR_OPTIONS[0];
  });

  const [selectedMonitor, setSelectedMonitor] = useState<MonitorOption | null>(() => {
    if (editingItem) return editingItem.configuration.monitor || null;
    return HOMOLOGATED_MONITORS[0];
  });

  const [selectedPrinter, setSelectedPrinter] = useState<PrinterOption | null>(() => {
    if (editingItem) return editingItem.configuration.printer || null;
    return HOMOLOGATED_PRINTERS[0];
  });

  const [useReader, setUseReader] = useState<boolean>(() => {
    if (editingItem) return !!editingItem.configuration.barcodeReader;
    return true;
  });

  const [selectedReader, setSelectedReader] = useState<BarcodeReaderOption | null>(() => {
    if (editingItem) return editingItem.configuration.barcodeReader || null;
    return HOMOLOGATED_READERS[0];
  });

  // Passo atual
  const [step, setStep] = useState<number>(() => {
    if (initialStep && initialStep >= 1 && initialStep <= 6) return initialStep;
    return 1;
  });
  const totalSteps = 6;

  // Sincronizar parâmetros de rota na URL sem reload
  useEffect(() => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (url.pathname.includes("monte-seu-totem") || url.pathname.includes("configurador")) {
        url.searchParams.set("modelo", selectedModel.id);
        url.searchParams.set("etapa", step.toString());
        window.history.replaceState({}, "", url.toString());
      }
    }
  }, [step, selectedModel.id]);

  // Modais de apoio
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [isCartSuccessModalOpen, setIsCartSuccessModalOpen] = useState(false);
  const [isMobileViewerOpen, setIsMobileViewerOpen] = useState(false);

  // 2. Motor de Cálculo de Preço Reativo e Autoritativo
  const pricing = useMemo(() => {
    return calculateTotemPrice({
      cabinet: selectedModel,
      color: selectedColor,
      monitor: selectedMonitor,
      printer: selectedPrinter,
      barcodeReader: useReader ? selectedReader : null,
      customization: null,
    });
  }, [selectedModel, selectedColor, selectedMonitor, selectedPrinter, useReader, selectedReader]);

  const handleNext = () => {
    if (step < totalSteps) {
      setStep((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      handleAddToCart();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (onBackToHome) {
      onBackToHome();
    }
  };

  const handleSelectModel = (model: CabinetModel) => {
    setSelectedModel(model);
    trackEvent(ANALYTICS_EVENTS.SELECT_CABINET_MODEL, {
      modelId: model.id,
      modelName: model.name,
      basePriceCents: model.basePriceCents,
    });
  };

  const handleSelectColor = (color: ColorOption) => {
    setSelectedColor(color);
    trackEvent(ANALYTICS_EVENTS.SELECT_COLOR, {
      colorId: color.id,
      colorName: color.name,
      priceAdjustmentCents: color.priceAdjustmentCents,
    });
  };

  const handleSelectMonitor = (monitor: MonitorOption | null) => {
    setSelectedMonitor(monitor);
    trackEvent(ANALYTICS_EVENTS.SELECT_MONITOR, {
      monitorId: monitor?.id || null,
      monitorName: monitor?.displayName || "Nenhum",
    });
  };

  const handleSelectPrinter = (printer: PrinterOption | null) => {
    setSelectedPrinter(printer);
    trackEvent(ANALYTICS_EVENTS.SELECT_PRINTER, {
      printerId: printer?.id || null,
      printerName: printer?.displayName || "Nenhum",
    });
  };

  const handleSelectReader = (reader: BarcodeReaderOption | null) => {
    setSelectedReader(reader);
    trackEvent(ANALYTICS_EVENTS.SELECT_BARCODE_READER, {
      readerId: reader?.id || null,
      readerName: reader?.displayName || "Nenhum",
      enabled: true,
    });
  };

  const handleToggleReader = (use: boolean) => {
    setUseReader(use);
    trackEvent(ANALYTICS_EVENTS.SELECT_BARCODE_READER, {
      enabled: use,
      readerId: use ? selectedReader?.id || null : null,
    });
  };

  const handleAddToCart = () => {
    const configuration: TotemConfiguration = {
      model: selectedModel,
      color: selectedColor,
      monitor: selectedMonitor,
      printer: selectedPrinter,
      barcodeReader: useReader ? selectedReader : null,
      calculatedPriceCents: pricing.totalPriceCents,
    };

    if (editingItem) {
      // Atualiza o item existente sem criar duplicata
      updateItem(editingItem.id, configuration, editingItem.quantity);
    } else {
      // Adiciona novo item ao carrinho
      addItem(configuration, 1);
    }

    trackEvent(ANALYTICS_EVENTS.ADD_TO_CART, {
      modelId: selectedModel.id,
      modelName: selectedModel.name,
      totalPriceCents: pricing.totalPriceCents,
      isEditing: !!editingItem,
    });

    setIsCartSuccessModalOpen(true);
  };

  const handleResetForNewTotem = () => {
    setEditingItem(null);
    setSelectedModel(CABINET_MODELS.find((m) => m.id === "cabinet-wall") || CABINET_MODELS[0]);
    setSelectedColor(COLOR_OPTIONS[0]);
    setSelectedMonitor(HOMOLOGATED_MONITORS[0]);
    setSelectedPrinter(HOMOLOGATED_PRINTERS[0]);
    setUseReader(true);
    setSelectedReader(HOMOLOGATED_READERS[0]);
    setStep(1);
    setIsCartSuccessModalOpen(false);
  };

  // Passos lógicos estruturados como Cardápio Digital Interativo
  const CONFIG_STEPS = [
    { id: 1, label: "Formato", subtitle: "Gabinete", icon: Box },
    { id: 2, label: "Acabamento", subtitle: "MDF BP", icon: Palette },
    { id: 3, label: "Monitor", subtitle: "Touch", icon: Tv },
    { id: 4, label: "Impressora", subtitle: "Térmica", icon: Printer },
    { id: 5, label: "Leitor", subtitle: "Código 2D", icon: QrCode },
    { id: 6, label: "Revisão", subtitle: "Ficha CNC", icon: CheckCircle2 },
  ];

  return (
    <div className="flex-1 flex flex-col justify-between overflow-hidden h-full pb-16 sm:pb-20">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 w-full flex-1 flex flex-col min-h-0 pt-2 sm:pt-3">
        {/* Topo: Identificação Enxuta + Cardápio Digital dos 6 Passos */}
        <div className="space-y-2 mb-2 sm:mb-3 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black text-[#0071e3] uppercase tracking-wider">
                Configurador Pro
              </span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="text-xs text-slate-500 font-medium">Totem Industrial de Autoatendimento</span>
              {editingItem && (
                <Badge variant="warning" className="text-[10px]">
                  Editando Item
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setIsMobileViewerOpen(true);
                  trackEvent(ANALYTICS_EVENTS.VIEW_3D_MODEL, {
                    modelId: selectedModel.id,
                    modelName: selectedModel.name,
                    source: "mobile_top_header",
                  });
                }}
                className="lg:hidden px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-indigo-950/40 hover:bg-blue-100 border border-blue-200 dark:border-indigo-800 text-[#0071e3] dark:text-cyan-300 text-[11px] font-bold flex items-center gap-1 active:scale-95 transition-all shadow-sm cursor-pointer"
                title="Ver Fotos e Vídeos do Totem"
              >
                <ImageIcon className="w-3 h-3 text-[#0071e3] dark:text-cyan-300" />
                <span>Ver Fotos</span>
              </button>

              <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                <span>Etapa <strong>0{step}</strong> de <strong>06</strong></span>
              </div>
            </div>
          </div>

          {/* Barra de Categorias / Passos (Estilo Cardápio Digital - Visão Global de 6 Passos) */}
          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar p-1 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-black/10 dark:border-slate-800 backdrop-blur-md shadow-sm">
            {CONFIG_STEPS.map((s) => {
              const Icon = s.icon;
              const isActive = s.id === step;
              const isCompleted = s.id < step;

              return (
                <button
                  key={s.id}
                  onClick={() => setStep(s.id)}
                  className={`flex items-center gap-2 py-1.5 px-2.5 sm:px-3 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    isActive
                      ? "bg-[#0071e3] text-white shadow-md shadow-blue-500/25 ring-2 ring-[#0071e3]/30"
                      : isCompleted
                      ? "bg-blue-50 dark:bg-indigo-950/40 text-[#0071e3] dark:text-indigo-300 hover:bg-blue-100"
                      : "text-slate-700 dark:text-slate-300 hover:bg-black/5 hover:text-black dark:hover:text-white"
                  }`}
                  title={`Passo ${s.id}: ${s.label}`}
                >
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black shrink-0 ${
                      isActive
                        ? "bg-white/20 text-white"
                        : isCompleted
                        ? "bg-[#0071e3] text-white"
                        : "bg-black/5 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-black/10 dark:border-slate-700"
                    }`}
                  >
                    {isCompleted ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : s.id}
                  </div>
                  <Icon className="w-3.5 h-3.5 shrink-0 opacity-90" />
                  <span className="truncate">{s.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Layout Desktop e Notebook em Duas Colunas (Viewport-Fit: sem rolagem externa) */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-stretch overflow-hidden">
          {/* Coluna Esquerda: Preview Visual Permanente do Totem */}
          <div className="hidden lg:flex lg:col-span-4 flex-col justify-between h-full overflow-hidden">
            <Card className="p-3.5 border-black/10 dark:border-slate-800 bg-white/95 dark:bg-slate-900/70 backdrop-blur-xl shadow-md rounded-2xl flex flex-col justify-between h-full space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Visualização do Totem
                </span>
                <Badge variant="secondary" className="text-[9px]">
                  Fotos Reais
                </Badge>
              </div>

              {/* Visualizador de Fotos e Vídeos com Carrossel Automático de 10s */}
              <div className="flex-1 min-h-0 flex items-center justify-center">
                <TotemViewer3DWrapper
                  selectedModel={selectedModel}
                  selectedColor={selectedColor}
                  hasPrinter={!!selectedPrinter}
                  hasScanner={useReader && !!selectedReader}
                />
              </div>

              {/* Resumo Dinâmico Compacto Lateral */}
              <div className="space-y-1.5 text-xs border-t border-black/10 dark:border-slate-800/80 pt-2 text-slate-500 dark:text-slate-400">
                <div className="flex justify-between items-center">
                  <span>Modelo:</span>
                  <span className="font-bold text-[#1d1d1f] dark:text-white truncate max-w-[140px]">{selectedModel.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Acabamento:</span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full border border-black/20"
                      style={{ background: selectedColor.hexReference }}
                    />
                    <span className="font-semibold text-[#1d1d1f] dark:text-white truncate max-w-[130px]">
                      {selectedColor.name}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span>Monitor:</span>
                  <span className="font-semibold text-[#1d1d1f] dark:text-white truncate max-w-[140px]">
                    {selectedMonitor?.displayName || "—"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Impressora:</span>
                  <span className="font-semibold text-[#1d1d1f] dark:text-white truncate max-w-[140px]">
                    {selectedPrinter?.displayName || "—"}
                  </span>
                </div>

                <div className="pt-2 border-t border-black/10 dark:border-slate-800 flex justify-between items-center">
                  <span className="font-bold text-slate-700 dark:text-slate-300">Total Atual:</span>
                  <span className="text-lg font-black text-[#0071e3] dark:text-cyan-400">
                    {formatBRL(pricing.totalPriceCents)}
                  </span>
                </div>
              </div>
            </Card>
          </div>

          {/* Coluna Direita: Área do Passo Ativo (Viewport-Fit com Scroll Interno Limpo) */}
          <div className="lg:col-span-8 flex flex-col justify-between h-full overflow-y-auto pr-1">
            {step === 1 && (
              <StepModel
                models={catalog.models}
                selectedModel={selectedModel}
                onSelectModel={handleSelectModel}
              />
            )}

            {step === 2 && (
              <StepColor
                colors={catalog.colors}
                selectedColor={selectedColor}
                onSelectColor={handleSelectColor}
              />
            )}

            {step === 3 && (
              <StepMonitor
                monitors={catalog.monitors}
                selectedMonitor={selectedMonitor}
                onSelectMonitor={handleSelectMonitor}
                onRequestCustomization={() => setIsCustomModalOpen(true)}
              />
            )}

            {step === 4 && (
              <StepPrinter
                printers={catalog.printers}
                selectedPrinter={selectedPrinter}
                onSelectPrinter={handleSelectPrinter}
                onRequestCustomization={() => setIsCustomModalOpen(true)}
              />
            )}

            {step === 5 && (
              <StepReader
                readers={catalog.readers}
                useReader={useReader}
                selectedReader={selectedReader}
                onToggleUseReader={handleToggleReader}
                onSelectReader={handleSelectReader}
                onRequestCustomization={() => setIsCustomModalOpen(true)}
              />
            )}

            {step === 6 && (
              <StepReview
                model={selectedModel}
                color={selectedColor}
                monitor={selectedMonitor}
                printer={selectedPrinter}
                reader={selectedReader}
                useReader={useReader}
                pricing={pricing}
                onEditStep={(stepNum) => setStep(stepNum)}
                onAddToCart={handleAddToCart}
              />
            )}
          </div>
        </div>
      </div>

      {/* Barra Fixa Inferior Mobile */}
      <StickyBottomBar
        currentStep={step}
        totalSteps={totalSteps}
        totalPriceCents={pricing.totalPriceCents}
        onNext={handleNext}
        onBack={handleBack}
        isLastStep={step === totalSteps}
      />

      {/* Modal de Personalização Especial */}
      <ConfiguratorModalCustomization
        isOpen={isCustomModalOpen}
        onClose={() => setIsCustomModalOpen(false)}
      />

      {/* Modal de Confirmação de Carrinho */}
      <Modal
        isOpen={isCartSuccessModalOpen}
        onClose={() => setIsCartSuccessModalOpen(false)}
        title={editingItem ? "Totem Atualizado com Sucesso!" : "Totem Adicionado ao Carrinho!"}
        description="A configuração foi salva com sucesso e está pronta para compra ou duplicação."
      >
        <div className="py-2 space-y-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
          <div className="p-3.5 rounded-2xl bg-[#f8f9fa] dark:bg-slate-950 border border-black/10 dark:border-slate-800 space-y-1">
            <p className="font-bold text-[#1d1d1f] dark:text-white">{selectedModel.name} ({selectedColor.name})</p>
            <p className="text-slate-500 dark:text-slate-400">
              Monitor: {selectedMonitor?.displayName} • Impressora: {selectedPrinter?.displayName}
            </p>
            <p className="text-[#0071e3] dark:text-cyan-400 font-black text-base pt-1">
              {formatBRL(pricing.totalPriceCents)}
            </p>
          </div>
          <p className="text-slate-600 dark:text-slate-400">
            Você pode montar outro totem com configuração diferente ou ir para o carrinho para duplicar em lote e finalizar via Pix.
          </p>
        </div>
        <div className="mt-5 flex flex-col sm:flex-row justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetForNewTotem}
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            Configurar Outro Totem
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setIsCartSuccessModalOpen(false);
              if (onOpenCart) onOpenCart();
            }}
          >
            <ShoppingCart className="w-3.5 h-3.5 mr-1.5" />
            Ir para o Carrinho
          </Button>
        </div>
      </Modal>

      {/* Modal de Visualização de Fotos e Vídeos Mobile */}
      <Modal
        isOpen={isMobileViewerOpen}
        onClose={() => setIsMobileViewerOpen(false)}
        title={`Galeria Oficial — ${selectedModel.name}`}
        description="Carrossel automático a cada 10 segundos com controle manual e fotos industriais em alta resolução."
        className="max-w-2xl sm:max-w-2xl p-4 sm:p-6"
      >
        <div className="py-1">
          <TotemViewer3DWrapper
            selectedModel={selectedModel}
            selectedColor={selectedColor}
            hasPrinter={!!selectedPrinter}
            hasScanner={useReader && !!selectedReader}
          />
        </div>
      </Modal>
    </div>
  );
};
