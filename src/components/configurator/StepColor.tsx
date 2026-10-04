"use client";

import React from "react";
import { ColorOption } from "@/types/catalog";
import { formatBRL } from "@/modules/pricing/pricingEngine";
import { Card } from "@/components/ui";
import { Check, Sparkles } from "lucide-react";

interface StepColorProps {
  colors: ColorOption[];
  selectedColor: ColorOption;
  onSelectColor: (color: ColorOption) => void;
}

export const StepColor: React.FC<StepColorProps> = ({
  colors,
  selectedColor,
  onSelectColor,
}) => {
  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="text-center sm:text-left space-y-1">
        <h2 className="text-lg sm:text-2xl font-black text-[#1d1d1f] dark:text-white tracking-tight">
          Escolha o acabamento em MaDeFibra BP
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
          Painéis de 15mm usinados em Router CNC com alta durabilidade e resistência.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4">
        {colors.map((color) => {
          const isSelected = selectedColor.id === color.id;
          const hasAdjustment = color.priceAdjustmentCents > 0;

          return (
            <Card
              key={color.id}
              interactive
              selected={isSelected}
              onClick={() => onSelectColor(color)}
              className="p-3.5 sm:p-4 rounded-2xl flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  {/* Amostra visual de cor */}
                  <div
                    className="w-10 h-10 rounded-xl border-2 border-black/15 dark:border-slate-700 shadow-inner flex items-center justify-center transition-transform group-hover:scale-105"
                    style={{ background: color.hexReference }}
                  >
                    {isSelected && (
                      <Check
                        className={`w-4 h-4 stroke-[3] ${
                          color.slug === "white" ? "text-slate-900" : "text-white"
                        }`}
                      />
                    )}
                  </div>

                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                      hasAdjustment
                        ? "bg-blue-50 dark:bg-indigo-500/20 text-[#0071e3] dark:text-indigo-300 border-blue-200 dark:border-indigo-500/30"
                        : "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30"
                    }`}
                  >
                    {hasAdjustment ? `+ ${formatBRL(color.priceAdjustmentCents)}` : "Sem Acréscimo"}
                  </span>
                </div>

                <h3 className="text-sm sm:text-base font-bold text-[#1d1d1f] dark:text-white mb-1">
                  {color.name}
                </h3>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2">
                  {color.slug === "white"
                    ? "Padrão texturizado Branco TX 15mm, ideal para clínicas, saúde e varejo clean."
                    : color.slug === "black"
                    ? "Padrão texturizado Preto TX resistente, com estética corporativa sóbria e moderna."
                    : "Combinação bicolor unindo painéis Branco TX e Preto TX com encaixes de precisão."}
                </p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-black/10 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-[10px] text-slate-500 font-medium">Ajuste de Preço:</span>
                <span className="font-bold text-xs text-[#1d1d1f] dark:text-slate-200">
                  {hasAdjustment ? `+ ${formatBRL(color.priceAdjustmentCents)}` : "R$ 0,00"}
                </span>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Caixa de Destaque: Personalização em qualquer padrão de MDF */}
      <div className="p-3 sm:p-3.5 rounded-2xl bg-blue-50/70 dark:bg-indigo-950/30 border border-blue-200/80 dark:border-indigo-500/20 flex items-center gap-3 transition-colors">
        <div className="p-2 rounded-xl bg-[#0071e3]/10 dark:bg-indigo-600/20 text-[#0071e3] dark:text-indigo-400 shrink-0">
          <Sparkles className="w-4 h-4" />
        </div>
        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
          <strong className="text-[#1d1d1f] dark:text-white">Padrões Especiais:</strong> Usinamos em qualquer MDF Arauco, Duratex ou Guararapes sob encomenda para frotas corporativas.
        </p>
      </div>
    </div>
  );
};
