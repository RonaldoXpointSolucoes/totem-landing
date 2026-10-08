"use client";

import React from "react";
import { CabinetModel, ColorOption, MonitorOption, PrinterOption, BarcodeReaderOption } from "@/types/catalog";
import { formatBRL, PriceBreakdown } from "@/modules/pricing/pricingEngine";
import { Card, Button, Badge } from "@/components/ui";
import { Edit3, ShoppingCart, ShieldCheck, Boxes, Check, PackageCheck, AlertCircle } from "lucide-react";
import { isItemKit, getEffectiveKitItems, calculateKitTotalCents } from "@/modules/catalog/kitDefaults";

interface StepReviewProps {
  model: CabinetModel;
  color: ColorOption;
  monitor: MonitorOption | null;
  printer: PrinterOption | null;
  reader: BarcodeReaderOption | null;
  useReader: boolean;
  pricing: PriceBreakdown;
  onEditStep: (stepNumber: number) => void;
  onAddToCart: () => void;
}

export const StepReview: React.FC<StepReviewProps> = ({
  model,
  color,
  monitor,
  printer,
  reader,
  useReader,
  pricing,
  onEditStep,
  onAddToCart,
}) => {
  const isKit = isItemKit(monitor);
  const kitItems = isKit ? (monitor?.kitItems || getEffectiveKitItems(monitor)) : [];
  const activeKitItems = kitItems.filter((i) => i.selected);
  const kitTotalCents = calculateKitTotalCents(kitItems);

  const printerSubItem = kitItems.find((i) => i.category === "printer");
  const readerSubItem = kitItems.find((i) => i.category === "reader");

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="text-center sm:text-left space-y-1">
        <h2 className="text-lg sm:text-2xl font-black text-[#1d1d1f] dark:text-white tracking-tight">
          Confira as especificações do seu Totem
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
          Esta será a ficha técnica exata de cortes e encaixes utilizada na Router CNC.
        </p>
      </div>

      {/* Ficha Técnica de Produção Otimizada em 2 Colunas */}
      <Card className="p-4 sm:p-5 rounded-2xl space-y-3.5">
        <div className="flex items-center justify-between pb-2.5 border-b border-black/10 dark:border-slate-800">
          <h3 className="text-sm sm:text-base font-black text-[#1d1d1f] dark:text-white flex items-center gap-2">
            <span>Ficha Técnica de Engenharia</span>
            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-500/20">
              100% Homologado CNC
            </span>
          </h3>
          <span className="text-xs font-semibold text-slate-500">
            {model.dimensions ? `${model.dimensions.heightMm}×${model.dimensions.widthMm}×${model.dimensions.depthMm} mm` : ""}
          </span>
        </div>

        {/* DETALHAMENTO DO KIT DE MONTAGEM SELECIONADO */}
        {isKit && (
          <div className="p-3 sm:p-4 rounded-xl bg-gradient-to-r from-blue-50/70 to-indigo-50/60 dark:from-indigo-950/40 dark:to-slate-900 border border-blue-200 dark:border-indigo-800/80 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#0071e3] text-white flex items-center justify-center">
                  <Boxes className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-[#1d1d1f] dark:text-white">
                    Pacote Hardware: Kit de Montagem
                  </h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    {activeKitItems.length} de {kitItems.length} componentes inclusos no pedido
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-black text-[#0071e3] dark:text-cyan-400">
                  {formatBRL(kitTotalCents)}
                </span>
                <button
                  onClick={() => onEditStep(3)}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 border border-black/10 dark:border-slate-700 text-[#0071e3] dark:text-cyan-300 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                  title="Personalizar componentes do Kit"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Personalizar Kit</span>
                </button>
              </div>
            </div>

            {/* Sub-itens listados com fotos e valores individuais */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-blue-100 dark:border-indigo-900/60">
              {kitItems.map((sub) => (
                <div
                  key={sub.id}
                  className={`p-2 rounded-lg border flex items-center justify-between gap-2 text-xs transition-all ${
                    sub.selected
                      ? "bg-white/90 dark:bg-slate-900/90 border-blue-200/80 dark:border-indigo-900 shadow-2xs"
                      : "bg-slate-50 dark:bg-slate-950/40 border-black/5 opacity-50"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {sub.image && (
                      <div className="w-8 h-8 rounded-md border border-black/10 bg-white p-0.5 shrink-0 flex items-center justify-center overflow-hidden">
                        <img src={sub.image} alt={sub.name} className="w-full h-full object-contain" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-bold text-[#1d1d1f] dark:text-white truncate text-[11px]">
                        {sub.name}
                      </p>
                      <span className="text-[10px] text-slate-500">
                        {sub.selected ? formatBRL(sub.priceCents) : "Removido do Kit"}
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {sub.selected ? (
                      <span className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px]">
                        ✓
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-semibold">—</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Grid de 2 Colunas com as Especificações de Montagem */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs">
          {/* Modelo */}
          <div className="py-1.5 flex items-center justify-between gap-2 border-b border-black/5 dark:border-slate-800/60">
            <span className="text-slate-500 font-medium">Modelo:</span>
            <div className="flex items-center gap-1.5 min-w-0">
              <strong className="text-[#1d1d1f] dark:text-white truncate">{model.name}</strong>
              <button
                onClick={() => onEditStep(1)}
                className="p-1 rounded-lg hover:bg-black/5 text-[#0071e3] transition-colors"
                title="Alterar Modelo"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Acabamento */}
          <div className="py-1.5 flex items-center justify-between gap-2 border-b border-black/5 dark:border-slate-800/60">
            <span className="text-slate-500 font-medium">Acabamento:</span>
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className="w-2.5 h-2.5 rounded-full border border-black/20 shrink-0"
                style={{ background: color.hexReference }}
              />
              <strong className="text-[#1d1d1f] dark:text-white truncate">{color.name} (15mm BP)</strong>
              <button
                onClick={() => onEditStep(2)}
                className="p-1 rounded-lg hover:bg-black/5 text-[#0071e3] transition-colors"
                title="Alterar Cor"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Monitor / Kit */}
          <div className="py-1.5 flex items-center justify-between gap-2 border-b border-black/5 dark:border-slate-800/60">
            <span className="text-slate-500 font-medium">
              {isKit ? "Equipamento Display:" : "Monitor Touch:"}
            </span>
            <div className="flex items-center gap-1.5 min-w-0">
              <strong className="text-[#1d1d1f] dark:text-white truncate max-w-[140px]">
                {isKit ? `Kit de Montagem (${activeKitItems.length} itens)` : monitor?.displayName || "—"}
              </strong>
              <button
                onClick={() => onEditStep(3)}
                className="p-1 rounded-lg hover:bg-black/5 text-[#0071e3] transition-colors"
                title="Alterar Monitor ou Kit"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Impressora */}
          <div className="py-1.5 flex items-center justify-between gap-2 border-b border-black/5 dark:border-slate-800/60">
            <span className="text-slate-500 font-medium">Impressora Térmica:</span>
            <div className="flex items-center gap-1.5 min-w-0">
              <strong className="text-[#1d1d1f] dark:text-white truncate max-w-[140px]">
                {isKit
                  ? (printerSubItem?.selected ? "Inclusa no Kit (80mm)" : "Não inclusa no Kit")
                  : printer?.displayName || "—"}
              </strong>
              <button
                onClick={() => onEditStep(isKit ? 3 : 4)}
                className="p-1 rounded-lg hover:bg-black/5 text-[#0071e3] transition-colors"
                title={isKit ? "Personalizar no Kit" : "Alterar Impressora"}
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Leitor */}
          <div className="py-1.5 flex items-center justify-between gap-2 border-b border-black/5 dark:border-slate-800/60">
            <span className="text-slate-500 font-medium">Janela de Leitor 2D:</span>
            <div className="flex items-center gap-1.5 min-w-0">
              <strong className="text-[#1d1d1f] dark:text-white truncate max-w-[140px]">
                {isKit
                  ? (readerSubItem?.selected ? "Incluso no Kit (2D QR Code)" : "Não incluso no Kit")
                  : (useReader ? reader?.displayName || "Sim" : "Sem leitor")}
              </strong>
              <button
                onClick={() => onEditStep(isKit ? 3 : 5)}
                className="p-1 rounded-lg hover:bg-black/5 text-[#0071e3] transition-colors"
                title={isKit ? "Personalizar no Kit" : "Alterar Leitor"}
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Encaixes e Furações */}
          <div className="py-1.5 flex items-center justify-between gap-2 border-b border-black/5 dark:border-slate-800/60">
            <span className="text-slate-500 font-medium">Furação e Berço:</span>
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Garantido de Fábrica</span>
            </div>
          </div>
        </div>

        {/* Linha Financeira e Ações Rápidas */}
        <div className="pt-2 border-t border-black/10 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-baseline gap-2">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">
              Total do Totem:
            </span>
            <span className="text-xl sm:text-2xl font-black text-[#0071e3] dark:text-cyan-400">
              {formatBRL(pricing.totalPriceCents)}
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEditStep(1)}
              className="text-xs font-semibold flex-1 sm:flex-none"
            >
              <Edit3 className="w-3.5 h-3.5 mr-1" />
              Editar
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={onAddToCart}
              className="text-xs sm:text-sm font-bold shadow-lg shadow-blue-500/25 flex-1 sm:flex-none"
            >
              <ShoppingCart className="w-4 h-4 mr-1.5" />
              Adicionar ao Carrinho
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
