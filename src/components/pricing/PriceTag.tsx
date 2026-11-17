"use client";

import React from "react";
import { formatBRL, simulateMercadoPagoCardBreakdown } from "@/modules/pricing/pricingEngine";
import { Zap, CreditCard } from "lucide-react";

export interface PriceTagProps {
  pixPriceCents: number;
  cardPriceCents?: number;
  anchorPriceCents?: number;
  installments?: number;
  size?: "sm" | "md" | "lg";
  showAnchor?: boolean;
  className?: string;
}

export function PriceTag({
  pixPriceCents,
  anchorPriceCents,
  installments = 10,
  size = "md",
  showAnchor = true,
  className = "",
}: PriceTagProps) {
  const safePix = Math.max(0, pixPriceCents);
  const cardSim = simulateMercadoPagoCardBreakdown(safePix);
  const safeCard1x = cardSim.safeCardChargeCents;
  const safeInstallments = Math.max(1, installments);

  // Calcula economia real do PIX frente ao parcelado 10x (ou âncora)
  const discountPercent =
    cardSim.buyer10xTotalCents > safePix
      ? Math.round(((cardSim.buyer10xTotalCents - safePix) / cardSim.buyer10xTotalCents) * 100)
      : 0;

  return (
    <div className={`space-y-1 ${className}`}>
      {/* Preço Âncora "De" (se configurado) */}
      {showAnchor && anchorPriceCents && anchorPriceCents > safeCard1x && (
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-slate-600 dark:text-slate-400 line-through font-medium">
            De {formatBRL(anchorPriceCents)}
          </span>
          {discountPercent > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 text-[9px] font-extrabold uppercase border border-emerald-600/30">
              Economize {discountPercent}% no PIX
            </span>
          )}
        </div>
      )}

      {/* Destaque Principal: Preço no PIX */}
      <div className="flex items-baseline gap-2 flex-wrap">
        <span
          className={`font-black tracking-tight text-emerald-700 dark:text-emerald-400 ${
            size === "lg"
              ? "text-2xl sm:text-3xl"
              : size === "sm"
              ? "text-lg"
              : "text-xl sm:text-2xl"
          }`}
        >
          {formatBRL(safePix)}
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 text-[10px] font-extrabold border border-emerald-600/30">
          <Zap className="w-3 h-3 fill-current" />
          no PIX à vista
        </span>
      </div>

      {/* Linha Secundária: Cartão 1x real + 10x fiel ao Mercado Pago */}
      {safeCard1x > 0 && (
        <div className="flex items-start gap-1.5 text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 font-medium leading-snug">
          <CreditCard className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
          <span>
            ou{" "}
            <strong className="text-slate-800 dark:text-slate-200 font-bold">
              1x de {formatBRL(safeCard1x)}
            </strong>{" "}
            no cartão{" "}
            <span className="text-slate-500 dark:text-slate-400">
              (ou até {safeInstallments}x de ~{formatBRL(cardSim.buyer10xInstallmentCents)} c/ juros MP)
            </span>
          </span>
        </div>
      )}
    </div>
  );
}
