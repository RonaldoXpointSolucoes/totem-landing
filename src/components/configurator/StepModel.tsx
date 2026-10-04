"use client";

import React from "react";
import { CabinetModel } from "@/types/catalog";
import { formatBRL } from "@/modules/pricing/pricingEngine";
import { Card, Badge } from "@/components/ui";
import { Check, Maximize2, Sparkles } from "lucide-react";

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
    <div className="space-y-5 sm:space-y-6">
      <div className="text-center sm:text-left space-y-1.5">
        <Badge variant="accent" className="text-xs">
          Etapa 01 de 06
        </Badge>
        <h2 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight">
          Qual modelo de Totem você precisa?
        </h2>
        <p className="text-xs sm:text-sm text-slate-400">
          Selecione o formato estrutural que melhor se adapta ao espaço da sua operação.
        </p>
      </div>

      {/* Versão Mobile (Cards Compactos e Horizontais para evitar rolagem excessiva) */}
      <div className="md:hidden space-y-3">
        {models.map((model) => {
          const isSelected = selectedModel.id === model.id;
          return (
            <div
              key={model.id}
              onClick={() => onSelectModel(model)}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-3.5 active:scale-[0.98] ${
                isSelected
                  ? "border-indigo-500 bg-slate-900/95 ring-2 ring-indigo-500/30 shadow-lg shadow-indigo-500/10"
                  : "border-slate-800/90 bg-slate-900/60 hover:bg-slate-900/80 hover:border-slate-700"
              }`}
            >
              {/* Miniatura do Modelo */}
              <div className="w-20 h-24 rounded-xl bg-slate-950/90 border border-slate-800/80 p-1.5 flex items-center justify-center shrink-0">
                <img
                  src={model.mainImage}
                  alt={model.name}
                  className="h-full w-auto object-contain drop-shadow-md"
                />
              </div>

              {/* Informações Centrais e Ação */}
              <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-tight leading-snug">
                      {model.name}
                    </h3>
                    {model.dimensions && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 font-medium mt-0.5">
                        <Maximize2 className="w-3 h-3 text-indigo-400 shrink-0" />
                        {model.dimensions.heightMm}×{model.dimensions.widthMm}×{model.dimensions.depthMm} mm
                      </span>
                    )}
                  </div>

                  <div
                    className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                      isSelected
                        ? "border-indigo-500 bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                        : "border-slate-700 bg-slate-800/60"
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 line-clamp-1 leading-normal my-1">
                  {model.description}
                </p>

                <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                  <span className="text-[10px] text-slate-400 font-medium">Chassi:</span>
                  <span className="text-sm font-extrabold text-indigo-400">
                    {formatBRL(model.basePriceCents)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Versão Desktop & Tablet (Grid de 3 Colunas com Vitrine Visual Rica) */}
      <div className="hidden md:grid md:grid-cols-3 gap-4">
        {models.map((model) => {
          const isSelected = selectedModel.id === model.id;
          return (
            <Card
              key={model.id}
              interactive
              selected={isSelected}
              onClick={() => onSelectModel(model)}
              className="flex flex-col justify-between p-5"
            >
              <div>
                {/* Imagem do Gabinete */}
                <div className="relative aspect-[3/4] w-full rounded-xl bg-slate-950/80 border border-slate-800 p-4 flex items-center justify-center mb-4">
                  <img
                    src={model.mainImage}
                    alt={model.name}
                    className="h-full w-auto object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.5)]"
                  />
                  {isSelected && (
                    <div className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  )}
                </div>

                <div className="space-y-1 mb-3">
                  <h3 className="text-lg font-bold text-white">{model.name}</h3>
                  <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                    {model.description}
                  </p>
                </div>

                {model.dimensions && (
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 pb-3 mb-2 border-b border-slate-800">
                    <Maximize2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>
                      {model.dimensions.heightMm}×{model.dimensions.widthMm}×{model.dimensions.depthMm} mm
                    </span>
                  </div>
                )}
              </div>

              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                  Preço do Chassi
                </span>
                <p className="text-lg font-extrabold text-white">
                  {formatBRL(model.basePriceCents)}
                </p>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
