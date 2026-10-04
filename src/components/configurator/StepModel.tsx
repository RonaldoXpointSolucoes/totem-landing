"use client";

import React from "react";
import { CabinetModel } from "@/types/catalog";
import { formatBRL } from "@/modules/pricing/pricingEngine";
import { Card } from "@/components/ui";
import { Check, Maximize2 } from "lucide-react";

interface StepModelProps {
  models: CabinetModel[];
  selectedModel: CabinetModel;
  onSelectModel: (model: CabinetModel) => void;
}

export const StepModel: React.FC<StepModelProps> = ({
  models,
  selectedModel,
  onSelectModel,
}) => {
  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="text-center sm:text-left space-y-1">
        <h2 className="text-lg sm:text-2xl font-black text-[#1d1d1f] dark:text-white tracking-tight">
          Qual formato de Totem você precisa?
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
          Selecione o formato estrutural que melhor se adapta ao espaço da sua operação.
        </p>
      </div>

      {/* Versão Mobile (Cards Compactos Horizontais) */}
      <div className="md:hidden space-y-2.5">
        {models.map((model) => {
          const isSelected = selectedModel.id === model.id;
          return (
            <div
              key={model.id}
              onClick={() => onSelectModel(model)}
              className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 active:scale-[0.98] ${
                isSelected
                  ? "border-[#0071e3] bg-blue-50/70 dark:bg-slate-900/95 ring-2 ring-[#0071e3]/30 shadow-sm"
                  : "border-black/10 dark:border-slate-800/90 bg-white dark:bg-slate-900/60 hover:border-black/20"
              }`}
            >
              {/* Miniatura do Modelo */}
              <div className="w-16 h-20 rounded-xl bg-[#f8f9fa] dark:bg-slate-950/90 border border-black/10 dark:border-slate-800/80 p-1 flex items-center justify-center shrink-0">
                <img
                  src={model.mainImage}
                  alt={model.name}
                  className="h-full w-auto object-contain drop-shadow-md"
                />
              </div>

              {/* Informações Centrais */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <h3 className="text-sm font-bold text-[#1d1d1f] dark:text-white truncate">
                    {model.name}
                  </h3>
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                      isSelected
                        ? "border-[#0071e3] bg-[#0071e3] text-white"
                        : "border-black/15 dark:border-slate-700 bg-black/5 dark:bg-slate-800"
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>

                {model.dimensions && (
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Maximize2 className="w-3 h-3 text-[#0071e3]" />
                    {model.dimensions.heightMm}×{model.dimensions.widthMm}×{model.dimensions.depthMm} mm
                  </p>
                )}

                <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-1 my-0.5">
                  {model.description}
                </p>

                <div className="flex items-center justify-between pt-1 border-t border-black/5 dark:border-slate-800/60">
                  <span className="text-[10px] text-slate-500 font-medium">Chassi:</span>
                  <span className="text-xs font-black text-[#0071e3] dark:text-cyan-400">
                    {formatBRL(model.basePriceCents)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Versão Desktop & Tablet (Grid de 3 Colunas Perfeitamente Balanceado Above-the-Fold) */}
      <div className="hidden md:grid md:grid-cols-3 gap-3.5 lg:gap-4">
        {models.map((model) => {
          const isSelected = selectedModel.id === model.id;
          return (
            <Card
              key={model.id}
              interactive
              selected={isSelected}
              onClick={() => onSelectModel(model)}
              className="flex flex-col justify-between p-3.5 lg:p-4 rounded-2xl relative transition-all group"
            >
              <div>
                {/* Imagem do Gabinete com Altura Contida para não estourar viewport */}
                <div className="relative h-28 lg:h-32 w-full rounded-xl bg-[#f8f9fa] dark:bg-slate-950/80 border border-black/10 dark:border-slate-800 p-2 flex items-center justify-center mb-2.5 transition-colors">
                  <img
                    src={model.mainImage}
                    alt={model.name}
                    className="h-full w-auto object-contain drop-shadow-md transition-transform duration-300 group-hover:scale-105"
                  />
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#0071e3] text-white flex items-center justify-center shadow-md shadow-blue-500/30">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </div>

                <div className="space-y-0.5 mb-2">
                  <h3 className="text-sm lg:text-base font-black text-[#1d1d1f] dark:text-white tracking-tight">
                    {model.name}
                  </h3>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {model.description}
                  </p>
                </div>
              </div>

              <div>
                {model.dimensions && (
                  <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 py-1 border-t border-black/5 dark:border-slate-800/80 mb-1.5">
                    <Maximize2 className="w-3 h-3 text-[#0071e3] shrink-0" />
                    <span className="truncate">
                      {model.dimensions.heightMm}×{model.dimensions.widthMm}×{model.dimensions.depthMm} mm
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1 border-t border-black/10 dark:border-slate-800">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                    Chassi Base
                  </span>
                  <span className="text-sm font-black text-[#0071e3] dark:text-cyan-400">
                    {formatBRL(model.basePriceCents)}
                  </span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
