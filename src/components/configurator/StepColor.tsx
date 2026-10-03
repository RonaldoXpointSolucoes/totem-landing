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
    <div className="space-y-6">
      <div className="text-center sm:text-left space-y-1.5">
        <Badge variant="accent" className="text-xs">
          Etapa 02 de 05
        </Badge>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Escolha a cor do seu gabinete
        </h2>
        <p className="text-sm text-slate-400">
          Pintura eletrostática industrial a pó com tratamento antiferrugem e alta durabilidade.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {colors.map((color) => {
          const isSelected = selectedColor.id === color.id;
          const hasAdjustment = color.priceAdjustmentCents > 0;

          return (
            <Card
              key={color.id}
              interactive
              selected={isSelected}
              onClick={() => onSelectColor(color)}
              className="p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  {/* Amostra visual de cor */}
                  <div
                    className="w-12 h-12 rounded-2xl border-2 border-slate-700 shadow-inner flex items-center justify-center"
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
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                      hasAdjustment
                        ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
                        : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                    }`}
                  >
                    {hasAdjustment ? `+ ${formatBRL(color.priceAdjustmentCents)}` : "Sem Acréscimo"}
                  </span>
                </div>

                <h3 className="text-base font-bold text-white mb-1">{color.name}</h3>
                <p className="text-xs text-slate-400">
                  {color.slug === "white"
                    ? "Acabamento clean ideal para clínicas, saúde e varejo claro."
                    : color.slug === "black"
                    ? "Fosco requintado com estética corporativa sóbria e moderna."
                    : "Combinação bicolor elegante que destaca o chassi e a interface."}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400">Impacto no Preço:</span>
                <span className="font-semibold text-slate-200">
                  {hasAdjustment ? `+ ${formatBRL(color.priceAdjustmentCents)}` : "R$ 0,00"}
                </span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
