"use client";

import React, { useState } from "react";
import { MonitorOption, KitSubItem } from "@/types/catalog";
import { Card, Input, Button, Badge } from "@/components/ui";
import {
  Check,
  Search,
  Tv,
  HelpCircle,
  Edit3,
  Plus,
  Sparkles,
  X,
  Sliders,
  CheckCircle2,
  Boxes,
  Layers,
  PackageCheck,
} from "lucide-react";
import { isItemKit, getEffectiveKitItems, calculateKitTotalCents } from "@/modules/catalog/kitDefaults";
import { formatBRL } from "@/modules/pricing/pricingEngine";
import { KitCustomizationModal } from "./KitCustomizationModal";

interface StepMonitorProps {
  monitors: MonitorOption[];
  selectedMonitor: MonitorOption | null;
  onSelectMonitor: (monitor: MonitorOption) => void;
  onRequestCustomization: () => void;
}

const COMMON_BRANDS = [
  "Elgin",
  "Gertec",
  "Bematech",
  "Prolan",
  "Samsung",
  "LG",
  "AOC",
  "Dell",
  "Positivo",
];

const COMMON_SIZES = [15.6, 18.5, 21.5, 23.8, 27.0, 32.0];
const COMMON_VESA = ["75x75", "100x100", "200x100"];

export const StepMonitor: React.FC<StepMonitorProps> = ({
  monitors,
  selectedMonitor,
  onSelectMonitor,
  onRequestCustomization,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isKitModalOpen, setIsKitModalOpen] = useState(false);
  const [activeKitTarget, setActiveKitTarget] = useState<MonitorOption | null>(null);

  // Estados locais do editor de marca, modelo e polegadas
  const [brandInput, setBrandInput] = useState(selectedMonitor?.brand || "Samsung");
  const [modelInput, setModelInput] = useState(selectedMonitor?.model || "Display Pro Touch");
  const [inchesInput, setInchesInput] = useState<number>(selectedMonitor?.sizeInches || 21.5);
  const [vesaInput, setVesaInput] = useState(selectedMonitor?.vesaPattern || "100x100");

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

  // Abrir editor com os dados atuais do monitor selecionado
  const handleOpenEditor = (targetMon?: MonitorOption) => {
    const base = targetMon || selectedMonitor;
    setBrandInput(base?.brand || "Samsung");
    setModelInput(base?.model || "Monitor Touch");
    setInchesInput(base?.sizeInches || 21.5);
    setVesaInput(base?.vesaPattern || "100x100");
    setIsEditorOpen(true);
  };

  // Salvar monitor personalizado ou editado
  const handleApplyCustomMonitor = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanBrand = brandInput.trim() || "Genérico";
    const cleanModel = modelInput.trim() || "Monitor Personalizado";
    const size = inchesInput || 21.5;
    const vesa = vesaInput.trim() || "100x100";

    const customMon: MonitorOption = {
      id: `custom-mon-${Date.now()}`,
      brand: cleanBrand,
      model: cleanModel,
      displayName: `${cleanBrand} ${cleanModel} ${size}"`,
      sizeInches: size,
      vesaPattern: vesa,
      technicalCode: `${cleanBrand.substring(0, 3).toUpperCase()}-${cleanModel.substring(0, 4).toUpperCase()}-V100`,
      notes: `Usinagem CNC programada sob medida para display ${cleanBrand} de ${size}" com padrão VESA ${vesa}.`,
      active: true,
      isCustom: true,
    };

    onSelectMonitor(customMon);
    setIsEditorOpen(false);
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
            Qual monitor será instalado no Totem?
          </h2>
          <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-500/20">
            Furação Homologada (+ R$ 0)
          </span>
        </div>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
          Selecione um monitor homologado, personalize seu display ou escolha o Kit de Montagem completo.
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
          className="px-3.5 h-10 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-600/20 dark:hover:bg-indigo-600/30 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shrink-0 shadow-sm"
          title="Editar Marca, Modelo e Polegadas"
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Personalizar Medidas</span>
          <span className="sm:hidden">Editar</span>
        </button>
      </div>

      {/* PAINEL INLINE EXPANSÍVEL: EDITAR MARCA, MODELO E POLEGADAS */}
      {isEditorOpen && (
        <form
          onSubmit={handleApplyCustomMonitor}
          className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/80 to-blue-50/50 dark:from-slate-900 dark:to-indigo-950/40 border border-indigo-200 dark:border-indigo-500/40 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-200"
        >
          <div className="flex items-center justify-between pb-2 border-b border-indigo-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-black text-[#1d1d1f] dark:text-white tracking-tight">
                  Definir Marca, Modelo e Polegadas do Monitor
                </h3>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  Usinamos a moldura frontal na Router CNC na medida exata do seu display
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsEditorOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-black/5 dark:hover:bg-slate-800 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Marca e Modelo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Marca do Fabricante *
              </label>
              <input
                type="text"
                required
                value={brandInput}
                onChange={(e) => setBrandInput(e.target.value)}
                placeholder="Ex: Samsung, LG, AOC, Elgin..."
                className="w-full h-9 px-3 text-xs rounded-xl bg-white dark:bg-slate-950 border border-black/15 dark:border-slate-800 text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <div className="flex flex-wrap gap-1 mt-1.5">
                {COMMON_BRANDS.map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setBrandInput(b)}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-all ${
                      brandInput.toLowerCase() === b.toLowerCase()
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-black/10 dark:border-slate-800 hover:border-indigo-400"
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Modelo do Monitor *
              </label>
              <input
                type="text"
                required
                value={modelInput}
                onChange={(e) => setModelInput(e.target.value)}
                placeholder="Ex: T350, Flatron, Touch Pro..."
                className="w-full h-9 px-3 text-xs rounded-xl bg-white dark:bg-slate-950 border border-black/15 dark:border-slate-800 text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Modelo ou código comercial do display
              </span>
            </div>
          </div>

          {/* Polegadas e VESA */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Tamanho da Tela (Polegadas) *
              </label>
              <input
                type="number"
                step="0.1"
                min="10"
                max="65"
                required
                value={inchesInput}
                onChange={(e) => setInchesInput(parseFloat(e.target.value || "21.5"))}
                className="w-full h-9 px-3 text-xs font-black text-indigo-600 dark:text-indigo-400 rounded-xl bg-white dark:bg-slate-950 border border-indigo-300 dark:border-indigo-500/50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <div className="flex flex-wrap gap-1 mt-1.5">
                {COMMON_SIZES.map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => setInchesInput(sz)}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-all ${
                      inchesInput === sz
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-black/10 dark:border-slate-800 hover:border-indigo-400"
                    }`}
                  >
                    {sz}"
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Padrão de Furação VESA *
              </label>
              <input
                type="text"
                required
                value={vesaInput}
                onChange={(e) => setVesaInput(e.target.value)}
                placeholder="Ex: 75x75, 100x100..."
                className="w-full h-9 px-3 text-xs rounded-xl bg-white dark:bg-slate-950 border border-black/15 dark:border-slate-800 text-[#1d1d1f] dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <div className="flex flex-wrap gap-1 mt-1.5">
                {COMMON_VESA.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setVesaInput(v)}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-all ${
                      vesaInput === v
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-black/10 dark:border-slate-800 hover:border-indigo-400"
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Resumo Live & Botões */}
          <div className="pt-2 border-t border-indigo-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2.5">
            <div className="text-[11px] text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span>
                Configuração: <strong className="text-indigo-600 dark:text-indigo-400">{brandInput} {modelInput} {inchesInput}"</strong> (VESA {vesaInput})
              </span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="flex-1 sm:flex-none px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 sm:flex-none px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/30 transition-all active:scale-95"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Confirmar Medidas (+ R$ 0)</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Alerta de Seleção Obrigatória */}
      {!selectedMonitor && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs animate-in fade-in duration-200">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
          <span className="font-semibold">
            Seleção obrigatória: escolha uma das opções abaixo para habilitar o avanço de etapa.
          </span>
        </div>
      )}

      {/* Grid com Scroll Interno Seguro para Manter Viewport sem Estouro */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[260px] lg:max-h-[290px] overflow-y-auto pr-1">
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
                  {/* Botão de Edição de Sub-Itens sempre acessível no Kit */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenKitModal(mon);
                    }}
                    title="Editar Sub-Itens do Kit de Montagem"
                    className="p-1.5 rounded-lg text-[#0071e3] dark:text-cyan-400 hover:bg-blue-100 dark:hover:bg-slate-800 border border-blue-200 dark:border-indigo-800 transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline text-[10px] font-bold">Editar</span>
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
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-[#0071e3] dark:text-cyan-400 uppercase tracking-wider">
                      {mon.brand}
                    </span>
                    {mon.sizeInches && (
                      <span className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold bg-black/5 dark:bg-slate-800 px-1.5 py-0.2 rounded">
                        {mon.sizeInches}"
                      </span>
                    )}
                  </div>
                  <h3 className="text-xs font-bold text-[#1d1d1f] dark:text-white truncate">
                    {mon.displayName}
                  </h3>
                  {mon.vesaPattern && (
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                      VESA: {mon.vesaPattern}
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
            onClick={() => handleOpenEditor()}
            className={`p-3 sm:p-3.5 rounded-xl flex items-center justify-between gap-2.5 border-dashed transition-all ${
              selectedMonitor?.isCustom
                ? "border-[#0071e3] bg-blue-50/80 dark:bg-indigo-600/20"
                : "border-indigo-300 dark:border-indigo-500/40 bg-indigo-50/30 dark:bg-slate-950 hover:border-indigo-500"
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl border border-indigo-400/40 bg-indigo-100 dark:bg-indigo-600/30 text-indigo-600 dark:text-indigo-300 flex items-center justify-center shrink-0">
                {selectedMonitor?.isCustom ? <Edit3 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                    {selectedMonitor?.isCustom ? selectedMonitor.brand : "Outro Monitor"}
                  </span>
                  <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-1 py-0.2 rounded">
                    Sob Medida
                  </span>
                </div>
                <h3 className="text-xs font-bold text-[#1d1d1f] dark:text-white truncate">
                  {selectedMonitor?.isCustom
                    ? selectedMonitor.displayName
                    : "Definir Marca, Modelo e Polegadas"}
                </h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  {selectedMonitor?.isCustom
                    ? `VESA: ${selectedMonitor.vesaPattern} • Clique para editar`
                    : "Usinagem CNC personalizada para qualquer tela"}
                </p>
              </div>
            </div>

            <div
              className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                selectedMonitor?.isCustom
                  ? "border-[#0071e3] bg-[#0071e3] text-white shadow-sm"
                  : "border-indigo-400/40 bg-white dark:bg-slate-900 text-indigo-500"
              }`}
            >
              {selectedMonitor?.isCustom ? <Check className="w-3 h-3 stroke-[3]" /> : <Edit3 className="w-2.5 h-2.5" />}
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
