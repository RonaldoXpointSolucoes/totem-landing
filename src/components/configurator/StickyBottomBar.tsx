"use client";

import React from "react";
import { formatBRL } from "@/modules/pricing/pricingEngine";
import { Button } from "@/components/ui";
import { ArrowRight, ShoppingCart, ChevronLeft } from "lucide-react";

interface StickyBottomBarProps {
  currentStep: number;
  totalSteps: number;
  totalPriceCents: number;
  onNext: () => void;
  onBack: () => void;
  isLastStep?: boolean;
}

export const StickyBottomBar: React.FC<StickyBottomBarProps> = ({
  currentStep,
  totalSteps,
  totalPriceCents,
  onNext,
  onBack,
  isLastStep = false,
}) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/90 border-t border-slate-800/90 backdrop-blur-xl px-4 py-3 shadow-[0_-10px_25px_rgba(0,0,0,0.5)]">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
        {/* Lado Esquerdo: Voltar + Preço Total */}
        <div className="flex items-center gap-3">
          {currentStep > 1 && (
            <button
              onClick={onBack}
              className="p-2.5 rounded-xl border border-slate-700/80 bg-slate-900/80 text-slate-300 hover:text-white hover:border-slate-600 transition-colors"
              aria-label="Voltar etapa"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          <div>
            <span className="block text-[10px] sm:text-xs text-slate-400 font-medium uppercase tracking-wider">
              Total Atual
            </span>
            <span className="text-lg sm:text-xl font-black text-white tracking-tight">
              {formatBRL(totalPriceCents)}
            </span>
          </div>
        </div>

        {/* Lado Direito: Botão de Avanço com Indicador de Etapa */}
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-block text-xs text-slate-400">
            Passo <strong className="text-white">{currentStep}</strong> de {totalSteps}
          </span>

          <Button
            variant="primary"
            size="md"
            onClick={onNext}
            className="px-5 sm:px-7 font-bold shadow-indigo-600/30 shadow-lg text-sm sm:text-base group"
          >
            {isLastStep ? (
              <>
                <ShoppingCart className="w-4 h-4 mr-1.5" />
                Adicionar ao Carrinho
              </>
            ) : (
              <>
                Continuar
                <ArrowRight className="w-4 h-4 ml-1.5 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
