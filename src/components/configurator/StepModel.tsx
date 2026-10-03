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
    <div className="space-y-6">
      <div className="text-center sm:text-left space-y-1.5">
        <Badge variant="accent" className="text-xs">
          Etapa 01 de 05
        </Badge>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Qual modelo de Totem você precisa?
        </h2>
        <p className="text-sm text-slate-400">
          Selecione o formato estrutural que melhor se adapta ao espaço da sua operação.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    <div className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg">
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
