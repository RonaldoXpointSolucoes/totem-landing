"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  CABINET_MODELS,
  COLOR_OPTIONS,
  HOMOLOGATED_MONITORS,
  HOMOLOGATED_PRINTERS,
  HOMOLOGATED_READERS,
} from "@/modules/catalog/catalogData";
import {
  CabinetModel,
  ColorOption,
  MonitorOption,
  PrinterOption,
  BarcodeReaderOption,
  KitSubItem,
} from "@/types/catalog";
import {
  DEFAULT_KIT_SUB_ITEMS,
  isItemKit,
  getEffectiveKitItems,
  calculateKitTotalCents,
  resolveKitEquipmentSummary,
  buildOrderDeliveryChecklist,
  DeliveryChecklistItem,
} from "@/modules/catalog/kitDefaults";
import {
  calculateTotemPrice,
  formatBRL,
  ASSEMBLY_SERVICE_PRICE_CENTS,
} from "@/modules/pricing/pricingEngine";
import { StepModel } from "@/components/configurator/StepModel";
import { StepColor } from "@/components/configurator/StepColor";
import { StepMonitor } from "@/components/configurator/StepMonitor";
import { StepPrinter } from "@/components/configurator/StepPrinter";
import { StepReader } from "@/components/configurator/StepReader";
import {
  Box,
  Palette,
  Tv,
  Printer,
  QrCode,
  CheckCircle2,
  Check,
  Boxes,
  Package,
  XCircle,
  RotateCcw,
  Wrench,
  Edit3,
  Plus,
  Trash2,
  Zap,
  CreditCard,
  ArrowRight,
  ArrowLeft,
  Calculator,
  Cable,
  Sparkles,
} from "lucide-react";

export interface VisualEditableOrderItem {
  $id?: string;
  cabinet_name: string;
  color_name: string;
  monitor_name: string;
  printer_name: string;
  reader_name: string;
  unit_price_cents: number;
  quantity: number;
  subtotal_cents: number;
  technical_notes: string;
  screen_cutout: string;
  execution_media: any[];
  is_kit?: boolean;
  kit_items?: KitSubItem[];
  include_assembly?: boolean;
  delivery_checklist?: DeliveryChecklistItem[];
}

interface AdminOrderVisualEditorProps {
  items: VisualEditableOrderItem[];
  paymentMethod: "pix" | "credit_card";
  onChangePaymentMethod: (method: "pix" | "credit_card") => void;
  onUpdateItems: (nextItems: VisualEditableOrderItem[]) => void;
  onAddNewItem: () => void;
  onRemoveItem: (index: number) => void;
}

const getModelThumbnail = (model: CabinetModel): string => {
  const images = [
    model.mainImage,
    ...(model.images || []),
    ...(model.dimensions?.images || []),
  ].filter(Boolean);
  const realPhoto = images.find(
    (img) =>
      typeof img === "string" &&
      !img.toLowerCase().endsWith(".svg") &&
      !img.includes("data:image/svg")
  );
  return realPhoto || model.mainImage || ".webp";
};

function findMatchingModel(name: string, models: CabinetModel[]): CabinetModel {
  const low = (name || "").toLowerCase();
  const exact = models.find((m) => m.name.toLowerCase() === low);
  if (exact) return exact;
  if (low.includes("parede")) {
    return models.find((m) => m.id.includes("wall") || m.name.toLowerCase().includes("parede")) || models[0];
  }
  if (low.includes("balc") || low.includes("mesa")) {
    return (
      models.find((m) => m.id.includes("counter") || m.name.toLowerCase().includes("balc")) ||
      models[0]
    );
  }
  if (low.includes("piso")) {
    return models.find((m) => m.id.includes("floor") || m.name.toLowerCase().includes("piso")) || models[0];
  }
  return models[0];
}

function findMatchingColor(name: string, colors: ColorOption[]): ColorOption {
  const low = (name || "").toLowerCase();
  const exact = colors.find((c) => c.name.toLowerCase() === low);
  if (exact) return exact;
  if (low.includes("black") || low.includes("bicolor") || low.includes("white")) {
    const dual = colors.find(
      (c) =>
        c.slug?.includes("dual") ||
        c.slug?.includes("black-white") ||
        c.name.toLowerCase().includes("black & white")
    );
    if (dual && (low.includes("black & white") || low.includes("bicolor"))) return dual;
  }
  if (low.includes("preto")) {
    return colors.find((c) => c.name.toLowerCase().includes("preto")) || colors[0];
  }
  return colors.find((c) => c.name.toLowerCase().includes("branco")) || colors[0];
}

export const AdminOrderVisualEditor: React.FC<AdminOrderVisualEditorProps> = ({
  items,
  paymentMethod,
  onChangePaymentMethod,
  onUpdateItems,
  onAddNewItem,
  onRemoveItem,
}) => {
  const [catalog, setCatalog] = useState({
    models: CABINET_MODELS,
    colors: COLOR_OPTIONS,
    monitors: HOMOLOGATED_MONITORS,
    printers: HOMOLOGATED_PRINTERS,
    readers: HOMOLOGATED_READERS,
  });

  // Carrega o catálogo atualizado do Appwrite
  useEffect(() => {
    fetch("/api/catalog")
      .then((r) => r.json())
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
      .catch(() => {});
  }, []);

  const [activeItemIdx, setActiveItemIdx] = useState(0);
  // Começa na Etapa 6 (Revisão Completa & Kit) para o admin já enxergar tudo que o cliente pediu
  // e poder clicar em qualquer etapa (1 a 6) ou editar o Kit ali mesmo!
  const [step, setStep] = useState<number>(6);
  const [newSubItemName, setNewSubItemName] = useState("");
  const [newSubItemPriceBRL, setNewSubItemPriceBRL] = useState("");
  const [showAddSubItemForm, setShowAddSubItemForm] = useState(false);

  const currentItem = items[activeItemIdx] || items[0];

  const selectedModel = useMemo(
    () => findMatchingModel(currentItem?.cabinet_name || "", catalog.models),
    [currentItem?.cabinet_name, catalog.models]
  );

  const selectedColor = useMemo(
    () => findMatchingColor(currentItem?.color_name || "", catalog.colors),
    [currentItem?.color_name, catalog.colors]
  );

  const resolvedEquipment = useMemo(() => {
    if (!currentItem) return null;
    return resolveKitEquipmentSummary({
      kitItemsSnapshot: currentItem.kit_items,
      monitorName: currentItem.monitor_name,
      printerName: currentItem.printer_name,
      readerName: currentItem.reader_name,
    });
  }, [currentItem]);

  const isKitSelected = useMemo(() => {
    if (!currentItem) return false;
    if (typeof currentItem.is_kit === "boolean") return currentItem.is_kit;
    return Boolean(resolvedEquipment?.isKit);
  }, [currentItem, resolvedEquipment]);

  const kitItems: KitSubItem[] = useMemo(() => {
    if (Array.isArray(currentItem?.kit_items) && currentItem.kit_items.length > 0) {
      return currentItem.kit_items;
    }
    const baseList = DEFAULT_KIT_SUB_ITEMS.map((sub) => ({ ...sub }));
    if (resolvedEquipment && resolvedEquipment.isKit) {
      return baseList.map((sub) => {
        if (sub.category === "monitor" && !resolvedEquipment.hasMonitorInKit) {
          return { ...sub, selected: false };
        }
        if (sub.category === "printer" && !resolvedEquipment.hasPrinterInKit) {
          return { ...sub, selected: false };
        }
        return sub;
      });
    }
    return baseList;
  }, [currentItem?.kit_items, resolvedEquipment]);

  const selectedMonitorObj: MonitorOption | null = useMemo(() => {
    if (!currentItem) return null;
    if (isKitSelected) {
      const kitCatalogMon =
        catalog.monitors.find((m) => isItemKit(m)) || {
          id: "6ac6dbf90032d4f8586e",
          brand: "KIT COMPLETO",
          model: "Kit de Montagem",
          displayName: "Kit de Montagem",
          sizeInches: 23.8,
          vesaPattern: "75x75 / 100x100",
          technicalCode: "MON-KIT",
          active: true,
          isKit: true,
          priceAdjustmentCents: calculateKitTotalCents(kitItems),
          kitItems,
        };
      return {
        ...kitCatalogMon,
        isKit: true,
        kitItems,
        priceAdjustmentCents: calculateKitTotalCents(kitItems),
      };
    }
    const low = (currentItem.monitor_name || "").toLowerCase();
    return (
      catalog.monitors.find(
        (m) => !isItemKit(m) && (m.displayName.toLowerCase() === low || low.includes(m.model.toLowerCase()))
      ) ||
      catalog.monitors.find((m) => !isItemKit(m)) ||
      null
    );
  }, [currentItem, isKitSelected, catalog.monitors, kitItems]);

  const selectedPrinterObj: PrinterOption | null = useMemo(() => {
    if (!currentItem) return null;
    const low = (currentItem.printer_name || "").toLowerCase();
    return (
      catalog.printers.find(
        (p) => p.displayName.toLowerCase() === low || low.includes(p.model.toLowerCase())
      ) ||
      catalog.printers[0] ||
      null
    );
  }, [currentItem, catalog.printers]);

  const useReader = useMemo(() => {
    if (!currentItem) return false;
    const low = (currentItem.reader_name || "").toLowerCase();
    if (!low || low === "nenhum" || low.includes("sem leitor")) return false;
    return true;
  }, [currentItem]);

  const selectedReaderObj: BarcodeReaderOption | null = useMemo(() => {
    if (!currentItem || !useReader) return null;
    const low = (currentItem.reader_name || "").toLowerCase();
    return (
      catalog.readers.find(
        (r) => r.displayName.toLowerCase() === low || low.includes(r.model.toLowerCase())
      ) ||
      catalog.readers[0] ||
      null
    );
  }, [currentItem, useReader, catalog.readers]);

  const includeAssemblyService = Boolean(currentItem?.include_assembly);

  // Motor oficial de precificação (calcula PIX e Cartão simultaneamente)
  const pricing = useMemo(() => {
    const kitTotal = isKitSelected ? calculateKitTotalCents(kitItems) : undefined;
    return calculateTotemPrice({
      cabinet: selectedModel,
      color: selectedColor,
      monitor: selectedMonitorObj,
      printer: isKitSelected ? null : selectedPrinterObj,
      barcodeReader: isKitSelected ? null : useReader ? selectedReaderObj : null,
      customization: null,
      kitAdjustmentCents: kitTotal,
      includeAssemblyService: isKitSelected && includeAssemblyService,
    });
  }, [
    selectedModel,
    selectedColor,
    selectedMonitorObj,
    selectedPrinterObj,
    useReader,
    selectedReaderObj,
    isKitSelected,
    kitItems,
    includeAssemblyService,
  ]);

  // Função central que reconstrói o item atualizado (nomes + checklist + valores concatenados)
  const applyItemChanges = (overrides: {
    model?: CabinetModel;
    color?: ColorOption;
    isKit?: boolean;
    kitItems?: KitSubItem[];
    monitor?: MonitorOption | null;
    printer?: PrinterOption | null;
    useReader?: boolean;
    reader?: BarcodeReaderOption | null;
    includeAssembly?: boolean;
    quantity?: number;
    targetPaymentMethod?: "pix" | "credit_card";
    manualUnitPriceCents?: number;
  }) => {
    if (!currentItem) return;

    const nextModel = overrides.model || selectedModel;
    const nextColor = overrides.color || selectedColor;
    const nextIsKit = overrides.isKit !== undefined ? overrides.isKit : isKitSelected;
    const nextKitItems = overrides.kitItems || kitItems;
    const nextIncludeAssembly =
      overrides.includeAssembly !== undefined ? overrides.includeAssembly : includeAssemblyService;
    const nextQty = overrides.quantity !== undefined ? Math.max(1, overrides.quantity) : currentItem.quantity || 1;
    const effectiveMethod = overrides.targetPaymentMethod || paymentMethod;

    const nextMonObj =
      overrides.monitor !== undefined
        ? overrides.monitor
        : nextIsKit
        ? {
            ...(selectedMonitorObj || {
              id: "6ac6dbf90032d4f8586e",
              brand: "KIT COMPLETO",
              model: "Kit de Montagem",
              displayName: "Kit de Montagem",
              active: true,
            }),
            isKit: true,
            kitItems: nextKitItems,
            priceAdjustmentCents: calculateKitTotalCents(nextKitItems),
          }
        : selectedMonitorObj;

    const nextPrtObj = overrides.printer !== undefined ? overrides.printer : selectedPrinterObj;
    const nextUseReader = overrides.useReader !== undefined ? overrides.useReader : useReader;
    const nextRdrObj = overrides.reader !== undefined ? overrides.reader : selectedReaderObj;

    const nextPricing = calculateTotemPrice({
      cabinet: nextModel,
      color: nextColor,
      monitor: nextMonObj,
      printer: nextIsKit ? null : nextPrtObj,
      barcodeReader: nextIsKit ? null : nextUseReader ? nextRdrObj : null,
      customization: null,
      kitAdjustmentCents: nextIsKit ? calculateKitTotalCents(nextKitItems) : undefined,
      includeAssemblyService: nextIsKit && nextIncludeAssembly,
    });

    const calculatedUnitCents =
      effectiveMethod === "credit_card"
        ? nextPricing.cardTotalPriceCents
        : nextPricing.pixTotalPriceCents;

    const finalUnitCents =
      overrides.manualUnitPriceCents !== undefined
        ? overrides.manualUnitPriceCents
        : calculatedUnitCents;

    let nextMonitorName: string;
    let nextPrinterName: string;
    let nextReaderName: string;

    if (nextIsKit) {
      const resolved = resolveKitEquipmentSummary({
        kitItemsSnapshot: nextKitItems,
      });
      nextMonitorName = resolved.monitorDisplay;
      nextPrinterName = resolved.printerDisplay;
      nextReaderName = resolved.readerDisplay || "Kit de Montagem";
    } else {
      nextMonitorName = nextMonObj?.displayName || "Apenas Furação Homologada (+R$ 0)";
      nextPrinterName = nextPrtObj?.displayName || "Berço Homologado (+R$ 0)";
      nextReaderName = nextUseReader && nextRdrObj ? nextRdrObj.displayName : "Sem leitor";
    }

    const nextChecklist = buildOrderDeliveryChecklist({
      cabinetName: nextModel.name,
      colorName: nextColor.name,
      quantity: nextQty,
      kitItemsSnapshot: nextIsKit ? nextKitItems : null,
      monitorName: nextMonitorName,
      printerName: nextPrinterName,
      readerName: nextReaderName,
      includeAssemblyService: nextIsKit && nextIncludeAssembly,
    });

    const updatedItem: VisualEditableOrderItem = {
      ...currentItem,
      cabinet_name: nextModel.name,
      color_name: nextColor.name,
      monitor_name: nextMonitorName.slice(0, 128),
      printer_name: nextPrinterName.slice(0, 128),
      reader_name: nextReaderName.slice(0, 128),
      quantity: nextQty,
      unit_price_cents: finalUnitCents,
      subtotal_cents: finalUnitCents * nextQty,
      is_kit: nextIsKit,
      kit_items: nextIsKit ? nextKitItems : [],
      include_assembly: nextIsKit && nextIncludeAssembly,
      delivery_checklist: nextChecklist,
      screen_cutout: nextMonObj?.sizeInches
        ? `Abertura usinada para tela ${nextMonObj.sizeInches}" (tolerância de precisão CNC +1.5mm)`
        : currentItem.screen_cutout,
    };

    const nextItems = [...items];
    nextItems[activeItemIdx] = updatedItem;
    onUpdateItems(nextItems);
  };

  // Quando o admin alterna entre Tabela PIX e Tabela Cartão, recalcula todos os itens
  const handleSwitchPaymentMethod = (targetMethod: "pix" | "credit_card") => {
    onChangePaymentMethod(targetMethod);
    const updatedAll = items.map((it) => {
      const mod = findMatchingModel(it.cabinet_name, catalog.models);
      const col = findMatchingColor(it.color_name, catalog.colors);
      const resEq = resolveKitEquipmentSummary({
        kitItemsSnapshot: it.kit_items,
        monitorName: it.monitor_name,
        printerName: it.printer_name,
        readerName: it.reader_name,
      });
      const itemIsKit = typeof it.is_kit === "boolean" ? it.is_kit : resEq.isKit;
      const itemKitList =
        Array.isArray(it.kit_items) && it.kit_items.length > 0
          ? it.kit_items
          : DEFAULT_KIT_SUB_ITEMS.map((sub) => {
              if (sub.category === "monitor" && !resEq.hasMonitorInKit) return { ...sub, selected: false };
              if (sub.category === "printer" && !resEq.hasPrinterInKit) return { ...sub, selected: false };
              return { ...sub };
            });

      const pr = calculateTotemPrice({
        cabinet: mod,
        color: col,
        monitor: itemIsKit
          ? ({ id: "kit", isKit: true, kitItems: itemKitList } as any)
          : null,
        kitAdjustmentCents: itemIsKit ? calculateKitTotalCents(itemKitList) : 0,
        includeAssemblyService: itemIsKit && Boolean(it.include_assembly),
      });

      const unitCents = targetMethod === "credit_card" ? pr.cardTotalPriceCents : pr.pixTotalPriceCents;
      const qty = Math.max(1, it.quantity || 1);
      return {
        ...it,
        unit_price_cents: unitCents,
        subtotal_cents: unitCents * qty,
      };
    });
    onUpdateItems(updatedAll);
  };

  // Toggle individual de sub-item do Kit
  const handleToggleKitSubItem = (subId: string) => {
    const updatedKit = kitItems.map((sub) =>
      sub.id === subId ? { ...sub, selected: !sub.selected } : sub
    );
    const anySelected = updatedKit.some((s) => s.selected);
    applyItemChanges({
      isKit: anySelected,
      kitItems: updatedKit,
    });
  };

  // Alterar valor unitário de um sub-item do Kit
  const handleChangeKitSubItemPrice = (subId: string, priceCents: number) => {
    const updatedKit = kitItems.map((sub) =>
      sub.id === subId ? { ...sub, priceCents: Math.max(0, priceCents) } : sub
    );
    applyItemChanges({
      isKit: true,
      kitItems: updatedKit,
    });
  };

  // Adicionar nova peça personalizada dentro do Kit
  const handleAddCustomKitSubItem = () => {
    const cleanName = newSubItemName.trim();
    if (!cleanName) return;
    const priceCents = Math.round((parseFloat(newSubItemPriceBRL.replace(",", ".")) || 0) * 100);
    const newSub: KitSubItem = {
      id: `KIT-EXTRA-${Date.now()}`,
      name: cleanName,
      category: "accessory",
      description: "Item adicional incluído no Kit pelo Administrador.",
      priceCents: Math.max(0, priceCents),
      selected: true,
    };
    const updatedKit = [...kitItems, newSub];
    applyItemChanges({
      isKit: true,
      kitItems: updatedKit,
    });
    setNewSubItemName("");
    setNewSubItemPriceBRL("");
    setShowAddSubItemForm(false);
  };

  const selectedKitCount = kitItems.filter((i) => i.selected).length;
  const kitTotalCents = isKitSelected ? calculateKitTotalCents(kitItems) : 0;
  const cabinetBaseInActiveMethod =
    paymentMethod === "credit_card" ? pricing.cardBasePriceCents : pricing.pixBasePriceCents;
  const calculatedUnitPriceCents =
    paymentMethod === "credit_card" ? pricing.cardTotalPriceCents : pricing.pixTotalPriceCents;

  const CONFIG_STEPS = [
    { id: 1, label: "1. Formato", subtitle: selectedModel.name, icon: Box },
    { id: 2, label: "2. Acabamento", subtitle: selectedColor.name, icon: Palette },
    {
      id: 3,
      label: "3. Monitor & Kit",
      subtitle: isKitSelected ? `Kit (${selectedKitCount}/${kitItems.length})` : "Só Gabinete",
      icon: Tv,
    },
    {
      id: 4,
      label: "4. Impressora",
      subtitle: isKitSelected
        ? kitItems.find((i) => i.category === "printer")?.selected
          ? "Inclusa no Kit"
          : "Removida do Kit"
        : selectedPrinterObj?.displayName || "Padrão",
      icon: Printer,
    },
    {
      id: 5,
      label: "5. Leitor 2D",
      subtitle: isKitSelected ? "No Kit" : useReader ? "Com Leitor" : "Sem Leitor",
      icon: QrCode,
    },
    {
      id: 6,
      label: "6. Revisão & Kit",
      subtitle: formatBRL(currentItem?.subtotal_cents || calculatedUnitPriceCents),
      icon: CheckCircle2,
    },
  ];

  // Bloco reutilizável igual ao Print 5 ("Você deseja adicionar o Kit de Montagem junto com o Gabinete?")
  const renderInteractiveKitPanel = () => (
    <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border-2 border-[#0071e3]/40 dark:border-indigo-500/40 shadow-xl space-y-4">
      {/* Cabeçalho idêntico ao Modal do Cliente (Print 5) */}
      <div className="space-y-3 pb-3 border-b border-black/10 dark:border-slate-800">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                Você deseja adicionar o Kit de Montagem junto com o Gabinete?
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Clique em qualquer peça abaixo para marcar (✓ enviar e somar) ou desmarcar (✕ remover e descontar):
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-600 dark:text-cyan-300 border border-blue-500/30 text-[10px] font-black uppercase tracking-wider">
            Desmembramento em Tempo Real
          </span>
        </div>

        {/* Opção A (Só Gabinete) vs Opção B (Gabinete + Kit) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Card A: Quero SÓ o Gabinete */}
          <div
            onClick={() =>
              applyItemChanges({
                isKit: false,
                includeAssembly: false,
              })
            }
            className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
              !isKitSelected
                ? "bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-500 shadow-md"
                : "bg-slate-50 dark:bg-slate-950/70 border-slate-200 dark:border-slate-800 hover:border-slate-400"
            }`}
          >
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-black uppercase tracking-wide text-slate-800 dark:text-white flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-emerald-500 shrink-0" />
                  Opção A: Quero SÓ o Gabinete
                </span>
                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 font-mono">
                  {formatBRL(cabinetBaseInActiveMethod + selectedColor.priceAdjustmentCents)}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                Envia <strong>apenas a estrutura física</strong> do {selectedModel.name} ({selectedColor.name}). A furação CNC para tela e impressora já está inclusa (<strong>+ R$ 0,00</strong>).
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                applyItemChanges({
                  isKit: false,
                  includeAssembly: false,
                });
              }}
              className={`w-full py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                !isKitSelected
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200"
              }`}
            >
              {!isKitSelected ? (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Selecionado: Apenas o Gabinete (Sem Kit)</span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 text-rose-500" />
                  <span>Quero Apenas o Gabinete (Sem Kit)</span>
                </>
              )}
            </button>
          </div>

          {/* Card B: Gabinete + Kit */}
          <div
            onClick={() => {
              if (!isKitSelected) {
                const restored = kitItems.some((i) => i.selected)
                  ? kitItems
                  : DEFAULT_KIT_SUB_ITEMS.map((s) => ({ ...s, selected: true }));
                applyItemChanges({
                  isKit: true,
                  kitItems: restored,
                });
              }
            }}
            className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-2 ${
              isKitSelected
                ? "bg-blue-50/80 dark:bg-indigo-950/40 border-[#0071e3] dark:border-indigo-500 shadow-md"
                : "bg-slate-50 dark:bg-slate-950/70 border-slate-200 dark:border-slate-800 hover:border-blue-400"
            }`}
          >
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-black uppercase tracking-wide text-[#0071e3] dark:text-cyan-400 flex items-center gap-1.5">
                  <Boxes className="w-4 h-4 shrink-0" />
                  Opção B: Gabinete + Kit
                </span>
                <span className="text-xs font-black text-[#0071e3] dark:text-cyan-400 font-mono">
                  + {formatBRL(kitTotalCents)}
                </span>
              </div>
              <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-snug">
                Envia o <strong>Gabinete + os equipamentos marcados abaixo</strong> (PC All-in-One Touch, Impressora, Coolers, Botão Liga/Desliga, Régua e Cabos).
              </p>
            </div>
            <div className="text-[11px] font-bold text-[#0071e3] dark:text-cyan-300 bg-white/90 dark:bg-slate-900/80 px-2.5 py-1.5 rounded-xl border border-blue-200 dark:border-indigo-800 flex items-center justify-between">
              <span>✓ Marque ou desmarque qualquer peça abaixo:</span>
              <span className="font-mono font-black">
                {selectedKitCount}/{kitItems.length} ativas
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Ações Rápidas do Kit */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs">
        <span className="text-slate-700 dark:text-slate-200 font-bold">
          Peças adicionais selecionadas:{" "}
          <strong className="text-[#0071e3] dark:text-cyan-400">{isKitSelected ? selectedKitCount : 0}</strong> de{" "}
          <strong>{kitItems.length}</strong>
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() =>
              applyItemChanges({
                isKit: true,
                kitItems: kitItems.map((i) => ({ ...i, selected: true })),
              })
            }
            className="px-2.5 py-1 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 text-blue-600 dark:text-cyan-300 border border-blue-500/30 text-[11px] font-black cursor-pointer"
          >
            ✓ Marcar Todas ({kitItems.length})
          </button>
          <button
            type="button"
            onClick={() => {
              // Atalho: Remover Monitor e Impressora (igual ao caso do Diego!)
              const withoutMonPrt = kitItems.map((i) =>
                i.category === "monitor" || i.category === "printer"
                  ? { ...i, selected: false }
                  : { ...i, selected: true }
              );
              applyItemChanges({
                isKit: true,
                kitItems: withoutMonPrt,
              });
            }}
            className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-300 border border-amber-500/30 text-[11px] font-black cursor-pointer"
          >
            ⚡ Kit s/ Monitor e s/ Impressora (9 itens = R$ 363)
          </button>
          <button
            type="button"
            onClick={() =>
              applyItemChanges({
                isKit: false,
                kitItems: kitItems.map((i) => ({ ...i, selected: false })),
                includeAssembly: false,
              })
            }
            className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 dark:text-rose-300 border border-rose-500/30 text-[11px] font-black cursor-pointer"
          >
            ✕ Desmarcar Todas (Só Gabinete)
          </button>
          <button
            type="button"
            onClick={() =>
              applyItemChanges({
                isKit: true,
                kitItems: DEFAULT_KIT_SUB_ITEMS.map((i) => ({ ...i, selected: true })),
              })
            }
            className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            Restaurar Padrão
          </button>
          <button
            type="button"
            onClick={() => setShowAddSubItemForm((prev) => !prev)}
            className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30 text-[11px] font-black flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            Adicionar Peça ao Kit
          </button>
        </div>
      </div>

      {/* Formulário rápido para adicionar uma peça nova ao Kit */}
      {showAddSubItemForm && (
        <div className="p-3 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
          <div className="sm:col-span-7">
            <label className="block text-[10px] font-black uppercase text-emerald-300 mb-1">
              Nome da Nova Peça / Equipamento no Kit
            </label>
            <input
              type="text"
              value={newSubItemName}
              onChange={(e) => setNewSubItemName(e.target.value)}
              placeholder="Ex: Leitor QR Code 2D USB, Fonte 12V Extra, Suporte Pinpad..."
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-bold"
            />
          </div>
          <div className="sm:col-span-3">
            <label className="block text-[10px] font-black uppercase text-emerald-300 mb-1">
              Valor Adicional (R$)
            </label>
            <input
              type="number"
              step="0.01"
              value={newSubItemPriceBRL}
              onChange={(e) => setNewSubItemPriceBRL(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-emerald-300 font-mono text-xs font-black"
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="button"
              onClick={handleAddCustomKitSubItem}
              className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs cursor-pointer"
            >
              + Incluir
            </button>
          </div>
        </div>
      )}

      {/* Lista Completa dos 11 Sub-Itens do Kit (Estilo Print 5 com Foto, Badge, Preço Editável e Checkbox) */}
      <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
        {kitItems.map((sub) => {
          const isChecked = isKitSelected && Boolean(sub.selected);
          const Icon =
            sub.category === "monitor"
              ? Tv
              : sub.category === "printer"
              ? Printer
              : sub.category === "reader"
              ? QrCode
              : Cable;
          const catLabel =
            sub.category === "monitor"
              ? "DISPLAY TOUCHSCREEN + PC"
              : sub.category === "printer"
              ? "IMPRESSORA TÉRMICA 80MM"
              : sub.category === "reader"
              ? "LEITOR 2D / QR CODE"
              : "REFRIGERAÇÃO & ELÉTRICA";

          return (
            <div
              key={sub.id}
              onClick={() => handleToggleKitSubItem(sub.id)}
              className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 select-none ${
                isChecked
                  ? "bg-blue-50/80 dark:bg-indigo-950/35 border-[#0071e3]/50 dark:border-indigo-500/50 shadow-sm"
                  : "bg-slate-50/70 dark:bg-slate-950/60 border-black/10 dark:border-slate-800 opacity-65 hover:opacity-95"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* Foto Real da Peça */}
                <div
                  className={`w-12 h-12 rounded-xl border p-1 flex items-center justify-center shrink-0 overflow-hidden bg-white dark:bg-slate-950 ${
                    isChecked
                      ? "border-[#0071e3]/40 shadow-xs"
                      : "border-black/10 dark:border-slate-800 grayscale"
                  }`}
                >
                  {sub.image && sub.image !== ".webp" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={sub.image}
                      alt={sub.name}
                      className="w-full h-full object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <Icon className="w-5 h-5 text-[#0071e3]" />
                  )}
                </div>

                {/* Textos */}
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#0071e3] dark:text-cyan-400">
                      {catLabel}
                    </span>
                    {isChecked ? (
                      <span className="text-[9px] font-black text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
                        ✓ Vai ser enviado junto
                      </span>
                    ) : (
                      <span className="text-[9px] font-black text-rose-600 dark:text-rose-300 bg-rose-500/15 px-2 py-0.5 rounded-full border border-rose-500/30">
                        ✕ Removido (Não enviar / Não cobrar)
                      </span>
                    )}
                  </div>
                  <h4
                    className={`text-xs sm:text-sm font-bold leading-tight ${
                      isChecked
                        ? "text-slate-900 dark:text-white"
                        : "text-slate-500 dark:text-slate-400 line-through"
                    }`}
                  >
                    {sub.name}
                  </h4>
                  {sub.description && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                      {sub.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Preço (Editável ao clicar) + Checkbox */}
              <div className="flex items-center gap-3 shrink-0">
                <div
                  className="text-right"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-1 justify-end">
                    <span className="text-[10px] font-bold text-slate-400">+ R$</span>
                    <input
                      type="number"
                      step="1"
                      value={((sub.priceCents || 0) / 100).toFixed(2)}
                      onChange={(e) => {
                        const cents = Math.round((parseFloat(e.target.value) || 0) * 100);
                        handleChangeKitSubItemPrice(sub.id, cents);
                      }}
                      className={`w-20 px-2 py-1 rounded-lg text-right font-mono text-xs font-black border ${
                        isChecked
                          ? "bg-white dark:bg-slate-900 border-blue-500/40 text-[#0071e3] dark:text-cyan-300"
                          : "bg-slate-100 dark:bg-slate-950 border-slate-700 text-slate-500 line-through"
                      }`}
                      title="Editar valor desta peça no Kit"
                    />
                  </div>
                  <span className="block text-[9px] text-slate-400 mt-0.5">
                    {isChecked ? "somando no pedido" : "descontado (R$ 0)"}
                  </span>
                </div>

                <div
                  className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                    isChecked
                      ? "border-[#0071e3] bg-[#0071e3] text-white shadow-sm"
                      : "border-slate-400 dark:border-slate-600 bg-white dark:bg-slate-900"
                  }`}
                >
                  {isChecked && <Check className="w-4 h-4 stroke-[3]" />}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Opção de Serviço de Montagem de Fábrica (+ R$ 999,00) */}
      {isKitSelected && (
        <div
          onClick={() =>
            applyItemChanges({
              includeAssembly: !includeAssemblyService,
            })
          }
          className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 ${
            includeAssemblyService
              ? "bg-amber-500/15 border-amber-500/50 text-amber-200"
              : "bg-slate-900/60 border-slate-800 text-slate-400 hover:border-amber-500/30"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                includeAssemblyService
                  ? "bg-amber-500 text-slate-950"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              <Wrench className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-black text-white">
                Serviço de Montagem Especializada de Fábrica (Totem 100% Pronto)
              </h4>
              <p className="text-[11px] text-slate-400">
                {includeAssemblyService
                  ? "✓ Incluso: Enviar o Totem já 100% montado, cablado e testado pela engenharia."
                  : "Não incluso: O cliente fará a montagem das peças do Kit (enviamos manual e suporte)."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="font-mono text-xs sm:text-sm font-black text-amber-400">
              + {formatBRL(ASSEMBLY_SERVICE_PRICE_CENTS)}
            </span>
            <div
              className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center ${
                includeAssemblyService
                  ? "border-amber-400 bg-amber-400 text-slate-950"
                  : "border-slate-600 bg-slate-900"
              }`}
            >
              {includeAssemblyService && <Check className="w-4 h-4 stroke-[3]" />}
            </div>
          </div>
        </div>
      )}

      {/* Rodapé de Concatenação / Prova Real do Valor (Igual ao Print 5!) */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
        <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
          <span>
            1. Estrutura Física ({selectedModel.name} —{" "}
            <strong className="text-emerald-400">
              {paymentMethod === "credit_card" ? "Tabela Cartão" : "Tabela PIX"}
            </strong>
            ):
          </span>
          <span className="font-mono font-bold text-slate-900 dark:text-white">
            {formatBRL(cabinetBaseInActiveMethod)}
          </span>
        </div>

        {selectedColor.priceAdjustmentCents > 0 && (
          <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
            <span>2. + Acabamento ({selectedColor.name}):</span>
            <span className="font-mono font-bold text-slate-900 dark:text-white">
              + {formatBRL(selectedColor.priceAdjustmentCents)}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between text-blue-600 dark:text-cyan-300 font-semibold">
          <span>
            {selectedColor.priceAdjustmentCents > 0 ? "3." : "2."} + Peças do Kit marcadas acima (
            {isKitSelected ? selectedKitCount : 0} de {kitItems.length} itens):
          </span>
          <span className="font-mono font-black">+ {formatBRL(kitTotalCents)}</span>
        </div>

        {isKitSelected && includeAssemblyService && (
          <div className="flex items-center justify-between text-amber-500 font-semibold">
            <span>+ Serviço de Montagem de Fábrica:</span>
            <span className="font-mono font-black">+ {formatBRL(ASSEMBLY_SERVICE_PRICE_CENTS)}</span>
          </div>
        )}

        <div className="pt-2 border-t border-slate-300 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-500 block">
              Valor Concatenado deste Item (Qtd: {currentItem?.quantity || 1}x)
            </span>
            <span className="text-[11px] text-slate-400">
              No PIX: <strong>{formatBRL(pricing.pixTotalPriceCents * (currentItem?.quantity || 1))}</strong> • No Cartão:{" "}
              <strong>{formatBRL(pricing.cardTotalPriceCents * (currentItem?.quantity || 1))}</strong>
            </span>
          </div>
          <div className="text-right">
            <span className="text-lg sm:text-xl font-black text-emerald-500 font-mono">
              {formatBRL(currentItem?.subtotal_cents || calculatedUnitPriceCents)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* =====================================================================
          BARRA DE TOPO DO CONFIGURADOR VISUAL ADMIN:
          Seletor de Item + Seletor PIX/Cartão + Barra das 6 Etapas Igual ao Pedido Original
         ===================================================================== */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-950 border border-indigo-500/40 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Abas de Itens do Pedido (Caso tenha mais de 1 gabinete ou queira adicionar) */}
          <div className="flex flex-wrap items-center gap-2">
            {items.map((it, idx) => (
              <div key={it.$id || idx} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setActiveItemIdx(idx)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                    activeItemIdx === idx
                      ? "bg-[#0071e3] text-white shadow-lg shadow-blue-500/25"
                      : "bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800"
                  }`}
                >
                  <Box className="w-3.5 h-3.5" />
                  <span>
                    Item #{idx + 1}: {it.cabinet_name} ({formatBRL(it.subtotal_cents)})
                  </span>
                </button>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      onRemoveItem(idx);
                      if (activeItemIdx >= idx && activeItemIdx > 0) {
                        setActiveItemIdx(activeItemIdx - 1);
                      }
                    }}
                    className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 cursor-pointer"
                    title="Remover este gabinete do pedido"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={onAddNewItem}
              className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 font-extrabold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Adicionar Gabinete</span>
            </button>
          </div>

          {/* Seletor Rápido: Tabela PIX vs Tabela Cartão + Quantidade */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => handleSwitchPaymentMethod("pix")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-black flex items-center gap-1 transition-all cursor-pointer ${
                  paymentMethod === "pix"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Zap className="w-3 h-3" />
                <span>Tabela PIX ({formatBRL(pricing.pixTotalPriceCents)})</span>
              </button>
              <button
                type="button"
                onClick={() => handleSwitchPaymentMethod("credit_card")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-black flex items-center gap-1 transition-all cursor-pointer ${
                  paymentMethod === "credit_card"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <CreditCard className="w-3 h-3" />
                <span>Tabela Cartão ({formatBRL(pricing.cardTotalPriceCents)})</span>
              </button>
            </div>

            {currentItem && (
              <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1 rounded-xl border border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Qtd:</span>
                <input
                  type="number"
                  min={1}
                  value={currentItem.quantity}
                  onChange={(e) =>
                    applyItemChanges({
                      quantity: Math.max(1, parseInt(e.target.value, 10) || 1),
                    })
                  }
                  className="w-12 px-1.5 py-0.5 rounded bg-slate-950 border border-slate-700 text-white font-mono text-xs font-black text-center"
                />
              </div>
            )}
          </div>
        </div>

        {/* Barra de 6 Etapas idêntica ao Configurador Original — Livre para clicar em qualquer etapa */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar p-1.5 rounded-2xl bg-slate-900/90 border border-slate-800">
          {CONFIG_STEPS.map((s) => {
            const Icon = s.icon;
            const isActive = s.id === step;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setStep(s.id)}
                className={`flex items-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? "bg-[#0071e3] text-white shadow-md shadow-blue-500/25 ring-2 ring-[#0071e3]/40"
                    : "bg-slate-950/60 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800/80"
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <div className="text-left">
                  <span className="block leading-none font-black">{s.label}</span>
                  <span
                    className={`block text-[10px] mt-0.5 truncate max-w-[130px] ${
                      isActive ? "text-blue-100" : "text-slate-400"
                    }`}
                  >
                    {s.subtitle}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* =====================================================================
          CORPO DO CONFIGURADOR VISUAL EM 2 COLUNAS (IGUAL À TELA DO CLIENTE)
         ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Coluna Esquerda: Preview Visual Permanente do Gabinete + Resumo Lateral */}
        <div className="lg:col-span-4 bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Visualização do Item #{activeItemIdx + 1}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-500/15 text-cyan-300 border border-blue-500/30">
              {isKitSelected ? `Gabinete + Kit (${selectedKitCount}/${kitItems.length})` : "Só Gabinete"}
            </span>
          </div>

          {/* Foto do Modelo Selecionado */}
          <div className="h-44 rounded-xl bg-slate-900 border border-slate-800 p-3 flex items-center justify-center relative overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getModelThumbnail(selectedModel)}
              alt={selectedModel.name}
              className="h-full w-auto object-contain drop-shadow-lg"
            />
          </div>

          {/* Resumo Lateral */}
          <div className="space-y-1.5 text-xs border-t border-slate-800 pt-3 text-slate-400">
            <div className="flex justify-between items-center gap-2">
              <span>1. Formato:</span>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="font-bold text-white hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
              >
                <span>{selectedModel.name}</span>
                <Edit3 className="w-3 h-3 text-cyan-400" />
              </button>
            </div>
            <div className="flex justify-between items-center gap-2">
              <span>2. Acabamento:</span>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="font-bold text-white hover:text-cyan-300 flex items-center gap-1.5 cursor-pointer"
              >
                <span
                  className="w-3 h-3 rounded-full border border-white/30 inline-block"
                  style={{ background: selectedColor.hexReference }}
                />
                <span>{selectedColor.name}</span>
                <Edit3 className="w-3 h-3 text-cyan-400" />
              </button>
            </div>
            <div className="flex justify-between items-center gap-2">
              <span>3. Monitor / Kit:</span>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="font-bold text-cyan-300 hover:underline flex items-center gap-1 cursor-pointer text-right"
              >
                <span>
                  {isKitSelected
                    ? `Kit (${selectedKitCount}/${kitItems.length} peças)`
                    : selectedMonitorObj?.displayName || "Só Gabinete"}
                </span>
                <Edit3 className="w-3 h-3" />
              </button>
            </div>
            <div className="flex justify-between items-center gap-2">
              <span>4. Impressora:</span>
              <button
                type="button"
                onClick={() => setStep(isKitSelected ? 3 : 4)}
                className={`font-bold flex items-center gap-1 cursor-pointer text-right ${
                  isKitSelected && !kitItems.find((i) => i.category === "printer")?.selected
                    ? "text-rose-400"
                    : "text-white hover:text-cyan-300"
                }`}
              >
                <span>
                  {isKitSelected
                    ? kitItems.find((i) => i.category === "printer")?.selected
                      ? "VT-8360 80mm (No Kit)"
                      : "Removida do Kit"
                    : selectedPrinterObj?.displayName || "Berço Homologado"}
                </span>
                <Edit3 className="w-3 h-3 text-cyan-400" />
              </button>
            </div>

            <div className="pt-2.5 border-t border-slate-800 space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-bold text-slate-300">
                  Total Calculado ({paymentMethod === "credit_card" ? "Cartão" : "PIX"}):
                </span>
                <span className="text-base font-black text-emerald-400 font-mono">
                  {formatBRL(calculatedUnitPriceCents * (currentItem?.quantity || 1))}
                </span>
              </div>
              {currentItem &&
                currentItem.subtotal_cents !== calculatedUnitPriceCents * (currentItem.quantity || 1) && (
                  <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-amber-200 font-bold">
                      Subtotal salvo ({formatBRL(currentItem.subtotal_cents)}) difere da soma ({formatBRL(calculatedUnitPriceCents * (currentItem.quantity || 1))})
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        applyItemChanges({
                          manualUnitPriceCents: calculatedUnitPriceCents,
                        })
                      }
                      className="px-2 py-1 rounded-lg bg-amber-500 text-slate-950 font-black text-[10px] shrink-0 cursor-pointer"
                    >
                      Igualar
                    </button>
                  </div>
                )}
            </div>
          </div>
        </div>

        {/* Coluna Direita: Passo Ativo (1 a 6) */}
        <div className="lg:col-span-8 space-y-4">
          {/* ETAPA 1: ESCOLHA DO FORMATO DO GABINETE */}
          {step === 1 && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
              <StepModel
                models={catalog.models}
                selectedModel={selectedModel}
                onSelectModel={(model) => applyItemChanges({ model })}
              />
              <div className="flex justify-end pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-5 py-2.5 rounded-xl bg-[#0071e3] hover:bg-blue-500 text-white font-black text-xs flex items-center gap-2 cursor-pointer"
                >
                  <span>Próxima Etapa: Acabamento</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ETAPA 2: ESCOLHA DO ACABAMENTO MDF */}
          {step === 2 && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
              <StepColor
                colors={catalog.colors}
                selectedColor={selectedColor}
                onSelectColor={(color) => applyItemChanges({ color })}
              />
              <div className="flex justify-between pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Voltar (Formato)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-5 py-2.5 rounded-xl bg-[#0071e3] hover:bg-blue-500 text-white font-black text-xs flex items-center gap-2 cursor-pointer"
                >
                  <span>Próxima Etapa: Monitor & Kit</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ETAPA 3: MONITOR & KIT DE MONTAGEM COMPLETO (COM OS 11 ITENS CLICÁVEIS) */}
          {step === 3 && (
            <div className="space-y-4">
              {renderInteractiveKitPanel()}

              {/* Se escolheu Apenas o Gabinete (Sem Kit), permite escolher qual monitor será usado para furação */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <StepMonitor
                  monitors={catalog.monitors}
                  selectedMonitor={selectedMonitorObj}
                  onSelectMonitor={(mon) => {
                    if (isItemKit(mon)) {
                      const nextKit = mon.kitItems || getEffectiveKitItems(mon);
                      applyItemChanges({
                        isKit: true,
                        kitItems: nextKit,
                        monitor: mon,
                      });
                    } else {
                      applyItemChanges({
                        isKit: false,
                        monitor: mon,
                        includeAssembly: false,
                      });
                    }
                  }}
                  onRequestCustomization={() => {}}
                  cabinetName={selectedModel.name}
                  cabinetBasePixCents={selectedModel.pixPriceCents || selectedModel.basePriceCents}
                  cabinetBaseCardCents={selectedModel.basePriceCents}
                />
              </div>

              <div className="flex justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Voltar (Acabamento)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStep(isKitSelected ? 6 : 4)}
                  className="px-5 py-2.5 rounded-xl bg-[#0071e3] hover:bg-blue-500 text-white font-black text-xs flex items-center gap-2 cursor-pointer"
                >
                  <span>{isKitSelected ? "Ir para Revisão Completa" : "Próxima Etapa: Impressora"}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ETAPA 4: IMPRESSORA TÉRMICA */}
          {step === 4 && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
              {isKitSelected && (
                <div className="p-3 rounded-xl bg-indigo-500/15 border border-indigo-500/40 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-indigo-200 font-bold">
                    Este pedido está com o <strong>Kit de Montagem</strong> ativo. Você pode marcar/desmarcar a impressora do Kit (+ R$ 450,00) ou escolher um modelo abaixo apenas para o berço CNC:
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const prtSub = kitItems.find((i) => i.category === "printer");
                      if (prtSub) handleToggleKitSubItem(prtSub.id);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs cursor-pointer"
                  >
                    {kitItems.find((i) => i.category === "printer")?.selected
                      ? "✕ Remover Impressora do Kit (- R$ 450)"
                      : "✓ Incluir Impressora no Kit (+ R$ 450)"}
                  </button>
                </div>
              )}

              <StepPrinter
                printers={catalog.printers}
                selectedPrinter={selectedPrinterObj}
                onSelectPrinter={(printer) => applyItemChanges({ printer })}
                onRequestCustomization={() => {}}
              />

              <div className="flex justify-between pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Voltar (Monitor & Kit)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStep(5)}
                  className="px-5 py-2.5 rounded-xl bg-[#0071e3] hover:bg-blue-500 text-white font-black text-xs flex items-center gap-2 cursor-pointer"
                >
                  <span>Próxima Etapa: Leitor 2D</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ETAPA 5: LEITOR DE CÓDIGO DE BARRAS / QR CODE */}
          {step === 5 && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
              <StepReader
                readers={catalog.readers}
                useReader={useReader}
                selectedReader={selectedReaderObj}
                onToggleUseReader={(use) => applyItemChanges({ useReader: use })}
                onSelectReader={(reader) => applyItemChanges({ useReader: true, reader })}
                onRequestCustomization={() => {}}
              />
              <div className="flex justify-between pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Voltar (Impressora)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStep(6)}
                  className="px-5 py-2.5 rounded-xl bg-[#0071e3] hover:bg-blue-500 text-white font-black text-xs flex items-center gap-2 cursor-pointer"
                >
                  <span>Ir para Revisão & Kit</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ETAPA 6: REVISÃO COMPLETA DO QUE O CLIENTE ESCOLHEU + KIT INTERATIVO */}
          {step === 6 && (
            <div className="space-y-4">
              {/* Grade Rápida das Escolhas do Cliente com Botão "Alterar Etapa" em cada uma */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Etapa 6 • Tudo que o Cliente Escolheu neste Gabinete</span>
                    </span>
                    <h4 className="text-sm sm:text-base font-black text-white">
                      Clique em qualquer etapa abaixo para refazer ou marque/desmarque os itens do Kit diretamente:
                    </h4>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
                  {/* Card Etapa 1 */}
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-black uppercase text-slate-400 block">
                        Etapa 1 • Formato do Gabinete
                      </span>
                      <p className="font-black text-white text-sm mt-0.5">{selectedModel.name}</p>
                      <span className="text-[11px] text-emerald-400 font-mono font-bold">
                        Base {paymentMethod === "credit_card" ? "Cartão" : "PIX"}:{" "}
                        {formatBRL(cabinetBaseInActiveMethod)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="w-full py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-[#0071e3] text-cyan-300 hover:text-white font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Trocar Formato (Etapa 1)</span>
                    </button>
                  </div>

                  {/* Card Etapa 2 */}
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-black uppercase text-slate-400 block">
                        Etapa 2 • Acabamento MDF
                      </span>
                      <p className="font-black text-white text-sm mt-0.5">{selectedColor.name}</p>
                      <span className="text-[11px] text-emerald-400 font-mono font-bold">
                        {selectedColor.priceAdjustmentCents > 0
                          ? `+ ${formatBRL(selectedColor.priceAdjustmentCents)}`
                          : "Incluso (+ R$ 0,00)"}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="w-full py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-[#0071e3] text-cyan-300 hover:text-white font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Trocar Cor (Etapa 2)</span>
                    </button>
                  </div>

                  {/* Card Etapas 3, 4 e 5 */}
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-black uppercase text-slate-400 block">
                        Etapas 3, 4 e 5 • Equipamentos
                      </span>
                      <p className="font-black text-white text-sm mt-0.5">
                        {isKitSelected
                          ? `Gabinete + Kit (${selectedKitCount}/${kitItems.length} itens)`
                          : "Apenas o Gabinete (Sem Kit)"}
                      </p>
                      <span className="text-[11px] text-cyan-300 font-mono font-bold">
                        {isKitSelected ? `+ ${formatBRL(kitTotalCents)} no Kit` : "+ R$ 0,00 (Só Furação)"}
                      </span>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setStep(3)}
                        className="flex-1 py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-[#0071e3] text-cyan-300 hover:text-white font-bold text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Monitor (3)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setStep(4)}
                        className="flex-1 py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-[#0071e3] text-cyan-300 hover:text-white font-bold text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Impr. (4)</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Painel Interativo Completo do Kit de Montagem (Igual ao Print 5!) direto na Etapa 6 */}
              {renderInteractiveKitPanel()}

              {/* Campos Técnicos de Corte CNC & Observação Especial deste Item */}
              {currentItem && (
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-400 font-semibold text-[10px] uppercase mb-1">
                      Especificação de Corte CNC da Tela / Medidas do Monitor
                    </label>
                    <input
                      type="text"
                      value={currentItem.screen_cutout}
                      onChange={(e) => {
                        const nextItems = [...items];
                        nextItems[activeItemIdx] = {
                          ...currentItem,
                          screen_cutout: e.target.value,
                        };
                        onUpdateItems(nextItems);
                      }}
                      placeholder='Ex: Abertura usinada para tela 23.8" (53.5cm x 32.0cm)'
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-amber-300 font-bold text-[10px] uppercase mb-1">
                      Observação Especial / Alerta de Produção deste Item
                    </label>
                    <input
                      type="text"
                      value={currentItem.technical_notes}
                      onChange={(e) => {
                        const nextItems = [...items];
                        nextItems[activeItemIdx] = {
                          ...currentItem,
                          technical_notes: e.target.value,
                        };
                        onUpdateItems(nextItems);
                      }}
                      placeholder="Qualquer observação escrita aqui ficará em destaque no card e na Ficha CNC..."
                      className="w-full px-3 py-2 bg-amber-950/20 border border-amber-500/40 rounded-xl text-amber-200 font-semibold"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
