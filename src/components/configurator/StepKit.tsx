"use client";

import React, { useState } from "react";
import { MonitorOption, KitSubItem } from "@/types/catalog";
import {
  getEffectiveKitItems,
  calculateKitTotalCents,
  doesKitIncludeMonitor,
  doesKitIncludePrinter,
} from "@/modules/catalog/kitDefaults";
import {
  formatBRL,
  ASSEMBLY_SERVICE_PRICE_CENTS,
  simulateMercadoPagoCardBreakdown,
} from "@/modules/pricing/pricingEngine";
import {
  Boxes,
  Check,
  ChevronDown,
  ChevronUp,
  Package,
  Printer,
  RotateCcw,
  SlidersHorizontal,
  Tv,
  Wrench,
  ArrowLeftRight,
  AlertTriangle,
} from "lucide-react";

interface StepKitProps {
  kitMonitor: MonitorOption;
  cabinetName: string;
  cabinetBasePixCents: number;
  includeAssemblyService: boolean;
  onToggleAssemblyService: (include: boolean) => void;
  onUpdateKitItems: (updatedItems: KitSubItem[]) => void;
  onSwitchToCabinet: () => void;
  selectedCutoutMonitorName?: string | null;
  selectedCutoutPrinterName?: string | null;
  onJumpToCutoutMonitor?: () => void;
  onJumpToCutoutPrinter?: () => void;
}

/**
 * Rota do Kit de Montagem (Etapa focada pós-decisão):
 * - Deixa claro que Monitor Touch e Impressora já vêm no Kit.
 * - Só solicita escolha de Monitor/Impressora se o cliente remover esses itens do Kit.
 * - Permite definir de forma clara se prefere receber em peças (R$ 0,00) ou 100% Montado de Fábrica (+ R$ 999,00).
 */
export const StepKit: React.FC<StepKitProps> = ({
  kitMonitor,
  cabinetName,
  cabinetBasePixCents,
  includeAssemblyService,
  onToggleAssemblyService,
  onUpdateKitItems,
  onSwitchToCabinet,
  selectedCutoutMonitorName,
  selectedCutoutPrinterName,
  onJumpToCutoutMonitor,
  onJumpToCutoutPrinter,
}) => {
  const [isAccessoriesOpen, setIsAccessoriesOpen] = useState(false);

  const kitItems = React.useMemo(() => getEffectiveKitItems(kitMonitor), [kitMonitor]);
  const mainEquipment = React.useMemo(
    () =>
      kitItems.filter(
        (i) =>
          i.category === "monitor" ||
          i.id === "kit-monitor-touch" ||
          i.category === "printer" ||
          i.id === "KIT-IMP-001"
      ),
    [kitItems]
  );
  const accessories = React.useMemo(
    () =>
      kitItems.filter(
        (i) =>
          i.category !== "monitor" &&
          i.id !== "kit-monitor-touch" &&
          i.category !== "printer" &&
          i.id !== "KIT-IMP-001"
      ),
    [kitItems]
  );

  const hasMonitorInKit = doesKitIncludeMonitor(kitItems);
  const hasPrinterInKit = doesKitIncludePrinter(kitItems);
  const activeCount = kitItems.filter((i) => i.selected).length;
  const activeAccessoriesCount = accessories.filter((i) => i.selected).length;
  const kitTotalCents = calculateKitTotalCents(kitItems);
  const accessoriesTotalCents = accessories
    .filter((i) => i.selected)
    .reduce((acc, item) => acc + Math.max(0, item.priceCents || 0), 0);

  const handleToggleItem = (itemId: string) => {
    const nextItems = kitItems.map((item) =>
      item.id === itemId ? { ...item, selected: !item.selected } : item
    );
    const nextActiveCount = nextItems.filter((i) => i.selected).length;
    if (nextActiveCount === 0) {
      onSwitchToCabinet();
      return;
    }
    onUpdateKitItems(nextItems);
  };

  const handleRestoreDefaults = () => {
    const restored = kitItems.map((item) => ({ ...item, selected: true }));
    onUpdateKitItems(restored);
  };

  return (
    <div className="space-y-4">
      {/* Cabeçalho com indicação clara da Rota Kit + atalho para trocar modalidade */}
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-indigo-950/60 border border-blue-200 dark:border-indigo-800 text-[#0071e3] dark:text-cyan-300 text-[10px] font-black uppercase tracking-wider">
            <Boxes className="w-3 h-3" />
            Rota Kit Completo • + {formatBRL(kitTotalCents)}
          </span>

          <button
            type="button"
            onClick={onSwitchToCabinet}
            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-black/10 dark:border-slate-700 text-[11px] font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowLeftRight className="w-3 h-3" />
            <span>Quero Apenas o Gabinete</span>
          </button>
        </div>

        <h2 className="text-lg sm:text-2xl font-black text-[#1d1d1f] dark:text-white tracking-tight">
          Personalize seu Kit de Montagem e Entrega
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
          O <strong>Monitor Touch</strong> e a <strong>Impressora Térmica</strong> já fazem parte do Kit para o seu{" "}
          <strong>{cabinetName}</strong>. Só desmarque algum item se você já o possuir.
        </p>
      </div>

      {/* SEÇÃO 1: Equipamentos Principais Inclusos no Kit */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-black/10 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-xs sm:text-sm font-black text-[#1d1d1f] dark:text-white">
              1. Equipamentos Principais do Kit
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Se remover algum equipamento abaixo, pediremos o seu modelo no próximo passo para o corte CNC exato (+ R$ 0,00).
            </p>
          </div>
          <span className="text-[11px] font-extrabold text-[#0071e3] dark:text-cyan-400">
            {activeCount} de {kitItems.length} itens no Kit •{" "}
            {formatBRL(cabinetBasePixCents + kitTotalCents)} no PIX
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {mainEquipment.map((sub) => {
            const isMonitor = sub.category === "monitor" || sub.id === "kit-monitor-touch";
            const Icon = isMonitor ? Tv : Printer;

            return (
              <div
                key={sub.id}
                className={`p-3 rounded-xl border-2 transition-all flex flex-col justify-between gap-2.5 ${
                  sub.selected
                    ? "bg-blue-50/40 dark:bg-indigo-950/25 border-[#0071e3] shadow-2xs"
                    : "bg-amber-50/60 dark:bg-amber-950/20 border-amber-400/60 dark:border-amber-700"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="w-11 h-11 rounded-xl border border-black/10 dark:border-slate-700 bg-white dark:bg-slate-950 p-1 flex items-center justify-center shrink-0 overflow-hidden">
                    {sub.image && sub.image !== ".webp" ? (
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

                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center justify-between gap-1.5">
                      <span
                        className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          sub.selected
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                            : "bg-amber-500/20 text-amber-800 dark:text-amber-300"
                        }`}
                      >
                        {sub.selected ? "✓ Incluso no Kit" : "Removido do Kit"}
                      </span>
                      <span className="text-xs font-black text-[#0071e3] dark:text-cyan-400 shrink-0">
                        {sub.selected ? `+ ${formatBRL(sub.priceCents)}` : "R$ 0,00"}
                      </span>
                    </div>

                    <h4 className="text-xs font-extrabold text-[#1d1d1f] dark:text-white leading-snug">
                      {sub.name}
                    </h4>

                    {!sub.selected && (
                      <p className="text-[10px] font-semibold text-amber-800 dark:text-amber-300 leading-snug">
                        {isMonitor
                          ? selectedCutoutMonitorName
                            ? `Recorte selecionado: ${selectedCutoutMonitorName}`
                            : "Perguntaremos seu monitor na próxima tela (corte grátis)."
                          : selectedCutoutPrinterName
                          ? `Recorte selecionado: ${selectedCutoutPrinterName}`
                          : "Perguntaremos sua impressora na próxima tela (rasgo grátis)."}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1.5 border-t border-black/5 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => handleToggleItem(sub.id)}
                    aria-pressed={sub.selected}
                    className={`flex-1 min-h-[38px] px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all active:scale-[0.98] cursor-pointer ${
                      sub.selected
                        ? "bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-700 dark:text-slate-200 hover:text-rose-600 border border-black/10 dark:border-slate-700"
                        : "bg-[#0071e3] hover:bg-[#0077ed] text-white shadow-xs"
                    }`}
                  >
                    {sub.selected ? "Já tenho — remover do Kit" : "Incluir novamente no Kit"}
                  </button>

                  {!sub.selected && isMonitor && selectedCutoutMonitorName && onJumpToCutoutMonitor && (
                    <button
                      type="button"
                      onClick={onJumpToCutoutMonitor}
                      className="min-h-[38px] px-2.5 py-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 text-[11px] font-bold cursor-pointer"
                    >
                      Alterar tela
                    </button>
                  )}

                  {!sub.selected && !isMonitor && selectedCutoutPrinterName && onJumpToCutoutPrinter && (
                    <button
                      type="button"
                      onClick={onJumpToCutoutPrinter}
                      className="min-h-[38px] px-2.5 py-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 text-[11px] font-bold cursor-pointer"
                    >
                      Alterar imp.
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Status automático dos próximos passos */}
        {hasMonitorInKit && hasPrinterInKit ? (
          <div className="px-3 py-2 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-2 text-[11px] text-emerald-800 dark:text-emerald-200 font-semibold">
            <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>
              Monitor Touch e Impressora Térmica já estão no Kit — após escolher como quer receber abaixo, você irá direto para a Revisão Final!
            </span>
          </div>
        ) : (
          <div className="px-3 py-2 rounded-xl bg-amber-50/90 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700 flex items-start gap-2 text-[11px] text-amber-900 dark:text-amber-200 font-semibold">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <span>
              {!hasMonitorInKit && !hasPrinterInKit
                ? "Você desmarcou Monitor e Impressora do Kit. Ao clicar em Continuar, solicitaremos os modelos para furação/rasgo CNC grátis (+ R$ 0,00)."
                : !hasMonitorInKit
                ? "Você desmarcou o Monitor do Kit. Ao clicar em Continuar, perguntaremos apenas o modelo do seu monitor para a furação CNC grátis (+ R$ 0,00)."
                : "Você desmarcou a Impressora do Kit. Ao clicar em Continuar, perguntaremos apenas o modelo da sua impressora para o rasgo CNC grátis (+ R$ 0,00)."}
            </span>
          </div>
        )}
      </div>

      {/* SEÇÃO 2: Tipo de Entrega / Montagem (Exclusivo do Kit) */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-black/10 dark:border-slate-800 shadow-xs space-y-3">
        <div>
          <h3 className="text-xs sm:text-sm font-black text-[#1d1d1f] dark:text-white flex items-center gap-1.5">
            <Wrench className="w-4 h-4 text-amber-500 shrink-0" />
            <span>2. Como você deseja receber o seu Totem?</span>
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Escolha entre montar no local com nosso manual ou receber tudo já montado e testado de fábrica.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => onToggleAssemblyService(false)}
            aria-pressed={!includeAssemblyService}
            className={`text-left p-3.5 rounded-xl border-2 transition-all active:scale-[0.985] cursor-pointer flex flex-col justify-between gap-2.5 ${
              !includeAssemblyService
                ? "bg-blue-50/40 dark:bg-indigo-950/30 border-[#0071e3] ring-2 ring-[#0071e3]/20 shadow-xs"
                : "bg-slate-50/80 dark:bg-slate-950/40 border-black/10 dark:border-slate-800 hover:border-black/25"
            }`}
          >
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-black text-[#1d1d1f] dark:text-white flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>Montar por Conta Própria</span>
                </span>
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                    !includeAssemblyService
                      ? "bg-[#0071e3] text-white"
                      : "border border-slate-400 dark:border-slate-600"
                  }`}
                >
                  {!includeAssemblyService && <Check className="w-3 h-3 stroke-[3]" />}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                Enviamos o gabinete usinado e as peças do Kit lacradas com parafusos e guia de montagem.
              </p>
            </div>
            <div className="pt-2 border-t border-black/5 dark:border-slate-800 flex items-center justify-between text-[11px] w-full">
              <span className="text-slate-500 font-semibold">Mão de obra:</span>
              <span className="font-black text-emerald-600 dark:text-emerald-400">Incluso (R$ 0,00)</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onToggleAssemblyService(true)}
            aria-pressed={includeAssemblyService}
            className={`text-left p-3.5 rounded-xl border-2 transition-all active:scale-[0.985] cursor-pointer flex flex-col justify-between gap-2.5 ${
              includeAssemblyService
                ? "bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-white dark:from-amber-950/40 dark:to-slate-900 border-amber-500 ring-2 ring-amber-500/25 shadow-sm"
                : "bg-slate-50/80 dark:bg-slate-950/40 border-black/10 dark:border-slate-800 hover:border-amber-400"
            }`}
          >
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-black text-[#1d1d1f] dark:text-white flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>Totem 100% Montado de Fábrica</span>
                </span>
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                    includeAssemblyService
                      ? "bg-amber-500 text-white"
                      : "border border-slate-400 dark:border-slate-600"
                  }`}
                >
                  {includeAssemblyService && <Check className="w-3 h-3 stroke-[3]" />}
                </span>
              </div>
              <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-snug">
                Nossa engenharia monta tudo, organiza chicote elétrico e testa em bancada. <strong>É só ligar na tomada!</strong>
              </p>
            </div>
            <div className="pt-2 border-t border-black/5 dark:border-slate-800 flex items-center justify-between text-[11px] w-full">
              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-800 dark:text-amber-300 text-[10px] font-extrabold uppercase">
                Plug &amp; Play
              </span>
              <div className="text-right">
                <span className="font-black text-amber-600 dark:text-amber-400">+ {formatBRL(ASSEMBLY_SERVICE_PRICE_CENTS)} no PIX</span>
                <span className="text-[10px] text-slate-500 block leading-tight">
                  ou 1x {formatBRL(simulateMercadoPagoCardBreakdown(ASSEMBLY_SERVICE_PRICE_CENTS).safeCardChargeCents)} · ~10x {formatBRL(simulateMercadoPagoCardBreakdown(ASSEMBLY_SERVICE_PRICE_CENTS).buyer10xInstallmentCents)} (MP)
                </span>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* SEÇÃO 3: Acordeão Enxuto de Acessórios Elétricos, Ventilação e Fixação */}
      {accessories.length > 0 && (
        <div className="rounded-2xl bg-slate-50/90 dark:bg-slate-900/70 border border-black/10 dark:border-slate-800 overflow-hidden">
          <button
            type="button"
            onClick={() => setIsAccessoriesOpen((prev) => !prev)}
            aria-expanded={isAccessoriesOpen}
            className="w-full min-h-[48px] px-4 py-3 flex items-center justify-between gap-2 text-left hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#0071e3] shrink-0" />
                <span className="text-xs font-extrabold text-[#1d1d1f] dark:text-white">
                  3. Itens Elétricos, Coolers e Fixação ({activeAccessoriesCount}/{accessories.length} inclusos)
                </span>
                <span className="text-[10px] font-black text-[#0071e3] dark:text-cyan-400">
                  + {formatBRL(accessoriesTotalCents)}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                Coolers, Botão Liga/Desliga, Régua, Cabos, Parafusos, Organizador e Tomada C14
              </p>
            </div>

            <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-bold text-[#0071e3] dark:text-cyan-300">
              <span>{isAccessoriesOpen ? "Recolher" : "Personalizar"}</span>
              {isAccessoriesOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </span>
          </button>

          {isAccessoriesOpen && (
            <div className="px-4 pb-4 pt-2 border-t border-black/10 dark:border-slate-800 space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {accessories.map((sub) => (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => handleToggleItem(sub.id)}
                    aria-pressed={sub.selected}
                    className={`min-h-[42px] px-3 py-2 rounded-xl border text-left text-[11px] flex items-center justify-between gap-2 transition-all active:scale-[0.985] cursor-pointer ${
                      sub.selected
                        ? "bg-white dark:bg-slate-900 border-blue-200 dark:border-indigo-800 text-[#1d1d1f] dark:text-slate-100 shadow-2xs"
                        : "bg-slate-100/80 dark:bg-slate-950/40 border-black/5 text-slate-400 line-through"
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0 font-semibold">
                      <span
                        className={`w-4 h-4 rounded flex items-center justify-center shrink-0 text-[10px] font-black ${
                          sub.selected
                            ? "bg-[#0071e3] text-white"
                            : "border border-slate-300 dark:border-slate-700"
                        }`}
                      >
                        {sub.selected && "✓"}
                      </span>
                      <span className="truncate">{sub.name}</span>
                    </span>
                    <span className="font-black text-[#0071e3] dark:text-cyan-400 shrink-0">
                      {sub.selected ? `+${formatBRL(sub.priceCents)}` : "Removido"}
                    </span>
                  </button>
                ))}
              </div>

              {activeCount < kitItems.length && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleRestoreDefaults}
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#0071e3] hover:underline cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Restaurar todos os {kitItems.length} itens padrão do Kit
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
