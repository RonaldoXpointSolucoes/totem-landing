"use client";

import React from "react";
import { Card } from "@/components/ui";
import { formatBRL, simulateMercadoPagoCardBreakdown } from "@/modules/pricing/pricingEngine";
import {
  Package,
  Boxes,
  Check,
  ArrowRight,
  Wrench,
  Sparkles,
  Layers,
} from "lucide-react";

interface StepPurchaseModeProps {
  cabinetName: string;
  purchaseMode: "cabinet" | "kit" | null;
  cabinetPixCents: number;
  cabinetCardCents: number;
  kitPixCents: number;
  kitCardCents: number;
  kitOnlyCents: number;
  kitAccessoryCount: number;
  kitPcName?: string;
  kitPcShortSpecs?: string[];
  kitPcNotice?: string;
  onSelectCabinet: () => void;
  onSelectKit: () => void;
}

/**
 * Etapa 03 — Decisão binária inicial de modalidade:
 * O cliente escolhe se quer apenas a estrutura CNC do gabinete (e informa suas peças)
 * ou se deseja o Gabinete + Kit de Montagem Completo.
 */
export const StepPurchaseMode: React.FC<StepPurchaseModeProps> = ({
  cabinetName,
  purchaseMode,
  cabinetPixCents,
  cabinetCardCents,
  kitPixCents,
  kitCardCents,
  kitOnlyCents,
  kitAccessoryCount,
  kitPcName = 'All-in-One Grasep 21,5" Touch Core i7 (16GB • SSD 128GB + HD 500GB)',
  kitPcShortSpecs = ['PC Touch 21,5" i7 • 16GB', "Impressora 80mm"],
  kitPcNotice = "Windows 10 Pro Trial • Garantia 3 meses",
  onSelectCabinet,
  onSelectKit,
}) => {
  const isCabinet = purchaseMode === "cabinet";
  const isKit = purchaseMode === "kit";
  const cabinetCardSim = simulateMercadoPagoCardBreakdown(cabinetPixCents);
  const kitCardSim = simulateMercadoPagoCardBreakdown(kitPixCents);

  return (
    <div className="space-y-4">
      <div className="text-center sm:text-left space-y-1.5">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-indigo-950/60 border border-blue-200 dark:border-indigo-800 text-[#0071e3] dark:text-cyan-300 text-[10px] font-black uppercase tracking-wider">
          <Layers className="w-3 h-3" />
          <span>Modalidade de Compra</span>
        </div>

        <h2 className="text-lg sm:text-2xl font-black text-[#1d1d1f] dark:text-white tracking-tight">
          Como você deseja adquirir o seu {cabinetName}?
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
          Escolha uma das opções abaixo para abrirmos somente os passos que você precisa.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* Opção A: Apenas o Gabinete */}
        <Card
          interactive
          selected={isCabinet}
          onClick={onSelectCabinet}
          className={`p-4 sm:p-5 rounded-2xl flex flex-col justify-between gap-4 transition-all active:scale-[0.985] cursor-pointer ${
            isCabinet
              ? "border-[#0071e3] bg-blue-50/40 dark:bg-indigo-950/30 ring-2 ring-[#0071e3]/25 shadow-md"
              : "bg-white dark:bg-slate-900 border-black/10 dark:border-slate-800 hover:border-[#0071e3]/60"
          }`}
        >
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                <Package className="w-5 h-5" />
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-emerald-500/25">
                  Furação Grátis (+ R$ 0,00)
                </span>
                {isCabinet && (
                  <span className="w-5 h-5 rounded-full bg-[#0071e3] text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-black text-[#1d1d1f] dark:text-white leading-snug">
                Quero APENAS o Gabinete
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Já tenho ou vou comprar meu monitor, impressora e leitor à parte. Entregamos o chassi CNC com recortes exatos para seus equipamentos.
              </p>
            </div>

            <ul className="space-y-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
              <li className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Escolha do seu Monitor (corte exato)</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Escolha da Impressora Térmica e Leitor 2D</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Sem custos extras de eletrônicos</span>
              </li>
            </ul>
          </div>

          <div className="pt-3 border-t border-black/10 dark:border-slate-800 space-y-2.5">
            <div>
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400">
                  {formatBRL(cabinetPixCents)}
                </span>
                <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-300 uppercase">
                  no PIX • Valor atual
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                Cartão: <strong className="text-slate-700 dark:text-slate-200">1x de {formatBRL(cabinetCardSim.safeCardChargeCents)}</strong>{" "}
                · até 10x de ~{formatBRL(cabinetCardSim.buyer10xInstallmentCents)} (c/ juros MP)
              </p>
            </div>

            <div className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-extrabold flex items-center justify-between transition-colors shadow-sm">
              <span>Escolher Monitor e Impressora</span>
              <ArrowRight className="w-4 h-4 shrink-0" />
            </div>
          </div>
        </Card>

        {/* Opção B: Gabinete + Kit de Montagem Completo */}
        <Card
          interactive
          selected={isKit}
          onClick={onSelectKit}
          className={`p-4 sm:p-5 rounded-2xl flex flex-col justify-between gap-4 transition-all active:scale-[0.985] cursor-pointer ${
            isKit
              ? "border-[#0071e3] bg-gradient-to-br from-blue-50/80 via-indigo-50/40 to-white dark:from-indigo-950/60 dark:to-slate-900 ring-2 ring-[#0071e3]/25 shadow-md"
              : "bg-gradient-to-br from-blue-50/40 via-indigo-50/20 to-white dark:from-slate-900 dark:to-slate-950 border-blue-200 dark:border-indigo-800/70 hover:border-[#0071e3]"
          }`}
        >
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="w-11 h-11 rounded-xl bg-[#0071e3]/15 border border-[#0071e3]/30 text-[#0071e3] dark:text-cyan-300 flex items-center justify-center shrink-0">
                <Boxes className="w-5 h-5" />
              </div>

              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                <span className="inline-flex items-center gap-1 text-[10px] font-black text-[#0071e3] dark:text-cyan-300 bg-blue-100/90 dark:bg-indigo-950 px-2.5 py-0.5 rounded-full border border-blue-300 dark:border-indigo-700">
                  <Sparkles className="w-3 h-3" />
                  Kit Completo (+ {formatBRL(kitOnlyCents)})
                </span>
                {isKit && (
                  <span className="w-5 h-5 rounded-full bg-[#0071e3] text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-black text-[#1d1d1f] dark:text-white leading-snug">
                Quero Gabinete + Kit de Montagem
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Receba o gabinete com <strong>{kitPcName}</strong>, Impressora Térmica 80mm e todos os acessórios elétricos compatíveis.
              </p>
              {kitPcNotice && (
                <p className="text-[11px] font-bold text-amber-700 dark:text-amber-300">
                  ⚠️ {kitPcNotice}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {kitPcShortSpecs.map((chip, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-blue-200/80 dark:border-indigo-800 text-[10px] font-bold text-slate-700 dark:text-slate-200"
                >
                  ✓ {chip}
                </span>
              ))}
              <span className="px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-blue-200/80 dark:border-indigo-800 text-[10px] font-bold text-slate-700 dark:text-slate-200">
                + {kitAccessoryCount} acessórios elétricos
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-300/70 dark:border-amber-800 text-[10px] font-bold text-amber-800 dark:text-amber-300">
                <Wrench className="w-3 h-3" />
                Opção ir 100% Montado
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-blue-200/70 dark:border-indigo-900/70 space-y-2.5">
            <div>
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className="text-lg sm:text-xl font-black text-[#0071e3] dark:text-cyan-400">
                  {formatBRL(kitPixCents)}
                </span>
                <span className="text-[10px] font-black text-[#0071e3] dark:text-cyan-300 uppercase">
                  no PIX (Gabinete + Kit)
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                Cartão: <strong className="text-slate-700 dark:text-slate-200">1x de {formatBRL(kitCardSim.safeCardChargeCents)}</strong>{" "}
                · até 10x de ~{formatBRL(kitCardSim.buyer10xInstallmentCents)} (c/ juros MP)
              </p>
            </div>

            <div className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-extrabold flex items-center justify-between transition-colors shadow-sm shadow-blue-500/20">
              <span>Personalizar Kit e Montagem</span>
              <ArrowRight className="w-4 h-4 shrink-0" />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
