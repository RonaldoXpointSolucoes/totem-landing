"use client";

import React from "react";
import { CabinetModel, ColorOption, MonitorOption, PrinterOption, BarcodeReaderOption } from "@/types/catalog";
import { formatBRL, PriceBreakdown } from "@/modules/pricing/pricingEngine";
import { Card, Button } from "@/components/ui";
import { Edit3, ShoppingCart, ShieldCheck } from "lucide-react";

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

      {/* Ficha Técnica de Produção Otimizada em 2 Colunas (Sem Imagem Redundante) */}
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

          {/* Monitor */}
          <div className="py-1.5 flex items-center justify-between gap-2 border-b border-black/5 dark:border-slate-800/60">
            <span className="text-slate-500 font-medium">Monitor Touch:</span>
            <div className="flex items-center gap-1.5 min-w-0">
              <strong className="text-[#1d1d1f] dark:text-white truncate max-w-[140px]">
                {monitor?.displayName || "—"}
              </strong>
              <button
                onClick={() => onEditStep(3)}
                className="p-1 rounded-lg hover:bg-black/5 text-[#0071e3] transition-colors"
                title="Alterar Monitor"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Impressora */}
          <div className="py-1.5 flex items-center justify-between gap-2 border-b border-black/5 dark:border-slate-800/60">
            <span className="text-slate-500 font-medium">Impressora:</span>
            <div className="flex items-center gap-1.5 min-w-0">
              <strong className="text-[#1d1d1f] dark:text-white truncate max-w-[140px]">
                {printer?.displayName || "—"}
              </strong>
              <button
                onClick={() => onEditStep(4)}
                className="p-1 rounded-lg hover:bg-black/5 text-[#0071e3] transition-colors"
                title="Alterar Impressora"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Leitor */}
          <div className="py-1.5 flex items-center justify-between gap-2 border-b border-black/5 dark:border-slate-800/60">
            <span className="text-slate-500 font-medium">Janela de Leitor:</span>
            <div className="flex items-center gap-1.5 min-w-0">
              <strong className="text-[#1d1d1f] dark:text-white truncate max-w-[140px]">
                {useReader ? reader?.displayName || "Sim" : "Sem leitor"}
              </strong>
              <button
                onClick={() => onEditStep(5)}
                className="p-1 rounded-lg hover:bg-black/5 text-[#0071e3] transition-colors"
                title="Alterar Leitor"
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
