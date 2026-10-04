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
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 border-t border-slate-800/90 backdrop-blur-2xl px-4 pt-3 pb-[max(0.85rem,env(safe-area-inset-bottom))] shadow-[0_-10px_30px_rgba(0,0,0,0.6)]">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
        {/* Lado Esquerdo: Botão Voltar + Preço Total */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {currentStep > 1 && (
            <button
              onClick={onBack}
              className="w-12 h-12 rounded-2xl border border-slate-700/80 bg-slate-900/90 text-slate-300 hover:text-white hover:border-slate-600 active:scale-90 flex items-center justify-center transition-all cursor-pointer shadow-md"
              aria-label="Voltar etapa"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Total Atual
            </span>
            <span className="text-lg sm:text-xl font-black text-indigo-400 sm:text-white tracking-tight leading-tight">
              {formatBRL(totalPriceCents)}
            </span>
          </div>
        </div>

        {/* Lado Direito: Indicador de Etapa + Botão Principal */}
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-block text-xs text-slate-400 font-medium">
            Etapa <strong className="text-white font-bold">{currentStep}</strong> de {totalSteps}
          </span>

          <Button
            variant="primary"
            size="md"
            onClick={onNext}
            className="min-h-[48px] px-5 sm:px-7 font-bold shadow-indigo-600/30 shadow-lg text-sm sm:text-base group active:scale-95 transition-all"
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
