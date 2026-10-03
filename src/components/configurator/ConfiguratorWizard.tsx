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
import { Card, Badge, Button, Modal } from "@/components/ui";
import { ShoppingCart, CheckCircle2, ArrowRight, RotateCcw } from "lucide-react";
import { trackEvent, ANALYTICS_EVENTS } from "@/lib/analytics/tracker";

interface ConfiguratorWizardProps {
  initialModelId?: string;
  onOpenCart?: () => void;
  onBackToHome?: () => void;
}

export const ConfiguratorWizard: React.FC<ConfiguratorWizardProps> = ({
  initialModelId,
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
    return CABINET_MODELS[0];
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
  const [step, setStep] = useState<number>(1);
  const totalSteps = 6;

  // Modais de apoio
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [isCartSuccessModalOpen, setIsCartSuccessModalOpen] = useState(false);

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
    setSelectedModel(CABINET_MODELS[0]);
    setSelectedColor(COLOR_OPTIONS[0]);
    setSelectedMonitor(HOMOLOGATED_MONITORS[0]);
    setSelectedPrinter(HOMOLOGATED_PRINTERS[0]);
    setUseReader(true);
    setSelectedReader(HOMOLOGATED_READERS[0]);
    setStep(1);
    setIsCartSuccessModalOpen(false);
  };

  return (
    <div className="min-h-screen pb-28 pt-6 sm:pt-10">
      <div className="max-w-6xl mx-auto px-4">
        {/* Barra Superior de Navegação / Progresso */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                Configurador Pro
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-xs text-slate-400">Totem de Autoatendimento</span>
              {editingItem && (
                <Badge variant="warning" className="text-[10px] ml-2">
                  Editando Totem do Carrinho
                </Badge>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white mt-1">
              Personalização Técnica do Gabinete
            </h1>
          </div>

          {/* Stepper Visual */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {[1, 2, 3, 4, 5, 6].map((s) => (
              <div
                key={s}
                onClick={() => setStep(s)}
                className={`h-2 rounded-full cursor-pointer transition-all ${
                  s === step
                    ? "w-8 bg-indigo-500 shadow-md shadow-indigo-500/30"
                    : s < step
                    ? "w-4 bg-indigo-900 hover:bg-indigo-700"
                    : "w-4 bg-slate-800 hover:bg-slate-700"
                }`}
                title={`Ir para etapa ${s}`}
              />
            ))}
          </div>
        </div>

        {/* Layout Desktop em Duas Colunas (Coluna Esquerda: Render 3D Ready | Coluna Direita: Passos) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Coluna Esquerda: Preview Visual Permanente do Totem */}
          <div className="hidden lg:block lg:col-span-4 sticky top-6">
            <Card className="p-6 border-slate-800 bg-slate-900/60 backdrop-blur-xl">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Visualização do Totem
                </span>
                <Badge variant="accent" className="text-[10px]">
                  3D Ready
                </Badge>
              </div>

              {/* Render do Totem com Swatch de Cor */}
              <div className="relative aspect-[3/4] w-full rounded-2xl bg-slate-950/80 border border-slate-800 p-6 flex flex-col items-center justify-center overflow-hidden">
                <img
                  src={selectedModel.mainImage}
                  alt={selectedModel.name}
                  className="h-full w-auto object-contain drop-shadow-[0_15px_30px_rgba(79,70,229,0.25)] transition-all duration-300"
                />

                {/* Indicador de Cor Selecionada */}
                <div className="absolute bottom-3 left-3 right-3 p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-slate-600"
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

              {/* Resumo Dinâmico Lateral */}
              <div className="mt-5 space-y-2.5 text-xs border-t border-slate-800/80 pt-4 text-slate-400">
                <div className="flex justify-between">
                  <span>Modelo:</span>
                  <span className="font-semibold text-white">{selectedModel.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Monitor:</span>
                  <span className="font-semibold text-white truncate max-w-[150px]">
                    {selectedMonitor?.displayName || "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Impressora:</span>
                  <span className="font-semibold text-white truncate max-w-[150px]">
                    {selectedPrinter?.displayName || "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Leitor:</span>
                  <span className="font-semibold text-white">
                    {useReader ? selectedReader?.displayName || "Sim" : "Sem leitor"}
                  </span>
                </div>

                <div className="pt-3 border-t border-slate-800 flex justify-between items-center text-sm">
                  <span className="font-bold text-slate-200">Total:</span>
                  <span className="text-xl font-extrabold text-indigo-400">
                    {formatBRL(pricing.totalPriceCents)}
                  </span>
                </div>
              </div>
            </Card>
          </div>

          {/* Coluna Direita: Área do Passo Ativo */}
          <div className="lg:col-span-8 space-y-6">
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
        <div className="py-2 space-y-3 text-xs sm:text-sm text-slate-300">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <p className="font-bold text-white">{selectedModel.name} ({selectedColor.name})</p>
            <p className="text-slate-400">
              Monitor: {selectedMonitor?.displayName} • Impressora: {selectedPrinter?.displayName}
            </p>
            <p className="text-indigo-400 font-extrabold text-base pt-1">
              {formatBRL(pricing.totalPriceCents)}
            </p>
          </div>
          <p className="text-slate-400">
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
    </div>
  );
};
