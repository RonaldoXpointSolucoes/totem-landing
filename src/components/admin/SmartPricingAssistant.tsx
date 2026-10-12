"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Calculator,
  ArrowRight,
  CheckCircle2,
  DollarSign,
  CreditCard,
  Zap,
  TrendingUp,
  Percent,
  Layers,
  HelpCircle,
  ShieldCheck,
} from "lucide-react";
import {
  calculateReversePricing,
  ReversePricingResult,
} from "@/modules/pricing/smartPricing";
import { formatBRL } from "@/modules/pricing/pricingEngine";

interface SmartPricingAssistantProps {
  initialTargetNetCents?: number;
  onApplyPrices: (prices: {
    basePriceCents: number; // Preço do cartão (tabela 10x)
    pixPriceCents: number; // Preço à vista no PIX
    targetNetCents: number; // Margem líquida desejada
    anchorPriceCents: number; // Âncora "De"
    maxInstallments: number; // 10x
  }) => void;
}

export function SmartPricingAssistant({
  initialTargetNetCents = 99000,
  onApplyPrices,
}: SmartPricingAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [targetNetReais, setTargetNetReais] = useState<number>(
    (initialTargetNetCents || 99000) / 100
  );
  const [couponPercent, setCouponPercent] = useState<number>(10);
  const [commissionPercent, setCommissionPercent] = useState<number>(10);
  const [installments, setInstallments] = useState<number>(10);
  const [appliedSuccess, setAppliedSuccess] = useState(false);

  // Calcula o resultado em tempo real
  const pricingResult: ReversePricingResult = calculateReversePricing({
    targetNetCents: Math.round(targetNetReais * 100),
    customerCouponPercent: couponPercent,
    influencerCommissionPercent: commissionPercent,
    installments,
  });

  const handleApply = () => {
    onApplyPrices({
      basePriceCents: pricingResult.cardPriceCents,
      pixPriceCents: pricingResult.pixPriceCents,
      targetNetCents: pricingResult.targetNetCents,
      anchorPriceCents: pricingResult.anchorPriceCents,
      maxInstallments: pricingResult.installments,
    });
    setAppliedSuccess(true);
    setTimeout(() => {
      setAppliedSuccess(false);
      setIsOpen(false);
    }, 1200);
  };

  return (
    <div className="mb-6 rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/40 via-slate-900/60 to-slate-950/80 p-4 sm:p-5 backdrop-blur-md shadow-xl">
      {/* Header do Assistente */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white shrink-0">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm sm:text-base font-extrabold text-white tracking-tight">
                Assistente de Precificação & Margem Reversa
              </h4>
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold border border-indigo-500/40 uppercase">
                Inteligente
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Digite quanto quer receber limpo no bolso e o sistema calcula os preços no PIX e Cartão 10x.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="self-start sm:self-auto px-3.5 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 hover:text-white border border-indigo-500/40 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>{isOpen ? "Ocultar Simulador" : "Abrir Simulador de Margem"}</span>
        </button>
      </div>

      {/* Pré-visualização Rápida quando fechado */}
      {!isOpen && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300 pt-1">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Meta no Bolso:</span>
            <span className="font-extrabold text-emerald-400">
              {formatBRL(pricingResult.targetNetCents)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Preço PIX:</span>
            <span className="font-extrabold text-cyan-400">
              {formatBRL(pricingResult.pixPriceCents)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Preço Cartão (10x):</span>
            <span className="font-extrabold text-indigo-300">
              {formatBRL(pricingResult.cardPriceCents)}
            </span>
            <span className="text-[11px] text-slate-400">
              (10x de {formatBRL(pricingResult.installmentMonthlyCents)})
            </span>
          </div>
        </div>
      )}

      {/* Conteúdo Completo do Simulador */}
      {isOpen && (
        <div className="mt-5 space-y-6 pt-2">
          {/* Seção 1: Inputs de Meta Líquida e Estratégia */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            {/* Input da Meta */}
            <div className="sm:col-span-6 bg-slate-950/80 border border-indigo-500/40 rounded-xl p-3.5 shadow-inner">
              <label className="block text-xs font-extrabold text-indigo-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                <span>Quanto você quer receber no bolso? (Líquido) *</span>
              </label>
              <div className="relative mt-1.5">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-extrabold text-sm">
                  R$
                </span>
                <input
                  type="number"
                  step="10"
                  min="100"
                  value={targetNetReais}
                  onChange={(e) => setTargetNetReais(parseFloat(e.target.value || "0"))}
                  className="w-full pl-11 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-emerald-400 font-extrabold text-base focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* Botões Rápidos de Presets */}
              <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                <span className="text-[10px] text-slate-400">Atalhos:</span>
                <button
                  type="button"
                  onClick={() => setTargetNetReais(950)}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold cursor-pointer"
                >
                  R$ 950 (Balcão)
                </button>
                <button
                  type="button"
                  onClick={() => setTargetNetReais(990)}
                  className="px-2 py-0.5 rounded bg-indigo-900/60 hover:bg-indigo-800 text-indigo-200 text-[10px] font-bold border border-indigo-500/40 cursor-pointer"
                >
                  R$ 990 (Parede)
                </button>
                <button
                  type="button"
                  onClick={() => setTargetNetReais(1590)}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold cursor-pointer"
                >
                  R$ 1.590 (Piso)
                </button>
              </div>
            </div>

            {/* Parâmetros de Proteção */}
            <div className="sm:col-span-6 grid grid-cols-2 gap-3">
              {/* Cupom Previsto */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Percent className="w-3 h-3 text-cyan-400" />
                  <span>Cupom Cliente</span>
                </label>
                <div className="flex gap-1.5">
                  {[0, 10, 20].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setCouponPercent(val)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        couponPercent === val
                          ? "bg-cyan-500 text-slate-950 font-extrabold shadow-md shadow-cyan-500/30"
                          : "bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700"
                      }`}
                    >
                      {val}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Comissão Influencer */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-indigo-400" />
                  <span>Comissão Influencer</span>
                </label>
                <div className="flex gap-1.5">
                  {[0, 5, 10].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setCommissionPercent(val)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        commissionPercent === val
                          ? "bg-indigo-500 text-white font-extrabold shadow-md shadow-indigo-500/30"
                          : "bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700"
                      }`}
                    >
                      {val}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Parcelamento no Cartão */}
              <div className="col-span-2 bg-slate-950/60 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                    <CreditCard className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Parcelamento no Cartão</span>
                  </span>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Absorve taxa de antecipação e entrega os R$ 990,00 no bolso
                  </p>
                </div>
                <div className="flex gap-1">
                  {[10, 12].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setInstallments(p)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                        installments === p
                          ? "bg-indigo-600 text-white font-extrabold"
                          : "bg-slate-900 text-slate-400 hover:text-white"
                      }`}
                    >
                      {p}x
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Seção 2: Cards de Preços Finais Calculados */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Card 1: PIX */}
            <div className="p-3.5 rounded-xl border border-emerald-500/40 bg-emerald-950/20 backdrop-blur-sm relative overflow-hidden">
              <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[9px] font-bold uppercase border border-emerald-500/30">
                À Vista
              </div>
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold mb-1">
                <Zap className="w-4 h-4 fill-emerald-400" />
                <span>Preço no PIX</span>
              </div>
              <div className="text-2xl font-black text-white">
                {formatBRL(pricingResult.pixPriceCents)}
              </div>
              <p className="text-[11px] text-emerald-300/80 mt-1">
                Economia de {pricingResult.effectivePixDiscountPercent}% para o cliente
              </p>
            </div>

            {/* Card 2: Cartão */}
            <div className="p-3.5 rounded-xl border border-indigo-500/40 bg-indigo-950/20 backdrop-blur-sm relative overflow-hidden">
              <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[9px] font-bold uppercase border border-indigo-500/30">
                {pricingResult.installments}x Sem Juros
              </div>
              <div className="flex items-center gap-1.5 text-xs text-indigo-300 font-bold mb-1">
                <CreditCard className="w-4 h-4" />
                <span>Preço no Cartão</span>
              </div>
              <div className="text-2xl font-black text-white">
                {formatBRL(pricingResult.cardPriceCents)}
              </div>
              <p className="text-[11px] text-indigo-300/80 mt-1">
                {pricingResult.installments}x de {formatBRL(pricingResult.installmentMonthlyCents)}
              </p>
            </div>

            {/* Card 3: Âncora */}
            <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/40 backdrop-blur-sm relative overflow-hidden">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold mb-1">
                <Layers className="w-4 h-4" />
                <span>Preço Âncora ("De")</span>
              </div>
              <div className="text-2xl font-black text-slate-400 line-through">
                {formatBRL(pricingResult.anchorPriceCents)}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Sensação de alta vantagem na vitrine
              </p>
            </div>
          </div>

          {/* Seção 3: Raio-X / DRE em Tempo Real dos 3 Cenários */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60">
            <h5 className="text-xs font-extrabold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>DRE Comparativo de Vendas (Simulação Financeira)</span>
            </h5>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Cenário 1 */}
              <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/50 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">1. PIX Direto</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">
                    100% Meta
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 space-y-0.5 pt-1">
                  <div className="flex justify-between">
                    <span>Cliente paga:</span>
                    <span className="text-white font-semibold">
                      {formatBRL(pricingResult.scenarios.pixDirect.customerPaysCents)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Comissões/Taxas:</span>
                    <span>R$ 0,00</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-white/10 font-bold text-emerald-400">
                    <span>Você recebe:</span>
                    <span>{formatBRL(pricingResult.scenarios.pixDirect.netReceivedCents)}</span>
                  </div>
                </div>
              </div>

              {/* Cenário 2 */}
              <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/50 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">2. PIX Influencer</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-bold">
                    Parceria
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 space-y-0.5 pt-1">
                  <div className="flex justify-between">
                    <span>Cliente ({couponPercent}% off):</span>
                    <span className="text-white font-semibold">
                      {formatBRL(pricingResult.scenarios.pixInfluencer.customerPaysCents)}
                    </span>
                  </div>
                  <div className="flex justify-between text-rose-400">
                    <span>Comissão ({commissionPercent}%):</span>
                    <span>
                      - {formatBRL(pricingResult.scenarios.pixInfluencer.influencerCommissionCents)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-white/10 font-bold text-cyan-400">
                    <span>Você recebe:</span>
                    <span>
                      {formatBRL(pricingResult.scenarios.pixInfluencer.netReceivedCents)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Cenário 3 */}
              <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/50 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">3. Cartão {installments}x</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold">
                    Meta 100%
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 space-y-0.5 pt-1">
                  <div className="flex justify-between">
                    <span>Cliente paga ({installments}x):</span>
                    <span className="text-white font-semibold">
                      {formatBRL(pricingResult.scenarios.cardInstallments.customerPaysCents)}
                    </span>
                  </div>
                  <div className="flex justify-between text-amber-400">
                    <span>Taxa cartão + comissões:</span>
                    <span>
                      - {formatBRL(
                        pricingResult.scenarios.cardInstallments.gatewayFeeCents +
                        pricingResult.scenarios.cardInstallments.influencerCommissionCents
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-white/10 font-bold text-emerald-400">
                    <span>Você recebe:</span>
                    <span>
                      {formatBRL(pricingResult.scenarios.cardInstallments.netReceivedCents)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Botão de Aplicação com 1 Clique */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleApply}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-lg cursor-pointer ${
                appliedSuccess
                  ? "bg-emerald-500 text-slate-950 shadow-emerald-500/30 scale-105"
                  : "bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white shadow-indigo-500/25 active:scale-95"
              }`}
            >
              {appliedSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Preços Aplicados com Sucesso!</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-cyan-200" />
                  <span>Aplicar Preços Calculados ao Gabinete</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
