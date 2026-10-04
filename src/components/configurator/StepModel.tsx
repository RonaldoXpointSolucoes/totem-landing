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
      {/* Cabeçalho da Etapa 1 */}
      <div className="text-center sm:text-left space-y-1">
        <h2 className="text-lg sm:text-2xl font-black text-[#1d1d1f] dark:text-white tracking-tight">
          Qual formato de Totem você precisa?
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
          Selecione o formato estrutural que melhor se adapta ao espaço da sua operação.
        </p>
      </div>

      {/* Versão Mobile (Cards com Descrição Completa e Hierarquia Correta) */}
      <div className="md:hidden space-y-3">
        {models.map((model) => {
          const isSelected = selectedModel.id === model.id;
          return (
            <div
              key={model.id}
              onClick={() => onSelectModel(model)}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 active:scale-[0.98] select-none ${
                isSelected
                  ? "border-[#0071e3] bg-blue-50/70 dark:bg-slate-900 ring-2 ring-[#0071e3]/30 dark:ring-blue-500/30 shadow-sm dark:shadow-[0_0_20px_rgba(0,113,227,0.15)]"
                  : "border-black/10 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-black/20 dark:hover:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-800/40"
              }`}
            >
              {/* Miniatura do Modelo (Auto-adaptável com fundo contrastado) */}
              <div className="w-20 h-24 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-black/10 dark:border-slate-800 p-2 flex items-center justify-center shrink-0 self-start shadow-inner">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={model.mainImage}
                  alt={model.name}
                  className="h-full w-auto object-contain drop-shadow-md"
                />
              </div>

              {/* Informações Centrais com Descrição Sempre Visível */}
              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div>
                  {/* Título + Radio Selector */}
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h3 className="text-sm sm:text-base font-bold text-[#1d1d1f] dark:text-white tracking-tight">
                      {model.name}
                    </h3>
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? "border-[#0071e3] bg-[#0071e3] text-white shadow-sm"
                          : "border-black/20 dark:border-slate-700 bg-white dark:bg-slate-800"
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>

                  {/* Descrição Textual Completa Sempre Visível Abaixo do Título */}
                  <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-2">
                    {model.description}
                  </p>

                  {/* Badge de Dimensões Técnicas */}
                  {model.dimensions && (
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800/80 border border-black/5 dark:border-slate-700/60 text-[10px] text-slate-600 dark:text-slate-400 font-mono mb-2">
                      <Maximize2 className="w-3 h-3 text-[#0071e3] shrink-0" />
                      <span>
                        {model.dimensions.heightMm}×{model.dimensions.widthMm}×{model.dimensions.depthMm} mm
                      </span>
                    </div>
                  )}
                </div>

                {/* Rodapé com Preço Chassi Base */}
                <div className="flex items-center justify-between pt-1.5 border-t border-black/5 dark:border-slate-800/80 mt-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">
                    Chassi Base:
                  </span>
                  <span className="text-xs sm:text-sm font-black text-[#0071e3] dark:text-cyan-400">
                    {formatBRL(model.basePriceCents)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Versão Desktop & Tablet (Grid de 3 Colunas Perfeitamente Harmonizado) */}
      <div className="hidden md:grid md:grid-cols-3 gap-3.5 lg:gap-4">
        {models.map((model) => {
          const isSelected = selectedModel.id === model.id;
          return (
            <Card
              key={model.id}
              interactive
              selected={isSelected}
              onClick={() => onSelectModel(model)}
              className={`flex flex-col justify-between p-4 rounded-2xl relative transition-all group select-none ${
                isSelected
                  ? "border-[#0071e3] bg-blue-50/50 dark:bg-slate-900 ring-2 ring-[#0071e3]/30 dark:ring-blue-500/30 shadow-md dark:shadow-[0_0_25px_rgba(0,113,227,0.18)]"
                  : "border-black/10 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-black/20 dark:hover:border-slate-700"
              }`}
            >
              <div>
                {/* Imagem do Gabinete com Altura Contida */}
                <div className="relative h-28 lg:h-32 w-full rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-black/10 dark:border-slate-800 p-2 flex items-center justify-center mb-3 transition-colors">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
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

                {/* Título e Descrição Visível */}
                <div className="space-y-1 mb-3">
                  <h3 className="text-sm lg:text-base font-black text-[#1d1d1f] dark:text-white tracking-tight">
                    {model.name}
                  </h3>
                  <p className="text-[11px] lg:text-xs text-slate-600 dark:text-slate-300 leading-relaxed min-h-[44px]">
                    {model.description}
                  </p>
                </div>
              </div>

              <div>
                {model.dimensions && (
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 py-1.5 border-t border-black/5 dark:border-slate-800/80 mb-2 font-mono">
                    <Maximize2 className="w-3 h-3 text-[#0071e3] shrink-0" />
                    <span>
                      {model.dimensions.heightMm}×{model.dimensions.widthMm}×{model.dimensions.depthMm} mm
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1.5 border-t border-black/10 dark:border-slate-800">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                    Chassi Base
                  </span>
                  <span className="text-sm lg:text-base font-black text-[#0071e3] dark:text-cyan-400">
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

