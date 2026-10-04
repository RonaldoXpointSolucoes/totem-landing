"use client";

import React from "react";
import { ColorOption } from "@/types/catalog";
import { formatBRL } from "@/modules/pricing/pricingEngine";
import { Card, Badge } from "@/components/ui";
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
    <div className="space-y-5 sm:space-y-6">
      <div className="text-center sm:text-left space-y-1.5">
        <Badge variant="accent" className="text-xs">
          Etapa 02 de 06
        </Badge>
        <h2 className="text-xl sm:text-3xl font-black text-[#1d1d1f] dark:text-white tracking-tight">
          Escolha o acabamento em MaDeFibra BP
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
          Painéis de 15mm usinados em Router CNC com alta durabilidade, resistência a riscos e encaixes perfeitos.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-5">
        {colors.map((color) => {
          const isSelected = selectedColor.id === color.id;
          const hasAdjustment = color.priceAdjustmentCents > 0;

          return (
            <Card
              key={color.id}
              interactive
              selected={isSelected}
              onClick={() => onSelectColor(color)}
              className="p-5 sm:p-6 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  {/* Amostra visual de cor */}
                  <div
                    className="w-12 h-12 rounded-2xl border-2 border-black/15 dark:border-slate-700 shadow-inner flex items-center justify-center transition-transform group-hover:scale-105"
                    style={{ background: color.hexReference }}
                  >
                    {isSelected && (
                      <Check
                        className={`w-5 h-5 stroke-[3] ${
                          color.slug === "white" ? "text-slate-900" : "text-white"
                        }`}
                      />
                    )}
                  </div>

                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                      hasAdjustment
                        ? "bg-blue-50 dark:bg-indigo-500/20 text-[#0071e3] dark:text-indigo-300 border-blue-200 dark:border-indigo-500/30"
                        : "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30"
                    }`}
                  >
                    {hasAdjustment ? `+ ${formatBRL(color.priceAdjustmentCents)}` : "Sem Acréscimo"}
                  </span>
                </div>

                <h3 className="text-base font-bold text-[#1d1d1f] dark:text-white mb-1.5">{color.name}</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {color.slug === "white"
                    ? "Padrão texturizado Branco TX em MaDeFibra 15mm, ideal para clínicas, saúde e varejo clean."
                    : color.slug === "black"
                    ? "Padrão texturizado Preto TX elegante e resistente, com estética corporativa sóbria e moderna."
                    : "Combinação bicolor unindo painéis Branco TX e Preto TX com encaixes de alta precisão."}
                </p>
              </div>

              <div className="mt-5 pt-3.5 border-t border-black/10 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Impacto no Preço:</span>
                <span className="font-bold text-[#1d1d1f] dark:text-slate-200">
                  {hasAdjustment ? `+ ${formatBRL(color.priceAdjustmentCents)}` : "R$ 0,00"}
                </span>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Caixa de Destaque: Personalização em qualquer padrão de MDF */}
      <div className="p-4 sm:p-5 rounded-2xl bg-blue-50/70 dark:bg-indigo-950/30 border border-blue-200/80 dark:border-indigo-500/20 flex flex-col sm:flex-row items-start sm:items-center gap-3.5 transition-colors">
        <div className="p-2.5 rounded-xl bg-[#0071e3]/10 dark:bg-indigo-600/20 text-[#0071e3] dark:text-indigo-400 shrink-0">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="space-y-1 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
          <p className="font-bold text-[#1d1d1f] dark:text-white">
            Precisa de padrão amadeirado, grafite ou acabamento sob medida da sua marca?
          </p>
          <p className="text-slate-600 dark:text-slate-400">
            Nossa fábrica usina em qualquer padrão Arauco, Duratex ou Guararapes sob encomenda para pedidos em lote.
          </p>
        </div>
      </div>
    </div>
  );
};
