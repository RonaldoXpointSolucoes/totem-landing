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
  Package,
  XCircle,
  Info,
  SlidersHorizontal,
} from "lucide-react";
import {
  isItemKit,
  getEffectiveKitItems,
  calculateKitTotalCents,
} from "@/modules/catalog/kitDefaults";
import { formatBRL } from "@/modules/pricing/pricingEngine";
import { KitCustomizationModal } from "./KitCustomizationModal";
import { CustomMonitorModal } from "./CustomMonitorModal";

interface StepMonitorProps {
  monitors: MonitorOption[];
  selectedMonitor: MonitorOption | null;
  onSelectMonitor: (monitor: MonitorOption) => void;
  onRequestCustomization: () => void;
  cabinetName?: string;
  cabinetBasePixCents?: number;
  cabinetBaseCardCents?: number;
}

export const StepMonitor: React.FC<StepMonitorProps> = ({
  monitors,
  selectedMonitor,
  onSelectMonitor,
  onRequestCustomization,
  cabinetName = "Gabinete Totem Pro",
  cabinetBasePixCents = 110000,
  cabinetBaseCardCents = 133000,
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

  const standardMonitors = React.useMemo(
    () => filteredMonitors.filter((m) => !isItemKit(m)),
    [filteredMonitors]
  );

  const kitMonitors = React.useMemo(
    () => filteredMonitors.filter((m) => isItemKit(m)),
    [filteredMonitors]
  );

  // Abrir modal interativo de medidas do monitor (Outro Monitor / Sob Medida)
  const handleOpenEditor = (targetMon?: MonitorOption) => {
    setEditorTargetMonitor(targetMon || selectedMonitor || null);
    setIsEditorOpen(true);
  };

  // Abrir modal didático de confirmação e personalização dos sub-itens do Kit
  const handleOpenKitModal = (targetMon?: MonitorOption) => {
    const base = targetMon || (isItemKit(selectedMonitor) ? selectedMonitor : null);
    if (!base) return;
    const currentSource =
      selectedMonitor && selectedMonitor.id === base.id && selectedMonitor.kitItems
        ? selectedMonitor
        : base;
    const effectiveItems = getEffectiveKitItems(currentSource);
    setActiveKitTarget({ ...currentSource, isKit: true, kitItems: effectiveItems });
    setIsKitModalOpen(true);
  };

  // Remover o Kit e selecionar apenas o gabinete (primeiro monitor homologado com furação R$ 0)
  const handleRemoveKit = () => {
    const fallbackStandard =
      sortedMonitors.find((m) => !isItemKit(m) && (m.priceAdjustmentCents || 0) === 0) ||
      sortedMonitors.find((m) => !isItemKit(m));
    if (fallbackStandard) {
      onSelectMonitor(fallbackStandard);
    }
    setIsKitModalOpen(false);
  };

  // Salvar subitens do kit e recalcular preço dinamicamente
  const handleSaveKitItems = (updatedItems: KitSubItem[]) => {
    const base = activeKitTarget || (isItemKit(selectedMonitor) ? selectedMonitor : null);
    if (!base) return;
    const selectedCount = updatedItems.filter((i) => i.selected).length;
    if (selectedCount === 0) {
      handleRemoveKit();
      return;
    }
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

  // Ao clicar num monitor padrão, seleciona direto (+ R$ 0).
  // Ao clicar no Kit de Montagem, abre SEMPRE o modal didático de confirmação
  // para que o cliente veja todas as peças adicionais e confirme se realmente quer Gabinete + Kit!
  const handleSelect = (mon: MonitorOption) => {
    if (isItemKit(mon)) {
      handleOpenKitModal(mon);
    } else {
      onSelectMonitor(mon);
    }
  };

  const isSelectedKit = isItemKit(selectedMonitor);

  return (
    <div className="space-y-4">
      {/* Cabeçalho Didático */}
      <div className="text-center sm:text-left space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg sm:text-2xl font-black text-[#1d1d1f] dark:text-white tracking-tight">
            Qual monitor será instalado no seu {cabinetName}?
          </h2>
          <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-500/20">
            Furação no Gabinete Grátis (+ R$ 0,00)
          </span>
        </div>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
          Escolha na <strong>Opção 1</strong> se você quer comprar <u>somente o gabinete</u> (furação gratuita <strong className="text-emerald-600 dark:text-emerald-400">+ R$ 0,00</strong>) ou na <strong>Opção 2</strong> se deseja comprar o <u>Gabinete + Kit Completo de Equipamentos</u>.
        </p>
      </div>

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

      {/* Alerta de Seleção Obrigatória */}
      {!selectedMonitor && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs animate-in fade-in duration-200">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
          <span className="font-semibold">
            Seleção obrigatória: escolha abaixo se quer apenas a furação para sua tela (+ R$ 0,00) ou o Kit de Montagem Completo.
          </span>
        </div>
      )}

      {/* =====================================================================
          OPÇÃO 1: SOMENTE O GABINETE (FURAÇÃO CNC GRÁTIS + R$ 0,00)
         ===================================================================== */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-900/40 border border-black/10 dark:border-slate-800 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-black/10 dark:border-slate-800">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[10px] font-black uppercase tracking-wide">
                <Package className="w-3 h-3" />
                Opção 1: Quero APENAS o Gabinete (Sem Eletrônicos)
              </span>
              <span className="text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400">
                + R$ 0,00 (Apenas furação sob medida)
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              Você já tem ou vai comprar a tela por fora? Selecione o modelo abaixo apenas para fazermos o recorte exato no gabinete:
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {standardMonitors.map((mon) => {
            const isSelected = selectedMonitor?.id === mon.id;
            return (
              <Card
                key={mon.id}
                interactive
                selected={isSelected}
                onClick={() => handleSelect(mon)}
                className="p-3 sm:p-3.5 rounded-xl flex items-center justify-between gap-2.5 bg-white dark:bg-slate-900"
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
                      {(mon.priceAdjustmentCents || 0) > 0 && (
                        <span className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 px-1.5 py-0.2 rounded border border-emerald-500/30">
                          + {formatBRL(mon.priceAdjustmentCents || 0)}
                        </span>
                      )}
                    </div>
                    <h3 className="text-xs font-bold text-[#1d1d1f] dark:text-white truncate">
                      {mon.displayName}
                    </h3>
                    <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold truncate">
                      {(mon.priceAdjustmentCents || 0) > 0
                        ? `Equipamento incluso (+ ${formatBRL(mon.priceAdjustmentCents || 0)})`
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

          {/* Card Especial para Personalizar / Outro Monitor (Sob Medida) */}
          {(!searchTerm ||
            "outro monitor sob medida personalizada medidas display".includes(
              searchTerm.toLowerCase()
            )) && (
            <Card
              interactive
              selected={selectedMonitor?.isCustom}
              onClick={() =>
                handleOpenEditor(selectedMonitor?.isCustom ? selectedMonitor : undefined)
              }
              className={`p-3 sm:p-3.5 rounded-xl flex items-center justify-between gap-2.5 border-dashed transition-all ${
                selectedMonitor?.isCustom
                  ? "border-[#0071e3] bg-blue-50/80 dark:bg-indigo-600/20 ring-2 ring-[#0071e3]/25"
                  : "border-indigo-300 dark:border-indigo-500/40 bg-indigo-50/30 dark:bg-slate-950 hover:border-indigo-500"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 rounded-xl border border-indigo-400/40 bg-indigo-100 dark:bg-indigo-600/30 text-indigo-600 dark:text-indigo-300 flex items-center justify-center shrink-0">
                  {selectedMonitor?.isCustom ? (
                    <Ruler className="w-4 h-4" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                      {selectedMonitor?.isCustom ? selectedMonitor.brand : "Outro Monitor"}
                    </span>
                    <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.2 rounded">
                      Só Gabinete (+ R$ 0,00)
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-[#1d1d1f] dark:text-white truncate">
                    {selectedMonitor?.isCustom
                      ? selectedMonitor.displayName
                      : "Meu monitor não está na lista (Sob Medida)"}
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                    {selectedMonitor?.isCustom && selectedMonitor.customDimensions
                      ? `Monitor: ${selectedMonitor.customDimensions.outerWidthCm}×${selectedMonitor.customDimensions.outerHeightCm}cm • Tela: ${selectedMonitor.customDimensions.screenWidthCm}×${selectedMonitor.customDimensions.screenHeightCm}cm`
                      : "Informe as medidas para fazermos a furação exata (+ R$ 0,00)"}
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
                  {selectedMonitor?.isCustom ? (
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  ) : (
                    <Edit3 className="w-3 h-3" />
                  )}
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* =====================================================================
          OPÇÃO 2 (OPCIONAL): GABINETE + KIT DE MONTAGEM COMPLETO
         ===================================================================== */}
      {kitMonitors.length > 0 && (
        <div
          className={`p-3.5 sm:p-4 rounded-2xl border-2 transition-all space-y-3 ${
            isSelectedKit
              ? "bg-gradient-to-br from-blue-50/90 via-indigo-50/60 to-white dark:from-indigo-950/60 dark:via-slate-900 dark:to-slate-900 border-[#0071e3] shadow-md ring-2 ring-[#0071e3]/20"
              : "bg-gradient-to-br from-blue-50/40 via-indigo-50/20 to-white dark:from-slate-900/90 dark:to-slate-950 border-blue-200 dark:border-indigo-800/70"
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-2 pb-2 border-b border-blue-200/70 dark:border-indigo-900/70">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#0071e3] text-white text-[10px] font-black uppercase tracking-wide shadow-2xs">
                  <Boxes className="w-3 h-3" />
                  Opção 2 (Opcional): Quero Gabinete + Kit de Montagem Completo
                </span>
                <span className="text-[10px] font-bold text-[#0071e3] dark:text-cyan-400 bg-blue-100/80 dark:bg-indigo-950 px-2 py-0.5 rounded-full border border-blue-300 dark:border-indigo-700">
                  Peças Eletrônicas + Acessórios Inclusos
                </span>
              </div>
              <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
                <strong>Deseja receber também os equipamentos para montar o totem?</strong> Ao selecionar o Kit abaixo, você receberá o <strong>{cabinetName}</strong> + PC All-in-One Touch 23.8&quot; Core i5, Impressora Térmica 80mm, 2 Coolers, Botão Liga/Desliga, Régua e Cabos:
              </p>
            </div>
          </div>

          {kitMonitors.map((mon) => {
            const isSelected = selectedMonitor?.id === mon.id;
            const kitItems =
              isSelected && selectedMonitor?.kitItems
                ? selectedMonitor.kitItems
                : getEffectiveKitItems(mon);
            const kitTotalCents = calculateKitTotalCents(kitItems);
            const activeSubItems = kitItems.filter((i) => i.selected);

            return (
              <div
                key={mon.id}
                onClick={() => handleSelect(mon)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-3 ${
                  isSelected
                    ? "bg-white dark:bg-slate-900 border-[#0071e3] shadow-sm"
                    : "bg-white/90 dark:bg-slate-900/80 border-blue-200 dark:border-indigo-800/70 hover:border-[#0071e3]"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`w-12 h-12 rounded-xl border p-1 flex items-center justify-center shrink-0 overflow-hidden transition-all ${
                        isSelected
                          ? "border-[#0071e3] bg-white dark:bg-slate-900 shadow-sm"
                          : "border-blue-200 dark:border-slate-800 bg-white dark:bg-slate-950"
                      }`}
                    >
                      {mon.image ? (
                        <img
                          src={mon.image}
                          alt={mon.displayName}
                          className="w-full h-full object-contain drop-shadow-sm"
                          loading="lazy"
                        />
                      ) : (
                        <Boxes className="w-6 h-6 text-[#0071e3]" />
                      )}
                    </div>

                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="text-sm sm:text-base font-black text-[#1d1d1f] dark:text-white">
                          {mon.displayName} (Equipamentos + Peças)
                        </h3>
                        {isSelected ? (
                          <span className="text-[10px] font-black text-white bg-emerald-600 px-2 py-0.5 rounded-full">
                            ✓ KIT ADICIONADO AO GABINETE
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-[#0071e3] dark:text-cyan-300 bg-blue-50 dark:bg-indigo-950 px-2 py-0.5 rounded-full border border-blue-200 dark:border-indigo-800">
                            Clique para ver peças e confirmar
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400">
                        {activeSubItems.length} de {kitItems.length} componentes selecionados •{" "}
                        <strong className="text-[#0071e3] dark:text-cyan-400">
                          Adicional do Kit: + {formatBRL(kitTotalCents)}
                        </strong>{" "}
                        (Gabinete + Kit ={" "}
                        <strong className="text-emerald-600 dark:text-emerald-400">
                          {formatBRL(cabinetBasePixCents + kitTotalCents)} no PIX
                        </strong>
                        )
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenKitModal(mon);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    >
                      {isSelected ? (
                        <>
                          <SlidersHorizontal className="w-3.5 h-3.5" />
                          <span>Editar Peças do Kit</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5" />
                          <span>Ver Peças e Adicionar Kit</span>
                        </>
                      )}
                    </button>

                    {isSelected && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveKit();
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-300 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                        title="Remover o Kit e comprar apenas o Gabinete"
                      >
                        <XCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>Remover Kit (Só Gabinete)</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Lista Visual Rápida dos Componentes do Kit (Clicável para marcar/desmarcar direto) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-2 border-t border-black/5 dark:border-slate-800">
                  {kitItems.map((sub) => (
                    <div
                      key={sub.id}
                      onClick={(e) => {
                        if (isSelected) {
                          e.stopPropagation();
                          const nextItems = kitItems.map((item) =>
                            item.id === sub.id ? { ...item, selected: !item.selected } : item
                          );
                          const nextCount = nextItems.filter((i) => i.selected).length;
                          if (nextCount === 0) {
                            handleRemoveKit();
                          } else {
                            const nextTotal = calculateKitTotalCents(nextItems);
                            onSelectMonitor({
                              ...mon,
                              ...(selectedMonitor || {}),
                              isKit: true,
                              kitItems: nextItems,
                              priceAdjustmentCents: nextTotal,
                              notes: JSON.stringify({ kitItems: nextItems }),
                            });
                          }
                        }
                      }}
                      title={
                        isSelected
                          ? sub.selected
                            ? `Clique para remover "${sub.name}" do Kit`
                            : `Clique para incluir "${sub.name}" no Kit`
                          : "Clique para personalizar as peças do Kit"
                      }
                      className={`px-2.5 py-1.5 rounded-lg border text-[11px] flex items-center justify-between gap-2 transition-all ${
                        sub.selected
                          ? "bg-blue-50/60 dark:bg-indigo-950/30 border-blue-200/80 dark:border-indigo-800/80 text-slate-800 dark:text-slate-200 hover:border-[#0071e3]"
                          : "bg-slate-50 dark:bg-slate-950/40 border-black/5 text-slate-400 line-through opacity-60 hover:opacity-90"
                      }`}
                    >
                      <span className="truncate font-semibold">
                        {sub.selected ? "✓ " : "✕ "}
                        {sub.name}
                      </span>
                      <span className="font-black text-[#0071e3] dark:text-cyan-400 shrink-0">
                        {sub.selected ? `+${formatBRL(sub.priceCents)}` : "Removido"}
                      </span>
                    </div>
                  ))}
                </div>

                {isSelected && (
                  <div className="p-2.5 rounded-lg bg-emerald-50/90 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 flex items-start gap-2 text-[11px] text-emerald-900 dark:text-emerald-200">
                    <Info className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      <strong>Confirmação ativa:</strong> Você está comprando o{" "}
                      <strong>{cabinetName} ({formatBRL(cabinetBasePixCents)})</strong> +{" "}
                      <strong>
                        {activeSubItems.length} {activeSubItems.length === 1 ? "peça do Kit" : "peças do Kit"} (+ {formatBRL(kitTotalCents)})
                      </strong>
                      . Se desejava comprar <u>apenas o gabinete</u>, clique em{" "}
                      <strong>&quot;Remover Kit (Só Gabinete)&quot;</strong> acima.
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

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

      {/* Modal Didático de Confirmação e Personalização do Kit de Montagem */}
      <KitCustomizationModal
        isOpen={isKitModalOpen}
        onClose={() => setIsKitModalOpen(false)}
        initialItems={
          activeKitTarget?.kitItems ||
          (isItemKit(selectedMonitor)
            ? getEffectiveKitItems(selectedMonitor)
            : getEffectiveKitItems())
        }
        onSave={handleSaveKitItems}
        onRemoveKit={handleRemoveKit}
        cabinetName={cabinetName}
        cabinetBasePixCents={cabinetBasePixCents}
        cabinetBaseCardCents={cabinetBaseCardCents}
      />
    </div>
  );
};
