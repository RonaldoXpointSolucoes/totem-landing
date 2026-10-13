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
  Tag,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  calculateReversePricing,
  ReversePricingResult,
} from "@/modules/pricing/smartPricing";
import { formatBRL } from "@/modules/pricing/pricingEngine";

export interface SmartPricingAssistantProps {
  initialTargetNetCents?: number;
  initialCustomerDiscountCents?: number;
  initialInfluencerCommissionCents?: number;
  initialCardFeeCents?: number;
  onApplyPrices: (prices: {
    basePriceCents: number; // Preço do cartão (tabela 10x)
    pixPriceCents: number; // Preço à vista no PIX
    targetNetCents: number; // Margem líquida desejada
    customerDiscountCents: number; // Desconto cupom
    influencerCommissionCents: number; // Comissão influencer
    cardFeeCents: number; // Taxa operadora 10x
    anchorPriceCents: number; // Âncora "De"
    maxInstallments: number; // 10x
  }) => void;
}

export function SmartPricingAssistant({
  initialTargetNetCents = 99000,
  initialCustomerDiscountCents = 10000,
  initialInfluencerCommissionCents = 10000,
  initialCardFeeCents = 20000,
  onApplyPrices,
}: SmartPricingAssistantProps) {
  const [isOpen, setIsOpen] = useState(true);

  // Estados com inputs editáveis em Reais (R$)
  const [targetNetReais, setTargetNetReais] = useState<number>(
    (initialTargetNetCents || 99000) / 100
  );
  const [customerDiscountReais, setCustomerDiscountReais] = useState<number>(
    (initialCustomerDiscountCents ?? 10000) / 100
  );
  const [influencerCommissionReais, setInfluencerCommissionReais] = useState<number>(
    (initialInfluencerCommissionCents ?? 10000) / 100
  );
  const [cardFeeReais, setCardFeeReais] = useState<number>(
    (initialCardFeeCents ?? 20000) / 100
  );
  const [installments, setInstallments] = useState<number>(10);
  const [appliedSuccess, setAppliedSuccess] = useState(false);

  // Sincroniza quando o modelo selecionado mudar ou ao abrir o modal
  useEffect(() => {
    if (initialTargetNetCents && initialTargetNetCents > 0) {
      setTargetNetReais(initialTargetNetCents / 100);
    }
    if (initialCustomerDiscountCents !== undefined && initialCustomerDiscountCents > 0) {
      setCustomerDiscountReais(initialCustomerDiscountCents / 100);
    }
    if (initialInfluencerCommissionCents !== undefined && initialInfluencerCommissionCents > 0) {
      setInfluencerCommissionReais(initialInfluencerCommissionCents / 100);
    }
    if (initialCardFeeCents !== undefined && initialCardFeeCents > 0) {
      setCardFeeReais(initialCardFeeCents / 100);
    }
  }, [
    initialTargetNetCents,
    initialCustomerDiscountCents,
    initialInfluencerCommissionCents,
    initialCardFeeCents,
  ]);

  // Calcula o resultado da engenharia reversa em tempo real
  const pricingResult: ReversePricingResult = calculateReversePricing({
    targetNetCents: Math.round((targetNetReais || 0) * 100),
    customerDiscountCents: Math.round((customerDiscountReais || 0) * 100),
    influencerCommissionCents: Math.round((influencerCommissionReais || 0) * 100),
    cardFeeCents: Math.round((cardFeeReais || 0) * 100),
    installments,
  });

  const handleApply = () => {
    onApplyPrices({
      basePriceCents: pricingResult.cardPriceCents,
      pixPriceCents: pricingResult.pixPriceCents,
      targetNetCents: pricingResult.targetNetCents,
      customerDiscountCents: pricingResult.customerDiscountCents,
      influencerCommissionCents: pricingResult.influencerCommissionCents,
      cardFeeCents: pricingResult.cardFeeCents,
      anchorPriceCents: pricingResult.anchorPriceCents,
      maxInstallments: pricingResult.installments,
    });
    setAppliedSuccess(true);
    setTimeout(() => {
      setAppliedSuccess(false);
    }, 1500);
  };

  return (
    <div className="mb-6 rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/50 via-slate-900/80 to-slate-950/95 p-4 sm:p-5 backdrop-blur-md shadow-2xl">
      {/* Header do Assistente */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/25 text-white shrink-0">
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
              Digite quanto quer receber limpo no bolso, o desconto do cliente, comissão e taxa do cartão. O sistema calcula a precificação exata.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="self-start sm:self-auto px-3 py-1.5 rounded-xl bg-indigo-600/25 hover:bg-indigo-600/40 text-indigo-300 hover:text-white border border-indigo-500/40 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>{isOpen ? "Ocultar Simulador" : "Abrir Simulador"}</span>
          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
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
            <span className="text-slate-400">Desconto:</span>
            <span className="font-bold text-amber-300">
              - {formatBRL(pricingResult.customerDiscountCents)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Comissão:</span>
            <span className="font-bold text-rose-300">
              - {formatBRL(pricingResult.influencerCommissionCents)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Custo Cartão:</span>
            <span className="font-bold text-indigo-300">
              - {formatBRL(pricingResult.cardFeeCents)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Preço Cartão (10x):</span>
            <span className="font-extrabold text-white">
              {formatBRL(pricingResult.cardPriceCents)}
            </span>
          </div>
        </div>
      )}

      {/* Conteúdo Completo do Simulador */}
      {isOpen && (
        <div className="mt-5 space-y-6 pt-1">
          {/* Seção 1: Inputs Numéricos dos 4 Pilares de Custos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* 1. Meta no Bolso (Líquido) */}
            <div className="bg-slate-950/90 border border-emerald-500/40 rounded-xl p-3.5 shadow-inner">
              <label className="block text-[11px] font-extrabold text-emerald-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                <span>1. Meta no Bolso (Líquido) *</span>
              </label>
              <div className="relative mt-1.5">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-extrabold text-xs">
                  R$
                </span>
                <input
                  type="number"
                  step="10"
                  min="0"
                  value={targetNetReais || ""}
                  onChange={(e) => setTargetNetReais(parseFloat(e.target.value || "0"))}
                  placeholder="990,00"
                  className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-emerald-400 font-extrabold text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-1 mt-2 flex-wrap text-[10px]">
                <button
                  type="button"
                  onClick={() => setTargetNetReais(950)}
                  className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
                >
                  950
                </button>
                <button
                  type="button"
                  onClick={() => setTargetNetReais(990)}
                  className="px-1.5 py-0.5 rounded bg-emerald-950 hover:bg-emerald-900 text-emerald-300 font-bold border border-emerald-500/30"
                >
                  990
                </button>
                <button
                  type="button"
                  onClick={() => setTargetNetReais(1590)}
                  className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
                >
                  1.590
                </button>
              </div>
            </div>

            {/* 2. Desconto para o Cliente (Cupom) */}
            <div className="bg-slate-950/90 border border-amber-500/40 rounded-xl p-3.5 shadow-inner">
              <label className="block text-[11px] font-extrabold text-amber-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-amber-400" />
                <span>2. Desconto Cliente (Cupom)</span>
              </label>
              <div className="relative mt-1.5">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-extrabold text-xs">
                  R$
                </span>
                <input
                  type="number"
                  step="10"
                  min="0"
                  value={customerDiscountReais || ""}
                  onChange={(e) => setCustomerDiscountReais(parseFloat(e.target.value || "0"))}
                  placeholder="100,00"
                  className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-amber-300 font-extrabold text-sm focus:border-amber-500 focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-1 mt-2 flex-wrap text-[10px]">
                <button
                  type="button"
                  onClick={() => setCustomerDiscountReais(50)}
                  className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
                >
                  50
                </button>
                <button
                  type="button"
                  onClick={() => setCustomerDiscountReais(100)}
                  className="px-1.5 py-0.5 rounded bg-amber-950 hover:bg-amber-900 text-amber-300 font-bold border border-amber-500/30"
                >
                  100
                </button>
                <button
                  type="button"
                  onClick={() => setCustomerDiscountReais(150)}
                  className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
                >
                  150
                </button>
              </div>
            </div>

            {/* 3. Comissão do Influenciador */}
            <div className="bg-slate-950/90 border border-rose-500/40 rounded-xl p-3.5 shadow-inner">
              <label className="block text-[11px] font-extrabold text-rose-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-rose-400" />
                <span>3. Comissão Influencer</span>
              </label>
              <div className="relative mt-1.5">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-extrabold text-xs">
                  R$
                </span>
                <input
                  type="number"
                  step="10"
                  min="0"
                  value={influencerCommissionReais || ""}
                  onChange={(e) => setInfluencerCommissionReais(parseFloat(e.target.value || "0"))}
                  placeholder="100,00"
                  className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-rose-300 font-extrabold text-sm focus:border-rose-500 focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-1 mt-2 flex-wrap text-[10px]">
                <button
                  type="button"
                  onClick={() => setInfluencerCommissionReais(50)}
                  className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
                >
                  50
                </button>
                <button
                  type="button"
                  onClick={() => setInfluencerCommissionReais(100)}
                  className="px-1.5 py-0.5 rounded bg-rose-950 hover:bg-rose-900 text-rose-300 font-bold border border-rose-500/30"
                >
                  100
                </button>
                <button
                  type="button"
                  onClick={() => setInfluencerCommissionReais(150)}
                  className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
                >
                  150
                </button>
              </div>
            </div>

            {/* 4. Custo Cartão 10x (Operadora) */}
            <div className="bg-slate-950/90 border border-indigo-500/40 rounded-xl p-3.5 shadow-inner">
              <label className="block text-[11px] font-extrabold text-indigo-300 uppercase tracking-wider mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-indigo-400" />
                  <span>4. Custo Cartão ({installments}x)</span>
                </span>
                <span className="text-[9px] text-slate-400">taxa bancária</span>
              </label>
              <div className="relative mt-1.5">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-extrabold text-xs">
                  R$
                </span>
                <input
                  type="number"
                  step="10"
                  min="0"
                  value={cardFeeReais || ""}
                  onChange={(e) => setCardFeeReais(parseFloat(e.target.value || "0"))}
                  placeholder="200,00"
                  className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-indigo-300 font-extrabold text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-1 mt-2 flex-wrap text-[10px]">
                <button
                  type="button"
                  onClick={() => setCardFeeReais(200)}
                  className="px-1.5 py-0.5 rounded bg-indigo-950 hover:bg-indigo-900 text-indigo-300 font-bold border border-indigo-500/30"
                >
                  200
                </button>
                <button
                  type="button"
                  onClick={() => {
                    // Cálculo automático de taxa estimada ~14.5% sobre o subtotal
                    const base = targetNetReais + customerDiscountReais + influencerCommissionReais;
                    setCardFeeReais(Math.round(base * 0.17));
                  }}
                  className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
                >
                  Auto (~17%)
                </button>
              </div>
            </div>
          </div>

          {/* Resumo da Equação Contábil */}
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-slate-400 font-medium">Equação Reversa:</span>
              <span className="font-bold text-emerald-400">R$ {targetNetReais.toFixed(2)} (Bolso)</span>
              <span className="text-slate-500">+</span>
              <span className="font-bold text-amber-300">R$ {customerDiscountReais.toFixed(2)} (Cupom)</span>
              <span className="text-slate-500">+</span>
              <span className="font-bold text-rose-300">R$ {influencerCommissionReais.toFixed(2)} (Comissão)</span>
              <span className="text-slate-500">+</span>
              <span className="font-bold text-indigo-300">R$ {cardFeeReais.toFixed(2)} (Cartão)</span>
              <span className="text-slate-500">=</span>
              <span className="font-black text-white bg-indigo-600/30 px-2 py-0.5 rounded border border-indigo-500/40">
                {formatBRL(pricingResult.cardPriceCents)} no Cartão
              </span>
            </div>

            <div className="text-[11px] text-cyan-400 font-bold flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 fill-cyan-400" />
              <span>PIX Base: {formatBRL(pricingResult.pixInfluencerBaseCents)} (isento da taxa de R$ {cardFeeReais.toFixed(2)})</span>
            </div>
          </div>

          {/* Seção 2: Cards de Preços Finais Calculados */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Card 1: Cartão 10x */}
            <div className="p-4 rounded-xl border border-indigo-500/50 bg-indigo-950/30 backdrop-blur-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 text-xs text-indigo-300 font-bold">
                  <CreditCard className="w-4 h-4" />
                  <span>Preço Cartão (Tabela {installments}x)</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[9px] font-bold uppercase border border-indigo-500/30">
                  {installments}x no Cartão
                </span>
              </div>
              <div className="text-2xl font-black text-white mt-1">
                {formatBRL(pricingResult.cardPriceCents)}
              </div>
              <p className="text-[11px] text-indigo-300/90 mt-1 font-medium">
                {installments}x de {formatBRL(pricingResult.installmentMonthlyCents)} na vitrine
              </p>
              <div className="mt-2 pt-2 border-t border-indigo-500/20 text-[11px] text-slate-300">
                Com cupom de R$ {customerDiscountReais.toFixed(2)}: <strong className="text-white">{formatBRL(pricingResult.cardPriceWithDiscountCents)}</strong> ({installments}x de {formatBRL(pricingResult.installmentWithDiscountMonthlyCents)})
              </div>
            </div>

            {/* Card 2: PIX via Influencer */}
            <div className="p-4 rounded-xl border border-cyan-500/50 bg-cyan-950/30 backdrop-blur-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 text-xs text-cyan-300 font-bold">
                  <Zap className="w-4 h-4 fill-cyan-400" />
                  <span>Preço PIX c/ Cupom</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[9px] font-bold uppercase border border-cyan-500/30">
                  Sem Taxa Cartão
                </span>
              </div>
              <div className="text-2xl font-black text-white mt-1">
                {formatBRL(pricingResult.pixPriceWithDiscountCents)}
              </div>
              <p className="text-[11px] text-cyan-300/90 mt-1 font-medium">
                Tabela Base {formatBRL(pricingResult.pixInfluencerBaseCents)} - R$ {customerDiscountReais.toFixed(2)} cupom
              </p>
              <div className="mt-2 pt-2 border-t border-cyan-500/20 text-[11px] text-slate-300">
                Paga R$ {influencerCommissionReais.toFixed(2)} ao influencer e <strong className="text-emerald-400">sobra R$ {targetNetReais.toFixed(2)} no bolso</strong>.
              </div>
            </div>

            {/* Card 3: PIX Direto à Vista */}
            <div className="p-4 rounded-xl border border-emerald-500/50 bg-emerald-950/30 backdrop-blur-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  <span>Preço no PIX à Vista</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[9px] font-bold uppercase border border-emerald-500/30">
                  À Vista Direto
                </span>
              </div>
              <div className="text-2xl font-black text-white mt-1">
                {formatBRL(pricingResult.pixPriceCents)}
              </div>
              <p className="text-[11px] text-emerald-300/90 mt-1 font-medium">
                Economia de {pricingResult.effectivePixDiscountPercent}% em relação à tabela do cartão
              </p>
              <div className="mt-2 pt-2 border-t border-emerald-500/20 text-[11px] text-slate-300">
                Venda direta no site sem intermediários: <strong className="text-emerald-400">100% no bolso</strong>.
              </div>
            </div>
          </div>

          {/* Seção 3: DRE Contábil Comparativo */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/80">
            <h5 className="text-xs font-extrabold text-slate-200 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>DRE Contábil — Fechamento Financeiro por Canal</span>
            </h5>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Cenário 1: Cartão 10x */}
              <div className="p-3.5 rounded-lg border border-indigo-500/30 bg-slate-900/60 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">1. Cartão {installments}x (Influencer)</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold">
                    Meta 100%
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 space-y-1 pt-1.5">
                  <div className="flex justify-between">
                    <span>(+) Preço Tabela:</span>
                    <span className="text-white font-semibold">{formatBRL(pricingResult.cardPriceCents)}</span>
                  </div>
                  <div className="flex justify-between text-amber-300">
                    <span>(-) Cupom do Cliente:</span>
                    <span>- {formatBRL(pricingResult.customerDiscountCents)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-slate-200">
                    <span>(=) Cliente Paga ({installments}x):</span>
                    <span>{formatBRL(pricingResult.cardPriceWithDiscountCents)}</span>
                  </div>
                  <div className="flex justify-between text-indigo-300">
                    <span>(-) Custo Cartão {installments}x:</span>
                    <span>- {formatBRL(pricingResult.cardFeeCents)}</span>
                  </div>
                  <div className="flex justify-between text-rose-300">
                    <span>(-) Comissão Parceiro:</span>
                    <span>- {formatBRL(pricingResult.influencerCommissionCents)}</span>
                  </div>
                  <div className="flex justify-between pt-1.5 border-t border-white/10 font-black text-emerald-400 text-xs">
                    <span>(=) NO SEU BOLSO:</span>
                    <span>{formatBRL(pricingResult.targetNetCents)}</span>
                  </div>
                </div>
              </div>

              {/* Cenário 2: PIX com Influencer */}
              <div className="p-3.5 rounded-lg border border-cyan-500/30 bg-slate-900/60 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">2. PIX via Influencer</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold">
                    Sem Taxa Cartão
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 space-y-1 pt-1.5">
                  <div className="flex justify-between">
                    <span>(+) Preço Base PIX:</span>
                    <span className="text-white font-semibold">{formatBRL(pricingResult.pixInfluencerBaseCents)}</span>
                  </div>
                  <div className="flex justify-between text-amber-300">
                    <span>(-) Cupom do Cliente:</span>
                    <span>- {formatBRL(pricingResult.customerDiscountCents)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-slate-200">
                    <span>(=) Cliente Paga no PIX:</span>
                    <span>{formatBRL(pricingResult.pixPriceWithDiscountCents)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-400">
                    <span>(-) Taxa de Cartão:</span>
                    <span>R$ 0,00 (Isento)</span>
                  </div>
                  <div className="flex justify-between text-rose-300">
                    <span>(-) Comissão Parceiro:</span>
                    <span>- {formatBRL(pricingResult.influencerCommissionCents)}</span>
                  </div>
                  <div className="flex justify-between pt-1.5 border-t border-white/10 font-black text-emerald-400 text-xs">
                    <span>(=) NO SEU BOLSO:</span>
                    <span>{formatBRL(pricingResult.targetNetCents)}</span>
                  </div>
                </div>
              </div>

              {/* Cenário 3: PIX Direto */}
              <div className="p-3.5 rounded-lg border border-emerald-500/30 bg-slate-900/60 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">3. PIX Direto à Vista</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">
                    Venda Direta
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 space-y-1 pt-1.5">
                  <div className="flex justify-between">
                    <span>(+) Preço à Vista:</span>
                    <span className="text-white font-semibold">{formatBRL(pricingResult.pixPriceCents)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>(-) Cupom:</span>
                    <span>R$ 0,00</span>
                  </div>
                  <div className="flex justify-between font-semibold text-slate-200">
                    <span>(=) Cliente Paga à Vista:</span>
                    <span>{formatBRL(pricingResult.pixPriceCents)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>(-) Taxas / Comissões:</span>
                    <span>R$ 0,00</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>(-) Taxa Cartão:</span>
                    <span>R$ 0,00</span>
                  </div>
                  <div className="flex justify-between pt-1.5 border-t border-white/10 font-black text-emerald-400 text-xs">
                    <span>(=) NO SEU BOLSO:</span>
                    <span>{formatBRL(pricingResult.targetNetCents)}</span>
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
                  : "bg-gradient-to-r from-indigo-500 via-indigo-600 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white shadow-indigo-500/25 active:scale-95"
              }`}
            >
              {appliedSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Preços Aplicados ao Formulário!</span>
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
