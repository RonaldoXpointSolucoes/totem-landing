"use client";

import React, { useState } from "react";
import { MonitorOption, KitSubItem } from "@/types/catalog";
import { Modal } from "@/components/ui";
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
  PauseCircle,
  ShieldCheck,
  Info,
  Maximize2,
  Cpu,
} from "lucide-react";

interface StepKitProps {
  kitMonitor: MonitorOption;
  availableKits?: MonitorOption[];
  onSelectKitOption?: (kitMon: MonitorOption) => void;
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
 * Rota do Kit de Montagem:
 * - Suporta múltiplos Kits no catálogo (ex: Kit Grasep 21,5" Touch i7 disponível vs Kit Aytek 24" com PC pausado).
 * - Respeita itens pausados (sem estoque): bloqueia seleção, exibe motivo e oferece troca rápida para Kit disponível.
 * - Destaca fotos, ficha técnica completa, aviso de Windows Trial e garantia de 3 meses.
 * - Só solicita escolha de Monitor/Impressora para recorte CNC caso o item correspondente não esteja ativo no Kit.
 */
export const StepKit: React.FC<StepKitProps> = ({
  kitMonitor,
  availableKits = [],
  onSelectKitOption,
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
  const [inspectedSubItem, setInspectedSubItem] = useState<KitSubItem | null>(null);

  const kitItems = React.useMemo(() => getEffectiveKitItems(kitMonitor), [kitMonitor]);
  const mainEquipment = React.useMemo(
    () =>
      kitItems.filter(
        (i) =>
          i.category === "monitor" ||
          i.id === "kit-monitor-touch" ||
          i.id.startsWith("kit-monitor") ||
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
          !i.id.startsWith("kit-monitor") &&
          i.category !== "printer" &&
          i.id !== "KIT-IMP-001"
      ),
    [kitItems]
  );

  const hasMonitorInKit = doesKitIncludeMonitor(kitItems);
  const hasPrinterInKit = doesKitIncludePrinter(kitItems);
  const activeCount = kitItems.filter((i) => i.selected !== false && !i.paused).length;
  const activeAccessoriesCount = accessories.filter((i) => i.selected !== false && !i.paused).length;
  const kitTotalCents = calculateKitTotalCents(kitItems);
  const accessoriesTotalCents = accessories
    .filter((i) => i.selected !== false && !i.paused)
    .reduce((acc, item) => acc + Math.max(0, item.priceCents || 0), 0);

  const firstAvailableOtherKit = React.useMemo(() => {
    return availableKits.find(
      (k) => k.id !== kitMonitor.id && doesKitIncludeMonitor(getEffectiveKitItems(k))
    );
  }, [availableKits, kitMonitor.id]);

  const handleToggleItem = (itemId: string) => {
    const target = kitItems.find((i) => i.id === itemId);
    if (target?.paused) return;

    const nextItems = kitItems.map((item) =>
      item.id === itemId ? { ...item, selected: !item.selected } : item
    );
    const nextActiveCount = nextItems.filter((i) => i.selected !== false && !i.paused).length;
    if (nextActiveCount === 0) {
      onSwitchToCabinet();
      return;
    }
    onUpdateKitItems(nextItems);
  };

  const handleRestoreDefaults = () => {
    const restored = kitItems.map((item) => ({
      ...item,
      selected: item.paused ? false : true,
    }));
    onUpdateKitItems(restored);
  };

  return (
    <div className="space-y-4">
      {/* Cabeçalho da Rota Kit */}
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

      {/* SEÇÃO 0: Seletor entre Versões de Kit (exibido quando há 2+ Kits no catálogo) */}
      {availableKits.length > 1 && onSelectKitOption && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-black/10 dark:border-slate-800 shadow-xs space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-xs sm:text-sm font-black text-[#1d1d1f] dark:text-white flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-[#0071e3] shrink-0" />
                <span>Escolha a Versão do Kit de Montagem</span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Compare os computadores All-in-One disponíveis para compor o Kit do seu Totem.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {availableKits.map((kitOpt) => {
              const isSelected = kitOpt.id === kitMonitor.id;
              const optItems = getEffectiveKitItems(kitOpt);
              const optHasAvailableMon = doesKitIncludeMonitor(optItems);
              const optPausedMon = optItems.find(
                (i) =>
                  (i.category === "monitor" || i.id === "kit-monitor-touch" || i.id.startsWith("kit-monitor")) &&
                  i.paused
              );
              const optActiveMon = optItems.find(
                (i) =>
                  (i.category === "monitor" || i.id === "kit-monitor-touch" || i.id.startsWith("kit-monitor")) &&
                  !i.paused
              );
              const optTotalCents = calculateKitTotalCents(optItems);

              return (
                <button
                  key={kitOpt.id}
                  type="button"
                  onClick={() => onSelectKitOption(kitOpt)}
                  aria-pressed={isSelected}
                  className={`text-left p-3 rounded-xl border-2 transition-all active:scale-[0.985] cursor-pointer flex items-start gap-3 ${
                    isSelected
                      ? optHasAvailableMon
                        ? "bg-blue-50/50 dark:bg-indigo-950/35 border-[#0071e3] ring-2 ring-[#0071e3]/20 shadow-xs"
                        : "bg-amber-50/60 dark:bg-amber-950/25 border-amber-500 ring-2 ring-amber-500/20 shadow-xs"
                      : optHasAvailableMon
                      ? "bg-slate-50/70 dark:bg-slate-950/40 border-black/10 dark:border-slate-800 hover:border-[#0071e3]/60"
                      : "bg-slate-50/50 dark:bg-slate-950/30 border-amber-300/60 dark:border-amber-800/50 opacity-85 hover:opacity-100"
                  }`}
                >
                  <div className="w-12 h-12 rounded-xl border border-black/10 dark:border-slate-700 bg-white dark:bg-slate-950 p-1 shrink-0 flex items-center justify-center overflow-hidden">
                    {kitOpt.image ? (
                      <img
                        src={kitOpt.image}
                        alt={kitOpt.displayName}
                        className="w-full h-full object-contain"
                        loading="lazy"
                      />
                    ) : (
                      <Boxes className="w-5 h-5 text-[#0071e3]" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-1.5 flex-wrap">
                      {optHasAvailableMon ? (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
                          ✓ Disponível
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/35">
                          <PauseCircle className="w-2.5 h-2.5" />
                          PC Pausado / Sem Estoque
                        </span>
                      )}

                      <span className="text-[11px] font-black text-[#0071e3] dark:text-cyan-400">
                        + {formatBRL(optTotalCents)}
                      </span>
                    </div>

                    <h4 className="text-xs font-black text-[#1d1d1f] dark:text-white leading-snug">
                      {kitOpt.displayName}
                    </h4>

                    {optActiveMon ? (
                      <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-snug">
                        PC: <strong>{formatBRL(optActiveMon.priceCents)}</strong>
                        {optActiveMon.osNotice || optActiveMon.warrantyInfo
                          ? ` • ${[optActiveMon.osNotice ? "Windows Trial" : null, optActiveMon.warrantyInfo ? `Garantia ${optActiveMon.warrantyInfo}` : null].filter(Boolean).join(" • ")}`
                          : ""}
                      </p>
                    ) : optPausedMon ? (
                      <p className="text-[10px] font-semibold text-amber-800 dark:text-amber-300 leading-snug">
                        {optPausedMon.pausedReason || "PC AIO deste kit está pausado por falta de estoque."}
                      </p>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* SEÇÃO 1: Equipamentos Principais Inclusos no Kit */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-black/10 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-xs sm:text-sm font-black text-[#1d1d1f] dark:text-white">
              1. Equipamentos Principais do Kit
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Confira fotos, garantia e detalhes. Se remover algum item, pediremos seu modelo para o corte CNC grátis (+ R$ 0,00).
            </p>
          </div>
          <span className="text-[11px] font-extrabold text-[#0071e3] dark:text-cyan-400">
            {activeCount} de {kitItems.length} itens ativos •{" "}
            {formatBRL(cabinetBasePixCents + kitTotalCents)} no PIX
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {mainEquipment.map((sub) => {
            const isMonitor =
              sub.category === "monitor" ||
              sub.id === "kit-monitor-touch" ||
              sub.id.startsWith("kit-monitor");
            const isPaused = Boolean(sub.paused);
            const isIncluded = !isPaused && sub.selected !== false;
            const Icon = isMonitor ? Tv : Printer;

            return (
              <div
                key={sub.id}
                className={`p-3.5 rounded-xl border-2 transition-all flex flex-col justify-between gap-3 ${
                  isPaused
                    ? "bg-amber-50/70 dark:bg-amber-950/25 border-amber-400/70 dark:border-amber-700/80"
                    : isIncluded
                    ? "bg-blue-50/40 dark:bg-indigo-950/25 border-[#0071e3] shadow-2xs"
                    : "bg-amber-50/60 dark:bg-amber-950/20 border-amber-400/60 dark:border-amber-700"
                }`}
              >
                <div className="space-y-2.5">
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => setInspectedSubItem(sub)}
                      className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl border border-black/10 dark:border-slate-700 bg-white dark:bg-slate-950 p-1 flex items-center justify-center shrink-0 overflow-hidden relative group cursor-pointer"
                      title="Ampliar foto e ver especificações completas"
                    >
                      {sub.image && sub.image !== ".webp" ? (
                        <img
                          src={sub.image}
                          alt={sub.name}
                          className={`w-full h-full object-contain transition-transform group-hover:scale-105 ${
                            isPaused ? "opacity-55 grayscale" : ""
                          }`}
                          loading="lazy"
                        />
                      ) : (
                        <Icon className="w-6 h-6 text-[#0071e3]" />
                      )}
                      <span className="absolute bottom-1 right-1 w-4 h-4 rounded-md bg-black/60 text-white flex items-center justify-center opacity-80 group-hover:opacity-100">
                        <Maximize2 className="w-2.5 h-2.5" />
                      </span>
                    </button>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-1.5 flex-wrap">
                        {isPaused ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500 text-white shadow-2xs">
                            <PauseCircle className="w-3 h-3" />
                            <span>Pausado • Sem Estoque</span>
                          </span>
                        ) : (
                          <span
                            className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                              isIncluded
                                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                                : "bg-amber-500/20 text-amber-800 dark:text-amber-300"
                            }`}
                          >
                            {isIncluded ? "✓ Incluso no Kit" : "Removido do Kit"}
                          </span>
                        )}

                        <span
                          className={`text-xs font-black shrink-0 ${
                            isPaused
                              ? "text-amber-700 dark:text-amber-300"
                              : "text-[#0071e3] dark:text-cyan-400"
                          }`}
                        >
                          {isPaused
                            ? "Indisponível"
                            : isIncluded
                            ? `+ ${formatBRL(sub.priceCents)}`
                            : "R$ 0,00"}
                        </span>
                      </div>

                      <h4
                        className={`text-xs sm:text-sm font-extrabold leading-snug ${
                          isPaused
                            ? "text-slate-600 dark:text-slate-300 line-through decoration-amber-500/60"
                            : "text-[#1d1d1f] dark:text-white"
                        }`}
                      >
                        {sub.name}
                      </h4>

                      {isPaused ? (
                        <p className="text-[11px] font-semibold text-amber-800 dark:text-amber-300 leading-snug">
                          {sub.pausedReason || "Equipamento temporariamente sem estoque para seleção."}
                        </p>
                      ) : !isIncluded ? (
                        <p className="text-[10px] font-semibold text-amber-800 dark:text-amber-300 leading-snug">
                          {isMonitor
                            ? selectedCutoutMonitorName
                              ? `Recorte selecionado: ${selectedCutoutMonitorName}`
                              : "Perguntaremos seu monitor na próxima tela (corte grátis)."
                            : selectedCutoutPrinterName
                            ? `Recorte selecionado: ${selectedCutoutPrinterName}`
                            : "Perguntaremos sua impressora na próxima tela (rasgo grátis)."}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  {/* Chips resumidos + Avisos obrigatórios (Windows Trial e Garantia 3 meses) */}
                  {!isPaused && (sub.osNotice || sub.warrantyInfo || (sub.specs && sub.specs.length > 0)) && (
                    <div className="space-y-1.5">
                      {sub.specs && sub.specs.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {sub.specs.slice(0, 4).map((sp, spIdx) => (
                            <span
                              key={spIdx}
                              className="px-2 py-0.5 rounded-md bg-white/90 dark:bg-slate-950 border border-black/10 dark:border-slate-800 text-[10px] font-semibold text-slate-700 dark:text-slate-300"
                            >
                              {sp.replace(/^(Tela|Processador|Memória RAM|Armazenamento Híbrido|Marca \/ Linha):\s*/i, "")}
                            </span>
                          ))}
                        </div>
                      )}

                      {(sub.osNotice || sub.warrantyInfo) && (
                        <div className="p-2 rounded-lg bg-amber-50/90 dark:bg-amber-950/35 border border-amber-300/80 dark:border-amber-700/70 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-bold text-amber-900 dark:text-amber-200">
                          {sub.osNotice && (
                            <span className="inline-flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                              <span>{sub.osNotice}</span>
                            </span>
                          )}
                          {sub.warrantyInfo && (
                            <span className="inline-flex items-center gap-1 text-emerald-800 dark:text-emerald-300">
                              <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              <span>Garantia: {sub.warrantyInfo}</span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Ações do card do equipamento */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-black/5 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setInspectedSubItem(sub)}
                    className="min-h-[38px] px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Info className="w-3.5 h-3.5 text-[#0071e3] shrink-0" />
                    <span>Fotos e Ficha</span>
                  </button>

                  {isPaused ? (
                    firstAvailableOtherKit && onSelectKitOption ? (
                      <button
                        type="button"
                        onClick={() => onSelectKitOption(firstAvailableOtherKit)}
                        className="flex-1 min-h-[38px] px-3 py-1.5 rounded-lg bg-[#0071e3] hover:bg-[#0077ed] text-white text-[11px] font-bold transition-all active:scale-[0.98] cursor-pointer shadow-xs"
                      >
                        Usar Kit Grasep Disponível →
                      </button>
                    ) : (
                      <span className="flex-1 min-h-[38px] px-3 py-1.5 rounded-lg bg-amber-100/80 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 text-[11px] font-bold flex items-center justify-center cursor-not-allowed">
                        Indisponível no estoque
                      </span>
                    )
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleToggleItem(sub.id)}
                      aria-pressed={isIncluded}
                      className={`flex-1 min-h-[38px] px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all active:scale-[0.98] cursor-pointer ${
                        isIncluded
                          ? "bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-700 dark:text-slate-200 hover:text-rose-600 border border-black/10 dark:border-slate-700"
                          : "bg-[#0071e3] hover:bg-[#0077ed] text-white shadow-xs"
                      }`}
                    >
                      {isIncluded ? "Já tenho — remover do Kit" : "Incluir novamente no Kit"}
                    </button>
                  )}

                  {!isPaused && !isIncluded && isMonitor && selectedCutoutMonitorName && onJumpToCutoutMonitor && (
                    <button
                      type="button"
                      onClick={onJumpToCutoutMonitor}
                      className="min-h-[38px] px-2.5 py-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 text-[11px] font-bold cursor-pointer"
                    >
                      Alterar tela
                    </button>
                  )}

                  {!isPaused && !isIncluded && !isMonitor && selectedCutoutPrinterName && onJumpToCutoutPrinter && (
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
                ? "Sem Monitor e sem Impressora ativos neste Kit. Ao clicar em Continuar, solicitaremos os seus modelos para furação/rasgo CNC grátis (+ R$ 0,00)."
                : !hasMonitorInKit
                ? "Sem Monitor ativo neste Kit (pausado ou removido). Ao clicar em Continuar, perguntaremos o modelo do seu monitor para a furação CNC grátis (+ R$ 0,00) — ou troque acima para o Kit Grasep disponível."
                : "Impressora removida do Kit. Ao clicar em Continuar, perguntaremos apenas o modelo da sua impressora para o rasgo CNC grátis (+ R$ 0,00)."}
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
                <span className="font-black text-amber-600 dark:text-amber-400">
                  + {formatBRL(ASSEMBLY_SERVICE_PRICE_CENTS)} no PIX
                </span>
                <span className="text-[10px] text-slate-500 block leading-tight">
                  ou 1x {formatBRL(simulateMercadoPagoCardBreakdown(ASSEMBLY_SERVICE_PRICE_CENTS).safeCardChargeCents)} · ~10x{" "}
                  {formatBRL(simulateMercadoPagoCardBreakdown(ASSEMBLY_SERVICE_PRICE_CENTS).buyer10xInstallmentCents)} (MP)
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
                {accessories.map((sub) => {
                  const isAccPaused = Boolean(sub.paused);
                  const isAccActive = !isAccPaused && sub.selected !== false;
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      disabled={isAccPaused}
                      onClick={() => handleToggleItem(sub.id)}
                      aria-pressed={isAccActive}
                      className={`min-h-[42px] px-3 py-2 rounded-xl border text-left text-[11px] flex items-center justify-between gap-2 transition-all ${
                        isAccPaused
                          ? "bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 text-amber-800 dark:text-amber-300 opacity-75 cursor-not-allowed"
                          : isAccActive
                          ? "bg-white dark:bg-slate-900 border-blue-200 dark:border-indigo-800 text-[#1d1d1f] dark:text-slate-100 shadow-2xs active:scale-[0.985] cursor-pointer"
                          : "bg-slate-100/80 dark:bg-slate-950/40 border-black/5 text-slate-400 line-through active:scale-[0.985] cursor-pointer"
                      }`}
                    >
                      <span className="flex items-center gap-2 min-w-0 font-semibold">
                        <span
                          className={`w-4 h-4 rounded flex items-center justify-center shrink-0 text-[10px] font-black ${
                            isAccPaused
                              ? "bg-amber-500 text-white"
                              : isAccActive
                              ? "bg-[#0071e3] text-white"
                              : "border border-slate-300 dark:border-slate-700"
                          }`}
                        >
                          {isAccPaused ? "⏸" : isAccActive ? "✓" : ""}
                        </span>
                        <span className="truncate">{sub.name}</span>
                      </span>
                      <span
                        className={`font-black shrink-0 ${
                          isAccPaused
                            ? "text-amber-700 dark:text-amber-300"
                            : "text-[#0071e3] dark:text-cyan-400"
                        }`}
                      >
                        {isAccPaused ? "Pausado" : isAccActive ? `+${formatBRL(sub.priceCents)}` : "Removido"}
                      </span>
                    </button>
                  );
                })}
              </div>

              {activeCount < kitItems.filter((i) => !i.paused).length && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleRestoreDefaults}
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#0071e3] hover:underline cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Restaurar itens disponíveis do Kit
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* MODAL DETALHADO DE FOTOS, ESPECIFICAÇÕES, WINDOWS TRIAL & GARANTIA */}
      <Modal
        isOpen={Boolean(inspectedSubItem)}
        onClose={() => setInspectedSubItem(null)}
        title={inspectedSubItem?.name || "Detalhes do Equipamento"}
        description={
          inspectedSubItem?.paused
            ? `Indisponível no momento • ${inspectedSubItem.pausedReason || "Sem estoque"}`
            : `Componente integrante do ${kitMonitor.displayName}`
        }
        className="max-w-2xl sm:max-w-2xl p-4 sm:p-6"
      >
        {inspectedSubItem && (
          <div className="space-y-4 text-xs sm:text-sm text-slate-700 dark:text-slate-300 max-h-[75vh] overflow-y-auto pr-1">
            {/* Cabeçalho visual: Foto ampliada + Status e Valor */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-black/10 dark:border-slate-800">
              <div className="sm:col-span-5 aspect-square rounded-xl bg-white dark:bg-slate-900 border border-black/10 dark:border-slate-800 p-3 flex items-center justify-center overflow-hidden">
                {inspectedSubItem.image && inspectedSubItem.image !== ".webp" ? (
                  <img
                    src={inspectedSubItem.image}
                    alt={inspectedSubItem.name}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <Package className="w-12 h-12 text-[#0071e3]" />
                )}
              </div>

              <div className="sm:col-span-7 space-y-2.5">
                <div className="flex items-center gap-2 flex-wrap">
                  {inspectedSubItem.paused ? (
                    <span className="px-2.5 py-1 rounded-full bg-amber-500 text-white text-[10px] font-black uppercase">
                      ⏸ Pausado • Sem Estoque
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-black uppercase border border-emerald-500/25">
                      ✓ Disponível para o Kit
                    </span>
                  )}
                  <span className="text-base sm:text-lg font-black text-[#0071e3] dark:text-cyan-400">
                    {inspectedSubItem.paused ? "Indisponível" : formatBRL(inspectedSubItem.priceCents)}
                  </span>
                </div>

                {/* Avisos Obrigatórios em Destaque (Windows Trial + Garantia 3 meses) */}
                {(inspectedSubItem.osNotice || inspectedSubItem.warrantyInfo) && (
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 space-y-1.5 text-xs">
                    {inspectedSubItem.osNotice && (
                      <div className="flex items-start gap-2 font-bold text-amber-900 dark:text-amber-200">
                        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <span>Sistema Operacional: {inspectedSubItem.osNotice}</span>
                      </div>
                    )}
                    {inspectedSubItem.warrantyInfo && (
                      <div className="flex items-start gap-2 font-bold text-emerald-800 dark:text-emerald-300">
                        <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <span>Garantia: {inspectedSubItem.warrantyInfo}</span>
                      </div>
                    )}
                  </div>
                )}

                {inspectedSubItem.description && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-line">
                    {inspectedSubItem.description}
                  </p>
                )}
              </div>
            </div>

            {/* Grade Estruturada de Especificações Técnicas */}
            {Array.isArray(inspectedSubItem.specs) && inspectedSubItem.specs.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-[#1d1d1f] dark:text-white">
                  Ficha Técnica Completa
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {inspectedSubItem.specs.map((specLine, idx) => {
                    const colonIdx = specLine.indexOf(":");
                    const hasLabel = colonIdx > 0 && colonIdx < 38;
                    const label = hasLabel ? specLine.slice(0, colonIdx).trim() : null;
                    const val = hasLabel ? specLine.slice(colonIdx + 1).trim() : specLine;
                    return (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-black/10 dark:border-slate-800 text-xs"
                      >
                        {label && (
                          <span className="text-[10px] font-black uppercase tracking-wider text-[#0071e3] dark:text-cyan-400 block">
                            {label}
                          </span>
                        )}
                        <span className="font-semibold text-[#1d1d1f] dark:text-slate-100">{val}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setInspectedSubItem(null)}
                className="min-h-[42px] px-5 py-2 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-bold cursor-pointer transition-all"
              >
                Fechar Detalhes
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
