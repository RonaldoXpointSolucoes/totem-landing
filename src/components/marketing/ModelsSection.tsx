"use client";

import React from "react";
import { CABINET_MODELS } from "@/modules/catalog/catalogData";
import { formatBRL } from "@/modules/pricing/pricingEngine";
import { Card, Button, Badge } from "@/components/ui";
import { ArrowRight, Maximize2, Shield, Wrench } from "lucide-react";

interface ModelsSectionProps {
  onSelectModelToConfigure: (modelId: string) => void;
}

export const ModelsSection: React.FC<ModelsSectionProps> = ({
  onSelectModelToConfigure,
}) => {
  return (
    <section id="modelos" className="py-16 md:py-24 border-t border-slate-800/80">
      <div className="max-w-6xl mx-auto px-4">
        {/* Cabeçalho da Seção */}
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
          <Badge variant="primary" className="text-xs">
            Modelos de Linha
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Escolha o formato ideal para seu espaço
          </h2>
          <p className="text-sm sm:text-base text-slate-400">
            Três plataformas projetadas com padrões industriais, rigidez estrutural e fácil manutenção.
          </p>
        </div>

        {/* Grid dos Modelos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {CABINET_MODELS.map((model) => (
            <Card
              key={model.id}
              interactive
              className="flex flex-col justify-between p-6 glass-card-hover border-slate-800 bg-slate-900/70"
            >
              <div>
                {/* Imagem do Modelo */}
                <div className="relative aspect-[3/4] w-full rounded-xl bg-slate-950/70 border border-slate-800/80 p-6 flex items-center justify-center mb-6 overflow-hidden">
                  <img
                    src={model.mainImage}
                    alt={model.name}
                    className="h-full w-auto object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)] transition-transform duration-300 hover:scale-105"
                  />
                  <div className="absolute top-3 right-3">
                    <span className="text-[11px] font-semibold text-slate-400 bg-slate-900/90 border border-slate-800 px-2.5 py-0.5 rounded-full">
                      {model.slug === "floor" ? "Mais Popular" : "Sob Medida"}
                    </span>
                  </div>
                </div>

                {/* Título e Descrição */}
                <h3 className="text-xl font-bold text-white mb-2">{model.name}</h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mb-4">
                  {model.description}
                </p>

                {/* Especificações Rápidas */}
                {model.dimensions && (
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 py-2 border-y border-slate-800/60 mb-4">
                    <Maximize2 className="w-3.5 h-3.5 text-indigo-400" />
                    <span>
                      {model.dimensions.heightMm}mm (A) × {model.dimensions.widthMm}mm (L) ×{" "}
                      {model.dimensions.depthMm}mm (P)
                    </span>
                  </div>
                )}
              </div>

              {/* Preço e Botão de Ação */}
              <div className="pt-2">
                <div className="mb-3">
                  <span className="text-[11px] text-slate-400">Preço inicial</span>
                  <p className="text-xl font-extrabold text-white">
                    {formatBRL(model.basePriceCents)}
                  </p>
                </div>
                <Button
                  variant="primary"
                  className="w-full justify-between group"
                  onClick={() => onSelectModelToConfigure(model.id)}
                >
                  <span>Configurar Este</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
