"use client";

import React, { useState } from "react";
import { MonitorOption, KitSubItem } from "@/types/catalog";
import { Card, Input } from "@/components/ui";
import {
  Check,
  Search,
  Tv,
  HelpCircle,
  Edit3,
  Eye,
  Plus,
  Boxes,
  Ruler,
} from "lucide-react";
import { isItemKit, getEffectiveKitItems, calculateKitTotalCents } from "@/modules/catalog/kitDefaults";
import { formatBRL } from "@/modules/pricing/pricingEngine";
import { KitCustomizationModal } from "./KitCustomizationModal";
import { CustomMonitorModal } from "./CustomMonitorModal";

interface StepMonitorProps {
  monitors: MonitorOption[];
  selectedMonitor: MonitorOption | null;
  onSelectMonitor: (monitor: MonitorOption) => void;
  onRequestCustomization: () => void;
}

export const StepMonitor: React.FC<StepMonitorProps> = ({
  monitors,
  selectedMonitor,
  onSelectMonitor,
  onRequestCustomization,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorTargetMonitor, setEditorTargetMonitor] = useState<MonitorOption | null>(null);
  const [isKitModalOpen, setIsKitModalOpen] = useState(false);
  const [activeKitTarget, setActiveKitTarget] = useState<MonitorOption | null>(null);

  const sortedMonitors = React.useMemo(() => {
    return [...monitors].sort((a, b) => {
      const orderA = typeof a.sortOrder === "number" ? a.sortOrder : 999;
      const orderB = typeof b.sortOrder === "number" ? b.sortOrder : 999;
      return orderA - orderB;
    });
  }, [monitors]);

  const filteredMonitors = React.useMemo(() => {
    return sortedMonitors.filter((m) =>
      `${m.brand} ${m.model} ${m.displayName}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    );
  }, [sortedMonitors, searchTerm]);

  // Abrir modal interativo de medidas do monitor (Outro Monitor / Sob Medida)
  const handleOpenEditor = (targetMon?: MonitorOption) => {
    setEditorTargetMonitor(targetMon || selectedMonitor || null);
    setIsEditorOpen(true);
  };

  // Abrir modal de personalização dos sub-itens do Kit
  const handleOpenKitModal = (targetMon?: MonitorOption) => {
    const base = targetMon || (isItemKit(selectedMonitor) ? selectedMonitor : null);
    if (!base) return;
    const effectiveItems = getEffectiveKitItems(base);
    setActiveKitTarget({ ...base, kitItems: effectiveItems });
    setIsKitModalOpen(true);
  };

  // Salvar subitens do kit e recalcular preço dinamicamente
  const handleSaveKitItems = (updatedItems: KitSubItem[]) => {
    const base = activeKitTarget || (isItemKit(selectedMonitor) ? selectedMonitor : null);
    if (!base) return;
    const totalCents = calculateKitTotalCents(updatedItems);
    const updated: MonitorOption = {
      ...base,
      isKit: true,
      kitItems: updatedItems,
      priceAdjustmentCents: totalCents,
      notes: JSON.stringify({ kitItems: updatedItems }),
    };
    onSelectMonitor(updated);
    setIsKitModalOpen(false);
  };

  // Seleção inteligente com detecção de Kit
  const handleSelect = (mon: MonitorOption) => {
    if (isItemKit(mon)) {
      const existingItems =
        selectedMonitor?.id === mon.id && selectedMonitor.kitItems
          ? selectedMonitor.kitItems
          : getEffectiveKitItems(mon);
      const totalCents = calculateKitTotalCents(existingItems);
      onSelectMonitor({
        ...mon,
        isKit: true,
        kitItems: existingItems,
        priceAdjustmentCents: totalCents,
      });
    } else {
      onSelectMonitor(mon);
    }
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Cabeçalho */}
      <div className="text-center sm:text-left space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg sm:text-2xl font-black text-[#1d1d1f] dark:text-white tracking-tight">
            Qual monitor será instalado no Gabinete?
          </h2>
          <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-500/20">
            Furação Homologada (+ R$ 0)
          </span>
        </div>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
          Selecione um monitor homologado, personalize seu display sob medida ou escolha o Kit de Montagem completo.
        </p>
      </div>

      {/* Busca Rápida & Botão de Personalizar Medidas */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            placeholder="Pesquisar modelo ou marca (ex: Elgin, Gertec, Kit, 21.5)..."
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

      {/* Alerta de Seleção Obrigatória */}
      {!selectedMonitor && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs animate-in fade-in duration-200">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
          <span className="font-semibold">
            Seleção obrigatória: escolha uma das opções abaixo para habilitar o avanço de etapa.
          </span>
        </div>
      )}

      {/* Grid Completo de Monitores Usando Todo o Espaço da Tela */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Monitores Homologados & Kit de Montagem */}
        {filteredMonitors.map((mon) => {
          const isSelected = selectedMonitor?.id === mon.id;
          const isKit = isItemKit(mon);

          if (isKit) {
            const kitItems = isSelected && selectedMonitor?.kitItems
              ? selectedMonitor.kitItems
              : getEffectiveKitItems(mon);
            const kitTotalCents = calculateKitTotalCents(kitItems);
            const activeCount = kitItems.filter((i) => i.selected).length;

            return (
              <Card
                key={mon.id}
                interactive
                selected={isSelected}
                onClick={() => handleSelect(mon)}
                className={`p-3 sm:p-3.5 rounded-xl flex items-center justify-between gap-2.5 transition-all relative overflow-hidden group ${
                  isSelected
                    ? "border-[#0071e3] bg-gradient-to-r from-blue-50/90 to-indigo-50/80 dark:from-indigo-950/60 dark:to-slate-900 shadow-md ring-2 ring-[#0071e3]/30"
                    : "border-blue-200 dark:border-indigo-800/60 bg-gradient-to-r from-blue-50/30 to-indigo-50/20 dark:bg-slate-900/80 hover:border-blue-400"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-11 h-11 rounded-xl border p-1 flex items-center justify-center shrink-0 overflow-hidden transition-all ${
                      isSelected
                        ? "border-[#0071e3] bg-white dark:bg-slate-900 shadow-sm"
                        : "border-blue-200 dark:border-slate-800 bg-white dark:bg-slate-950"
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
                      <Boxes className="w-5 h-5 text-[#0071e3]" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-black text-[#0071e3] dark:text-cyan-400 uppercase tracking-wider">
                        {mon.brand || "Geral"} {mon.sizeInches ? `${mon.sizeInches}"` : ""}
                      </span>
                      <span className="text-[9px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-500/20 px-1.5 py-0.2 rounded">
                        PACOTE COMPLETO
                      </span>
                    </div>
                    <h3 className="text-xs font-black text-[#1d1d1f] dark:text-white truncate">
                      {mon.displayName}
                    </h3>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                      <span>{activeCount} de {kitItems.length} itens</span>
                      <span>•</span>
                      <span className="font-bold text-[#0071e3] dark:text-cyan-400">
                        {formatBRL(kitTotalCents)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Botão de Ver Detalhes / Edição de Sub-Itens sempre acessível no Kit */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenKitModal(mon);
                    }}
                    title="Ver detalhes dos itens inclusos no Kit de Montagem"
                    className="px-2.5 py-1.5 rounded-lg text-[#0071e3] dark:text-cyan-400 bg-blue-50/70 dark:bg-slate-800/80 hover:bg-blue-100 dark:hover:bg-slate-800 border border-blue-200 dark:border-indigo-800 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-bold">Ver detalhes</span>
                  </button>

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
          }

          return (
            <Card
              key={mon.id}
              interactive
              selected={isSelected}
              onClick={() => handleSelect(mon)}
              className="p-3 sm:p-3.5 rounded-xl flex items-center justify-between gap-2.5"
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
                        {mon.sizeInches}"
                      </span>
                    )}
                    {(mon.priceAdjustmentCents || 0) > 0 && (
                      <span className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 px-1.5 py-0.2 rounded border border-emerald-500/30">
                        + {formatBRL(mon.priceAdjustmentCents || 0)}
                      </span>
                    )}
                  </div>
                  <h3 className="text-xs font-bold text-[#1d1d1f] dark:text-white truncate">
                    {mon.displayName}
                  </h3>
                  {mon.vesaPattern && (
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                      VESA: {mon.vesaPattern}{" "}
                      {(mon.priceAdjustmentCents || 0) > 0
                        ? `• Equipamento incluso (+ ${formatBRL(mon.priceAdjustmentCents || 0)})`
                        : "• Furação (+ R$ 0)"}
                    </p>
                  )}
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
                    className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-black/5 dark:hover:bg-slate-800 transition-all"
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

        {/* Card Especial para Personalizar / Outro Monitor (Exibido por último por ser sob medida) */}
        {(!searchTerm || "outro monitor sob medida personalizada medidas display".includes(searchTerm.toLowerCase())) && (
          <Card
            interactive
            selected={selectedMonitor?.isCustom}
            onClick={() => handleOpenEditor(selectedMonitor?.isCustom ? selectedMonitor : undefined)}
            className={`p-3 sm:p-3.5 rounded-xl flex items-center justify-between gap-2.5 border-dashed transition-all ${
              selectedMonitor?.isCustom
                ? "border-[#0071e3] bg-blue-50/80 dark:bg-indigo-600/20 ring-2 ring-[#0071e3]/25"
                : "border-indigo-300 dark:border-indigo-500/40 bg-indigo-50/30 dark:bg-slate-950 hover:border-indigo-500"
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-xl border border-indigo-400/40 bg-indigo-100 dark:bg-indigo-600/30 text-indigo-600 dark:text-indigo-300 flex items-center justify-center shrink-0">
                {selectedMonitor?.isCustom ? <Ruler className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                    {selectedMonitor?.isCustom ? selectedMonitor.brand : "Outro Monitor"}
                  </span>
                  <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.2 rounded">
                    Sob Medida
                  </span>
                </div>
                <h3 className="text-xs font-bold text-[#1d1d1f] dark:text-white truncate">
                  {selectedMonitor?.isCustom
                    ? selectedMonitor.displayName
                    : "Definir Marca, Modelo, Tela e Bordas"}
                </h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  {selectedMonitor?.isCustom && selectedMonitor.customDimensions
                    ? `Monitor: ${selectedMonitor.customDimensions.outerWidthCm}×${selectedMonitor.customDimensions.outerHeightCm}cm • Tela: ${selectedMonitor.customDimensions.screenWidthCm}×${selectedMonitor.customDimensions.screenHeightCm}cm`
                    : "Mapa visual com medidas do monitor inteiro, tela e barras"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {selectedMonitor?.isCustom && (
                <span className="hidden sm:inline-flex px-2 py-1 rounded-lg bg-white/80 dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 text-[10px] font-bold text-indigo-600 dark:text-indigo-300">
                  Editar Medidas
                </span>
              )}
              <div
                className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                  selectedMonitor?.isCustom
                    ? "border-[#0071e3] bg-[#0071e3] text-white shadow-sm"
                    : "border-indigo-400/40 bg-white dark:bg-slate-900 text-indigo-500"
                }`}
              >
                {selectedMonitor?.isCustom ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Edit3 className="w-3 h-3" />}
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

      {/* Modal Interativo de Medidas do Monitor Sob Medida (Tela Grande + Diagrama Visual) */}
      <CustomMonitorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        initialMonitor={editorTargetMonitor}
        onSave={(customMon) => {
          onSelectMonitor(customMon);
          setIsEditorOpen(false);
        }}
      />

      {/* Modal Interativo de Sub-Itens do Kit de Montagem */}
      <KitCustomizationModal
        isOpen={isKitModalOpen}
        onClose={() => setIsKitModalOpen(false)}
        initialItems={
          activeKitTarget?.kitItems ||
          (isItemKit(selectedMonitor) ? getEffectiveKitItems(selectedMonitor) : getEffectiveKitItems())
        }
        onSave={handleSaveKitItems}
      />
    </div>
  );
};
