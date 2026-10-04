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
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-950/95 border-t border-black/10 dark:border-slate-800/90 backdrop-blur-2xl px-4 py-2.5 pb-[max(0.65rem,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(0,0,0,0.08)] dark:shadow-[0_-10px_30px_rgba(0,0,0,0.6)] transition-colors duration-300">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
        {/* Lado Esquerdo: Botão Voltar + Preço Total */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {currentStep > 1 && (
            <button
              onClick={onBack}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl border border-black/10 dark:border-slate-700/80 bg-[#f5f5f7] dark:bg-slate-900/90 text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white hover:border-black/20 dark:hover:border-slate-600 active:scale-90 flex items-center justify-center transition-all cursor-pointer shadow-sm"
              aria-label="Voltar etapa"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
              Total Atual
            </span>
            <span className="text-base sm:text-xl font-black text-[#0071e3] dark:text-cyan-400 tracking-tight leading-tight">
              {formatBRL(totalPriceCents)}
            </span>
          </div>
        </div>

        {/* Lado Direito: Indicador de Etapa + Botão Principal */}
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-block text-xs text-slate-500 dark:text-slate-400 font-medium">
            Etapa <strong className="text-[#1d1d1f] dark:text-white font-bold">{currentStep}</strong> de {totalSteps}
          </span>

          <Button
            variant="primary"
            size="md"
            onClick={onNext}
            className="min-h-[44px] px-5 sm:px-7 font-bold shadow-md shadow-blue-500/25 active:scale-95 text-xs sm:text-sm group transition-all"
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
