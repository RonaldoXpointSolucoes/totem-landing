"use client";

import React, { useState } from "react";
import { MonitorOption } from "@/types/catalog";
import { Card, Input } from "@/components/ui";
import {
  Check,
  Search,
  Tv,
  HelpCircle,
  Edit3,
  Plus,
  Ruler,
  Package,
  ArrowLeftRight,
} from "lucide-react";
import {
  isItemKit,
  getEffectiveKitItems,
  doesKitIncludeMonitor,
} from "@/modules/catalog/kitDefaults";
import { formatBRL } from "@/modules/pricing/pricingEngine";
import { CustomMonitorModal } from "./CustomMonitorModal";

interface StepMonitorProps {
  monitors: MonitorOption[];
  selectedMonitor: MonitorOption | null;
  onSelectMonitor: (monitor: MonitorOption) => void;
  onRequestCustomization: () => void;
  cabinetName?: string;
  cabinetBasePixCents?: number;
  cabinetBaseCardCents?: number;
  /**
   * Quando true, exibe o passo dedicado para o cliente que escolheu o Kit SEM monitor
   * informar obrigatoriamente qual é o monitor que ele vai utilizar no gabinete (+ R$ 0,00).
   */
  isKitCutoutMonitorMode?: boolean;
  onKitConfirmed?: (updatedKit: MonitorOption) => void;
  onEnterKitCutoutMonitorStep?: () => void;
  /** Atalho opcional para voltar à pergunta de modalidade (Apenas Gabinete vs Kit) ou às peças do Kit */
  onSwitchPurchaseMode?: () => void;
}

export const StepMonitor: React.FC<StepMonitorProps> = ({
  monitors,
  selectedMonitor,
  onSelectMonitor,
  onRequestCustomization,
  cabinetName = "Gabinete Totem Pro",
  isKitCutoutMonitorMode = false,
  onSwitchPurchaseMode,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorTargetMonitor, setEditorTargetMonitor] = useState<MonitorOption | null>(null);

  const sortedMonitors = React.useMemo(() => {
    return [...monitors].sort((a, b) => {
      const orderA = typeof a.sortOrder === "number" ? a.sortOrder : 999;
      const orderB = typeof b.sortOrder === "number" ? b.sortOrder : 999;
      return orderA - orderB;
    });
  }, [monitors]);

  const standardMonitors = React.useMemo(() => {
    return sortedMonitors
      .filter((m) => !isItemKit(m))
      .filter((m) =>
        `${m.brand} ${m.model} ${m.displayName}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      );
  }, [sortedMonitors, searchTerm]);

  const isSelectedKit = isItemKit(selectedMonitor);
  const currentKitItems = isSelectedKit ? getEffectiveKitItems(selectedMonitor) : [];
  const hasMonitorInSelectedKit = isSelectedKit ? doesKitIncludeMonitor(currentKitItems) : false;
  const activeCutoutMonitor = isSelectedKit ? selectedMonitor?.cutoutMonitor || null : null;

  const isCutoutForKitFlow =
    isKitCutoutMonitorMode || (isSelectedKit && !hasMonitorInSelectedKit);

  const effectiveHighlightedMonitor = isSelectedKit
    ? activeCutoutMonitor
    : selectedMonitor;

  const handleOpenEditor = (targetMon?: MonitorOption) => {
    const fallbackTarget = isSelectedKit ? activeCutoutMonitor : selectedMonitor;
    setEditorTargetMonitor(targetMon || fallbackTarget || null);
    setIsEditorOpen(true);
  };

  const handleSelectCutoutMonitorForKit = (mon: MonitorOption) => {
    if (!selectedMonitor || !isItemKit(selectedMonitor)) {
      onSelectMonitor(mon);
      return;
    }
    const updatedKitWithCutout: MonitorOption = {
      ...selectedMonitor,
      isKit: true,
      cutoutMonitor: {
        ...mon,
        isKit: false,
        priceAdjustmentCents: 0,
      },
    };
    onSelectMonitor(updatedKitWithCutout);
  };

  const handleSelect = (mon: MonitorOption) => {
    if (isCutoutForKitFlow) {
      handleSelectCutoutMonitorForKit(mon);
    } else {
      onSelectMonitor(mon);
    }
  };

  return (
    <div className="space-y-4">
      {/* Cabeçalho Didático e Limpo */}
      {isCutoutForKitFlow ? (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black uppercase tracking-wider shadow-xs">
                <Tv className="w-3 h-3" />
                Kit Sem Monitor • Furação CNC
              </span>
              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-500/20">
                Corte Grátis (+ R$ 0,00)
              </span>
            </div>

            {onSwitchPurchaseMode && (
              <button
                type="button"
                onClick={onSwitchPurchaseMode}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-black/10 dark:border-slate-700 text-[11px] font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ArrowLeftRight className="w-3 h-3" />
                <span>Voltar ao Kit</span>
              </button>
            )}
          </div>

          <h2 className="text-lg sm:text-2xl font-black text-[#1d1d1f] dark:text-white tracking-tight">
            Qual é o monitor que você vai usar no seu {cabinetName}?
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Como você removeu o monitor do Kit, informe abaixo qual será o <u>seu monitor</u> para fazermos o recorte CNC exato (<strong className="text-emerald-600 dark:text-emerald-400">+ R$ 0,00</strong>).
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[10px] font-black uppercase tracking-wide">
                <Package className="w-3 h-3" />
                Rota Apenas Gabinete
              </span>
              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-500/20">
                Furação Grátis (+ R$ 0,00)
              </span>
            </div>

            {onSwitchPurchaseMode && (
              <button
                type="button"
                onClick={onSwitchPurchaseMode}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-black/10 dark:border-slate-700 text-[11px] font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ArrowLeftRight className="w-3 h-3" />
                <span>Trocar para Gabinete + Kit</span>
              </button>
            )}
          </div>

          <h2 className="text-lg sm:text-2xl font-black text-[#1d1d1f] dark:text-white tracking-tight">
            Qual monitor será instalado no seu {cabinetName}?
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Selecione o modelo abaixo apenas para fazermos o recorte VESA e a abertura frontal exata na Router CNC.
          </p>
        </div>
      )}

      {/* Busca Rápida & Botão de Personalizar Medidas */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            placeholder="Pesquisar modelo ou marca (ex: Elgin, Gertec, Dell, 21.5)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-10 text-xs rounded-xl bg-white dark:bg-slate-900/80 border-black/15 dark:border-slate-800 text-[#1d1d1f] dark:text-white placeholder:text-slate-400 shadow-sm"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
        </div>

        <button
          type="button"
          onClick={() => handleOpenEditor()}
          className="px-3.5 h-10 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-600/20 dark:hover:bg-indigo-600/30 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shrink-0 shadow-sm cursor-pointer"
          title="Informar medidas de outro modelo de monitor"
        >
          <Ruler className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Outro Monitor (Sob Medida)</span>
          <span className="sm:hidden">Sob Medida</span>
        </button>
      </div>

      {/* Alerta Sutil de Seleção Obrigatória */}
      {!effectiveHighlightedMonitor && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
          <span className="font-semibold">
            {isCutoutForKitFlow
              ? "Selecione abaixo qual monitor você utilizará no gabinete para liberar o próximo passo."
              : "Selecione um monitor da lista ou informe as medidas em \"Sob Medida\" para avançar."}
          </span>
        </div>
      )}

      {/* Grade Limpa de Monitores para Recorte CNC */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {standardMonitors.map((mon) => {
          const isSelected = effectiveHighlightedMonitor?.id === mon.id;
          return (
            <Card
              key={mon.id}
              interactive
              selected={isSelected}
              onClick={() => handleSelect(mon)}
              className="p-3 sm:p-3.5 rounded-xl flex items-center justify-between gap-2.5 bg-white dark:bg-slate-900 min-h-[68px] active:scale-[0.985] transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-11 h-11 rounded-xl border p-1 flex items-center justify-center shrink-0 overflow-hidden transition-all ${
                    isSelected
                      ? "border-[#0071e3] bg-white dark:bg-slate-900 shadow-sm ring-2 ring-[#0071e3]/30"
                      : "border-black/10 dark:border-slate-800 bg-white dark:bg-slate-950"
                  }`}
                >
                  {mon.image ? (
                    <img
                      src={mon.image}
                      alt={mon.displayName}
                      className="w-full h-full object-contain drop-shadow-sm transition-transform duration-200 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <Tv className="w-5 h-5 text-slate-400" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold text-[#0071e3] dark:text-cyan-400 uppercase tracking-wider">
                      {mon.brand}
                    </span>
                    {mon.sizeInches && (
                      <span className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold bg-black/5 dark:bg-slate-800 px-1.5 py-0.2 rounded">
                        {mon.sizeInches}&quot;
                      </span>
                    )}
                    {!isCutoutForKitFlow && (mon.priceAdjustmentCents || 0) > 0 && (
                      <span className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 px-1.5 py-0.2 rounded border border-emerald-500/30">
                        + {formatBRL(mon.priceAdjustmentCents || 0)}
                      </span>
                    )}
                  </div>
                  <h3 className="text-xs font-bold text-[#1d1d1f] dark:text-white truncate">
                    {mon.displayName}
                  </h3>
                  <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold truncate">
                    {isCutoutForKitFlow
                      ? "Furação CNC p/ seu Monitor (+ R$ 0,00)"
                      : (mon.priceAdjustmentCents || 0) > 0
                      ? `Só Gabinete • Ajuste p/ tela (+ ${formatBRL(mon.priceAdjustmentCents || 0)})`
                      : "Só Gabinete • Furação grátis (+ R$ 0,00)"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {isSelected && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenEditor(mon);
                    }}
                    title="Ajustar medidas deste display"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-black/5 dark:hover:bg-slate-800 transition-all cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                )}
                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                    isSelected
                      ? "border-[#0071e3] bg-[#0071e3] text-white shadow-sm"
                      : "border-black/15 dark:border-slate-700 bg-black/5 dark:bg-slate-800"
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </div>
            </Card>
          );
        })}

        {/* Card Especial para Personalizar / Outro Monitor (Sob Medida) */}
        {(!searchTerm ||
          "outro monitor sob medida personalizada medidas display".includes(
            searchTerm.toLowerCase()
          )) && (
          <Card
            interactive
            selected={effectiveHighlightedMonitor?.isCustom}
            onClick={() =>
              handleOpenEditor(
                effectiveHighlightedMonitor?.isCustom
                  ? effectiveHighlightedMonitor
                  : undefined
              )
            }
            className={`p-3 sm:p-3.5 rounded-xl flex items-center justify-between gap-2.5 border-dashed min-h-[68px] transition-all active:scale-[0.985] cursor-pointer ${
              effectiveHighlightedMonitor?.isCustom
                ? "border-[#0071e3] bg-blue-50/80 dark:bg-indigo-600/20 ring-2 ring-[#0071e3]/25"
                : "border-indigo-300 dark:border-indigo-500/40 bg-indigo-50/30 dark:bg-slate-950 hover:border-indigo-500"
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-xl border border-indigo-400/40 bg-indigo-100 dark:bg-indigo-600/30 text-indigo-600 dark:text-indigo-300 flex items-center justify-center shrink-0">
                {effectiveHighlightedMonitor?.isCustom ? (
                  <Ruler className="w-4 h-4" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                    {effectiveHighlightedMonitor?.isCustom
                      ? effectiveHighlightedMonitor.brand
                      : "Outro Monitor"}
                  </span>
                  <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.2 rounded">
                    Furação Grátis (+ R$ 0,00)
                  </span>
                </div>
                <h3 className="text-xs font-bold text-[#1d1d1f] dark:text-white truncate">
                  {effectiveHighlightedMonitor?.isCustom
                    ? effectiveHighlightedMonitor.displayName
                    : "Meu monitor não está na lista (Sob Medida)"}
                </h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  {effectiveHighlightedMonitor?.isCustom &&
                  effectiveHighlightedMonitor.customDimensions
                    ? `Monitor: ${effectiveHighlightedMonitor.customDimensions.outerWidthCm}×${effectiveHighlightedMonitor.customDimensions.outerHeightCm}cm • Tela: ${effectiveHighlightedMonitor.customDimensions.screenWidthCm}×${effectiveHighlightedMonitor.customDimensions.screenHeightCm}cm`
                    : "Informe as medidas para fazermos a furação exata (+ R$ 0,00)"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {effectiveHighlightedMonitor?.isCustom && (
                <span className="hidden sm:inline-flex px-2 py-1 rounded-lg bg-white/80 dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 text-[10px] font-bold text-indigo-600 dark:text-indigo-300">
                  Editar Medidas
                </span>
              )}
              <div
                className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                  effectiveHighlightedMonitor?.isCustom
                    ? "border-[#0071e3] bg-[#0071e3] text-white shadow-sm"
                    : "border-indigo-400/40 bg-white dark:bg-slate-900 text-indigo-500"
                }`}
              >
                {effectiveHighlightedMonitor?.isCustom ? (
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                ) : (
                  <Edit3 className="w-3 h-3" />
                )}
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Link Discreto para Personalização Especial de Engenharia */}
      <div className="pt-1 text-center">
        <button
          type="button"
          onClick={onRequestCustomization}
          className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-[#0071e3] dark:text-slate-400 dark:hover:text-indigo-300 underline underline-offset-4 transition-colors cursor-pointer"
        >
          <HelpCircle className="w-3 h-3" />
          Não encontrou seu monitor? Solicite furação sob medida com nossa engenharia
        </button>
      </div>

      {/* Modal Interativo de Medidas do Monitor Sob Medida */}
      <CustomMonitorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        initialMonitor={editorTargetMonitor}
        onSave={(customMon) => {
          if (isCutoutForKitFlow) {
            handleSelectCutoutMonitorForKit(customMon);
          } else {
            onSelectMonitor(customMon);
          }
          setIsEditorOpen(false);
        }}
      />
    </div>
  );
};
