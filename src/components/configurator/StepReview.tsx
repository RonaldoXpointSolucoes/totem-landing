"use client";

import React from "react";
import { CabinetModel, ColorOption, MonitorOption, PrinterOption, BarcodeReaderOption } from "@/types/catalog";
import { formatBRL, PriceBreakdown } from "@/modules/pricing/pricingEngine";
import { Card, Button, Badge } from "@/components/ui";
import { CheckCircle2, Edit3, ShoppingCart, ShieldAlert } from "lucide-react";

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
    <div className="space-y-5 sm:space-y-6">
      <div className="text-center sm:text-left space-y-1.5">
        <Badge variant="success" className="text-xs">
          Etapa 06 de 06 — Revisão Final
        </Badge>
        <h2 className="text-xl sm:text-3xl font-black text-[#1d1d1f] dark:text-white tracking-tight">
          Confira as especificações do seu Totem
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          Esta será a ficha técnica exata de cortes e encaixes utilizada na fabricação.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
        {/* Card Visual com Foto do Modelo */}
        <div className="lg:col-span-1 p-5 sm:p-6 rounded-3xl border border-black/10 dark:border-slate-800 bg-white/90 dark:bg-slate-900/60 backdrop-blur-md shadow-md dark:shadow-xl flex flex-col items-center justify-center text-center transition-colors">
          <div className="relative aspect-[3/4] w-full max-w-[180px] sm:max-w-[200px] mb-4">
            <img
              src={model.mainImage}
              alt={model.name}
              className="w-full h-full object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.15)] dark:drop-shadow-[0_15px_30px_rgba(0,0,0,0.6)]"
            />
          </div>
          <Badge variant="primary" className="mb-2">
            {model.name}
          </Badge>
          <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
            <span
              className="w-3.5 h-3.5 rounded-full border border-black/20 dark:border-slate-600 inline-block shrink-0"
              style={{ background: color.hexReference }}
            />
            <span className="font-semibold">{color.name}</span>
          </div>
        </div>

        {/* Ficha Técnica Detalhada */}
        <Card className="lg:col-span-2 p-5 sm:p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-base font-black text-[#1d1d1f] dark:text-white pb-3 border-b border-black/10 dark:border-slate-800">
              Ficha Técnica de Produção
            </h3>

            <div className="divide-y divide-black/10 dark:divide-slate-800/80 text-xs sm:text-sm">
              <div className="py-2.5 flex items-center justify-between gap-3">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Modelo do Gabinete:</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#1d1d1f] dark:text-white">{model.name}</span>
                  <button
                    onClick={() => onEditStep(1)}
                    className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-indigo-500/10 border border-blue-200 dark:border-indigo-500/20 text-[#0071e3] dark:text-indigo-400 hover:bg-blue-100 active:scale-90 flex items-center justify-center cursor-pointer transition-all"
                    title="Editar Modelo"
                    aria-label="Editar Modelo"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="py-2.5 flex items-center justify-between gap-3">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Padrão em MaDeFibra BP:</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#1d1d1f] dark:text-white">{color.name}</span>
                  <button
                    onClick={() => onEditStep(2)}
                    className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-indigo-500/10 border border-blue-200 dark:border-indigo-500/20 text-[#0071e3] dark:text-indigo-400 hover:bg-blue-100 active:scale-90 flex items-center justify-center cursor-pointer transition-all"
                    title="Editar Cor"
                    aria-label="Editar Cor"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="py-2.5 flex items-center justify-between gap-3">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Monitor Touchscreen:</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#1d1d1f] dark:text-white truncate max-w-[150px] sm:max-w-none">
                    {monitor?.displayName || "Nenhum monitor definido"}
                  </span>
                  <button
                    onClick={() => onEditStep(3)}
                    className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-indigo-500/10 border border-blue-200 dark:border-indigo-500/20 text-[#0071e3] dark:text-indigo-400 hover:bg-blue-100 active:scale-90 flex items-center justify-center cursor-pointer transition-all"
                    title="Editar Monitor"
                    aria-label="Editar Monitor"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="py-2.5 flex items-center justify-between gap-3">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Impressora Térmica:</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#1d1d1f] dark:text-white truncate max-w-[150px] sm:max-w-none">
                    {printer?.displayName || "Nenhuma impressora definida"}
                  </span>
                  <button
                    onClick={() => onEditStep(4)}
                    className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-indigo-500/10 border border-blue-200 dark:border-indigo-500/20 text-[#0071e3] dark:text-indigo-400 hover:bg-blue-100 active:scale-90 flex items-center justify-center cursor-pointer transition-all"
                    title="Editar Impressora"
                    aria-label="Editar Impressora"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="py-2.5 flex items-center justify-between gap-3">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Janela do Leitor de Barras:</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#1d1d1f] dark:text-white truncate max-w-[140px] sm:max-w-none">
                    {useReader ? reader?.displayName || "Sim" : "Sem leitor"}
                  </span>
                  <button
                    onClick={() => onEditStep(5)}
                    className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-indigo-500/10 border border-blue-200 dark:border-indigo-500/20 text-[#0071e3] dark:text-indigo-400 hover:bg-blue-100 active:scale-90 flex items-center justify-center cursor-pointer transition-all"
                    title="Editar Leitor"
                    aria-label="Editar Leitor"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Discriminação de Valores */}
          <div className="mt-6 pt-4 border-t border-black/10 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Chassi Base ({model.name}):</span>
              <span className="font-semibold text-[#1d1d1f] dark:text-white">{formatBRL(pricing.basePriceCents)}</span>
            </div>
            {pricing.colorAdjustmentCents > 0 && (
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Acréscimo de Padrão ({color.name}):</span>
                <span className="font-semibold text-[#1d1d1f] dark:text-white">+{formatBRL(pricing.colorAdjustmentCents)}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Ajuste de Furações & Encaixes dos Equipamentos:</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">Grátis (R$ 0,00)</span>
            </div>

            <div className="flex items-center justify-between pt-2.5 border-t border-black/10 dark:border-slate-800">
              <span className="text-sm font-bold text-[#1d1d1f] dark:text-white">Valor Unitário do Totem:</span>
              <span className="text-2xl font-black text-[#0071e3] dark:text-cyan-400">
                {formatBRL(pricing.totalPriceCents)}
              </span>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                onClick={() => onEditStep(1)}
                className="w-full sm:w-auto font-semibold"
              >
                <Edit3 className="w-4 h-4 mr-1.5" />
                Editar Configuração
              </Button>
              <Button
                variant="primary"
                onClick={onAddToCart}
                className="flex-1 font-bold shadow-lg shadow-blue-500/25 active:scale-95 transition-all"
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                Adicionar ao Carrinho
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
