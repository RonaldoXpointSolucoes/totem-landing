"use client";

import React from "react";
import { formatBRL } from "@/modules/pricing/pricingEngine";
import { Zap, CreditCard } from "lucide-react";

export interface PriceTagProps {
  pixPriceCents: number;
  cardPriceCents: number;
  anchorPriceCents?: number;
  installments?: number;
  size?: "sm" | "md" | "lg";
  showAnchor?: boolean;
  className?: string;
}

export function PriceTag({
  pixPriceCents,
  cardPriceCents,
  anchorPriceCents,
  installments = 10,
  size = "md",
  showAnchor = true,
  className = "",
}: PriceTagProps) {
  const safePix = Math.max(0, pixPriceCents);
  const safeCard = Math.max(0, cardPriceCents || safePix);
  const safeInstallments = Math.max(1, installments);
  const monthlyCents = Math.round(safeCard / safeInstallments);

  // Calcula desconto do PIX em relação ao cartão se houver diferença
  const discountPercent =
    safeCard > safePix
      ? Math.round(((safeCard - safePix) / safeCard) * 100)
      : 0;

  return (
    <div className={`space-y-1 ${className}`}>
      {/* Preço Âncora "De" (se configurado) */}
      {showAnchor && anchorPriceCents && anchorPriceCents > safeCard && (
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-slate-400 dark:text-slate-500 line-through font-medium">
            De {formatBRL(anchorPriceCents)}
          </span>
          {discountPercent > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-extrabold uppercase border border-emerald-500/20">
              Economize {discountPercent}% no PIX
            </span>
          )}
        </div>
      )}

      {/* Destaque Principal: Preço no PIX */}
      <div className="flex items-baseline gap-2 flex-wrap">
        <span
          className={`font-black tracking-tight text-emerald-600 dark:text-emerald-400 ${
            size === "lg"
              ? "text-2xl sm:text-3xl"
              : size === "sm"
              ? "text-lg"
              : "text-xl sm:text-2xl"
          }`}
        >
          {formatBRL(safePix)}
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-extrabold border border-emerald-500/30">
          <Zap className="w-3 h-3 fill-emerald-500" />
          <span>no PIX à vista</span>
        </span>
      </div>

      {/* Linha Secundária: Parcelamento no Cartão */}
      {safeCard > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
          <CreditCard className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
          <span>
            ou em até{" "}
            <strong className="text-slate-700 dark:text-slate-200 font-bold">
              {safeInstallments}x de {formatBRL(monthlyCents)}
            </strong>{" "}
            no cartão
          </span>
        </div>
      )}
    </div>
  );
}
