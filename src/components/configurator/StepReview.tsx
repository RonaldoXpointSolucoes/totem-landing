"use client";

import React, { useState } from "react";
import { CabinetModel, ColorOption, MonitorOption, PrinterOption, BarcodeReaderOption } from "@/types/catalog";
import { formatBRL, PriceBreakdown } from "@/modules/pricing/pricingEngine";
import { Card, Button, Badge } from "@/components/ui";
import { Edit3, ShoppingCart, ShieldCheck, Boxes, Check, PackageCheck, AlertCircle, Tag, Loader2, Zap, CreditCard, Wrench, Package, Sparkles } from "lucide-react";
import { isItemKit, getEffectiveKitItems, calculateKitTotalCents } from "@/modules/catalog/kitDefaults";
import { useCart } from "@/modules/cart/CartContext";

interface StepReviewProps {
  model: CabinetModel;
  color: ColorOption;
  monitor: MonitorOption | null;
  printer: PrinterOption | null;
  reader: BarcodeReaderOption | null;
  useReader: boolean;
  pricing: PriceBreakdown;
  includeAssemblyService?: boolean;
  onToggleAssemblyService?: (include: boolean) => void;
  customizationNotes?: string;
  onChangeNotes?: (notes: string) => void;
  onEditStep: (stepNumber: number) => void;
  onAddToCart: () => void;
}

export const StepReview: React.FC<StepReviewProps> = ({
  model,
  color,
  monitor,
  printer,
  reader,
  useReader,
  pricing,
  includeAssemblyService = false,
  onToggleAssemblyService,
  customizationNotes = "",
  onChangeNotes,
  onEditStep,
  onAddToCart,
}) => {
  const { appliedCoupon, applyCoupon, removeCoupon, isApplyingCoupon, couponError } = useCart();
  const [couponInput, setCouponInput] = useState("");
  const [showInput, setShowInput] = useState(false);

  const isKit = isItemKit(monitor);
  const kitItems = isKit ? (monitor?.kitItems || getEffectiveKitItems(monitor)) : [];
  const activeKitItems = kitItems.filter((i) => i.selected);
  const kitTotalCents = calculateKitTotalCents(kitItems);

  const itemDiscountCents = appliedCoupon
    ? Math.round(model.basePriceCents * (appliedCoupon.discountPercent / 100))
    : 0;
  const finalTotemPriceCents = Math.max(0, pricing.cardTotalPriceCents - itemDiscountCents);
  const reviewPixTotal = Math.max(0, pricing.pixTotalPriceCents - itemDiscountCents);

  const printerSubItem = kitItems.find((i) => i.category === "printer");
  const readerSubItem = kitItems.find((i) => i.category === "reader");

  return (
    <div className="space-y-3 sm:space-y-4 pb-8">
      {appliedCoupon ? (
        <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="font-semibold">
              Cupom de parceiro ativo: <strong className="font-mono text-emerald-800 dark:text-emerald-300">{appliedCoupon.code}</strong>
            </span>
            <span className="text-[11px] font-bold bg-emerald-500/20 px-2 py-0.5 rounded-full">
              {appliedCoupon.discountPercent}% OFF no Gabinete
            </span>
          </div>
          <button
            type="button"
            onClick={removeCoupon}
            className="text-[11px] text-rose-500 hover:text-rose-600 font-semibold cursor-pointer ml-2"
          >
            Remover
          </button>
        </div>
      ) : (
        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-black/10 dark:border-slate-800 text-xs shadow-xs">
          {!showInput ? (
            <button
              type="button"
              onClick={() => setShowInput(true)}
              className="text-[#0071e3] hover:underline font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Tag className="w-3.5 h-3.5" />
              <span>Possui cupom de desconto de vendedor ou influenciador? Clique aqui</span>
            </button>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-[#0071e3]" />
                  Cupom de Desconto de Parceiro
                </span>
                <button
                  type="button"
                  onClick={() => setShowInput(false)}
                  className="text-slate-400 hover:text-slate-600 text-xs"
                >
                  Cancelar
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Código do cupom (ex: CARLOS10)..."
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      applyCoupon(couponInput);
                    }
                  }}
                  className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-950 border border-black/15 dark:border-slate-800 rounded-xl text-xs font-mono uppercase placeholder-slate-400 text-slate-900 dark:text-white focus:outline-none focus:border-[#0071e3]"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyCoupon(couponInput)}
                  disabled={isApplyingCoupon || !couponInput.trim()}
                  className="h-auto py-1 px-3 text-xs font-bold shrink-0"
                >
                  {isApplyingCoupon ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Aplicar"}
                </Button>
              </div>
              {couponError && (
                <p className="text-[11px] text-rose-500 font-semibold">{couponError}</p>
              )}
            </div>
          )}
        </div>
      )}

      <div className="text-center sm:text-left space-y-1">
        <h2 className="text-lg sm:text-2xl font-black text-[#1d1d1f] dark:text-white tracking-tight">
          Confira as especificações do seu Gabinete
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
          Esta será a ficha técnica exata de cortes e encaixes utilizada na Router CNC.
        </p>
      </div>

      {/* Ficha Técnica de Produção Otimizada em 2 Colunas */}
      <Card className="p-4 sm:p-5 rounded-2xl space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-black/10 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm sm:text-base font-black text-[#1d1d1f] dark:text-white">
              Ficha Técnica de Engenharia
            </h3>
            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-500/20 whitespace-nowrap">
              100% Homologado CNC
            </span>
          </div>
          <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">
            {model.dimensions ? `${model.dimensions.heightMm}×${model.dimensions.widthMm}×${model.dimensions.depthMm} mm` : ""}
          </span>
        </div>

        {/* DETALHAMENTO DO MONITOR SOB MEDIDA (QUANDO CONFIGURADO) */}
        {monitor?.isCustom && monitor?.customDimensions && (
          <div className="p-3 sm:p-4 rounded-xl bg-gradient-to-r from-indigo-50/80 to-blue-50/70 dark:from-indigo-950/40 dark:to-slate-900 border border-indigo-200 dark:border-indigo-800/80 space-y-2.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <h4 className="text-xs sm:text-sm font-black text-[#1d1d1f] dark:text-white">
                  Gabarito CNC — Monitor Sob Medida ({monitor.displayName})
                </h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  {monitor.sizeInches}&quot; • VESA {monitor.vesaPattern}
                  {monitor.customDimensions.productUrl ? ` • Link informado` : ""}
                </p>
              </div>
              <button
                onClick={() => onEditStep(3)}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700 border border-black/10 dark:border-slate-700 text-indigo-600 dark:text-indigo-300 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs"
              >
                <Edit3 className="w-3 h-3" />
                <span>Editar Medidas</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1.5 border-t border-indigo-100 dark:border-indigo-900/60 text-[11px]">
              <div className="p-2 rounded-lg bg-white/90 dark:bg-slate-900/90 border border-indigo-200/70 dark:border-indigo-900">
                <span className="text-[10px] font-extrabold uppercase text-indigo-600 dark:text-indigo-400 block">
                  1. Monitor Inteiro (Carcaça)
                </span>
                <strong className="text-slate-900 dark:text-white font-mono">
                  {monitor.customDimensions.outerWidthCm} × {monitor.customDimensions.outerHeightCm} cm
                </strong>
                {monitor.customDimensions.depthCm ? (
                  <span className="text-[10px] text-slate-500 block">
                    Espessura: {monitor.customDimensions.depthCm} cm
                  </span>
                ) : null}
              </div>

              <div className="p-2 rounded-lg bg-white/90 dark:bg-slate-900/90 border border-cyan-200/70 dark:border-cyan-900">
                <span className="text-[10px] font-extrabold uppercase text-cyan-600 dark:text-cyan-400 block">
                  2. Medida da Tela (Área de Corte)
                </span>
                <strong className="text-slate-900 dark:text-white font-mono">
                  {monitor.customDimensions.screenWidthCm} × {monitor.customDimensions.screenHeightCm} cm
                </strong>
                <span className="text-[10px] text-slate-500 block">
                  Janela visual na porta frontal
                </span>
              </div>

              <div className="p-2 rounded-lg bg-white/90 dark:bg-slate-900/90 border border-amber-200/70 dark:border-amber-900">
                <span className="text-[10px] font-extrabold uppercase text-amber-600 dark:text-amber-400 block">
                  3. Altura das 4 Barras (Moldura)
                </span>
                <strong className="text-slate-900 dark:text-white font-mono block">
                  Cima: {monitor.customDimensions.bezelTopCm}cm • Baixo: {monitor.customDimensions.bezelBottomCm}cm
                </strong>
                <span className="text-[10px] text-slate-500 font-mono block">
                  Esq: {monitor.customDimensions.bezelLeftCm}cm • Dir: {monitor.customDimensions.bezelRightCm}cm
                </span>
              </div>
            </div>
          </div>
        )}

        {/* DETALHAMENTO DO KIT DE MONTAGEM SELECIONADO */}
        {isKit && (
          <div className="p-3 sm:p-4 rounded-xl bg-gradient-to-r from-blue-50/70 to-indigo-50/60 dark:from-indigo-950/40 dark:to-slate-900 border border-blue-200 dark:border-indigo-800/80 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#0071e3] text-white flex items-center justify-center">
                  <Boxes className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-[#1d1d1f] dark:text-white">
                    Pacote Hardware: Kit de Montagem
                  </h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    {activeKitItems.length} de {kitItems.length} componentes inclusos no pedido
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-black text-[#0071e3] dark:text-cyan-400">
                  {formatBRL(kitTotalCents)}
                </span>
                <button
                  onClick={() => onEditStep(3)}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 border border-black/10 dark:border-slate-700 text-[#0071e3] dark:text-cyan-300 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                  title="Personalizar componentes do Kit"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Personalizar Kit</span>
                </button>
              </div>
            </div>

            {/* Sub-itens listados com fotos e valores individuais */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-blue-100 dark:border-indigo-900/60">
              {kitItems.map((sub) => (
                <div
                  key={sub.id}
                  className={`p-2 rounded-lg border flex items-center justify-between gap-2 text-xs transition-all ${
                    sub.selected
                      ? "bg-white/90 dark:bg-slate-900/90 border-blue-200/80 dark:border-indigo-900 shadow-2xs"
                      : "bg-slate-50 dark:bg-slate-950/40 border-black/5 opacity-50"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {sub.image && (
                      <div className="w-8 h-8 rounded-md border border-black/10 bg-white p-0.5 shrink-0 flex items-center justify-center overflow-hidden">
                        <img src={sub.image} alt={sub.name} className="w-full h-full object-contain" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-bold text-[#1d1d1f] dark:text-white truncate text-[11px]">
                        {sub.name}
                      </p>
                      <span className="text-[10px] text-slate-500">
                        {sub.selected ? formatBRL(sub.priceCents) : "Removido do Kit"}
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {sub.selected ? (
                      <span className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px]">
                        ✓
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-semibold">—</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* OPÇÃO DE SERVIÇO DE MONTAGEM DO TOTEM (EXCLUSIVO PARA QUEM ESCOLHEU KIT) */}
        {isKit && (
          <div className="p-3.5 sm:p-4 rounded-xl bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent border-2 border-amber-500/30 dark:border-amber-500/40 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Wrench className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-[#1d1d1f] dark:text-white flex items-center gap-1.5 flex-wrap">
                    <span>Como você deseja receber o seu Totem?</span>
                    <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30">
                      Gabinete + Kit ({activeKitItems.length} componentes)
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Se você não tiver tempo para montar, nossa equipe pode entregar o totem 100% montado de fábrica.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {/* Opção 1: Sem Montagem */}
              <div
                onClick={() => onToggleAssemblyService?.(false)}
                className={`p-3 rounded-xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                  !includeAssemblyService
                    ? "bg-white dark:bg-slate-900 border-[#0071e3] shadow-sm ring-2 ring-[#0071e3]/20"
                    : "bg-slate-50/80 dark:bg-slate-950/40 border-black/10 dark:border-slate-800 hover:border-black/20 opacity-80"
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-[#1d1d1f] dark:text-white flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-slate-500" />
                      Montar por Conta Própria
                    </span>
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        !includeAssemblyService
                          ? "bg-[#0071e3] text-white"
                          : "border border-slate-400 dark:border-slate-600"
                      }`}
                    >
                      {!includeAssemblyService && "✓"}
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                    Você recebe o gabinete usinado e todos os componentes do kit em caixas lacradas para você mesmo montar no seu estabelecimento.
                  </p>
                </div>
                <div className="pt-2 mt-2 border-t border-black/5 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-slate-500">Mão de obra:</span>
                  <span className="font-black text-emerald-600 dark:text-emerald-400">Incluso (R$ 0,00)</span>
                </div>
              </div>

              {/* Opção 2: Com Montagem de Fábrica */}
              <div
                onClick={() => onToggleAssemblyService?.(true)}
                className={`p-3 rounded-xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                  includeAssemblyService
                    ? "bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-amber-500/5 dark:from-amber-950/40 dark:to-slate-900 border-amber-500 shadow-md ring-2 ring-amber-500/30"
                    : "bg-slate-50/80 dark:bg-slate-950/40 border-black/10 dark:border-slate-800 hover:border-amber-400/60"
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-[#1d1d1f] dark:text-white flex items-center gap-1.5">
                      <Wrench className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      Totem 100% Montado de Fábrica
                    </span>
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        includeAssemblyService
                          ? "bg-amber-500 text-white"
                          : "border border-slate-400 dark:border-slate-600"
                      }`}
                    >
                      {includeAssemblyService && "✓"}
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-snug">
                    Nossa equipe técnica monta tudo, organiza chicote elétrico e testa em bancada. <strong>É só ligar na tomada e usar!</strong>
                  </p>
                </div>
                <div className="pt-2 mt-2 border-t border-black/5 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
                  <span className="font-extrabold text-amber-700 dark:text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded text-[10px] uppercase">
                    Plug & Play
                  </span>
                  <div className="text-right">
                    <span className="font-black text-amber-600 dark:text-amber-400 text-xs">
                      + R$ 999,00
                    </span>
                    <span className="text-[10px] text-slate-500 block leading-tight">
                      ou até 10x de R$ 99,90
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Grid de 2 Colunas com as Especificações de Montagem */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs">
          {/* Modelo */}
          <div className="py-1.5 flex items-center justify-between gap-2 border-b border-black/5 dark:border-slate-800/60">
            <span className="text-slate-500 font-medium">Modelo:</span>
            <div className="flex items-center gap-1.5 min-w-0">
              <strong className="text-[#1d1d1f] dark:text-white truncate">{model.name}</strong>
              <button
                onClick={() => onEditStep(1)}
                className="p-1 rounded-lg hover:bg-black/5 text-[#0071e3] transition-colors"
                title="Alterar Modelo"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Acabamento */}
          <div className="py-1.5 flex items-center justify-between gap-2 border-b border-black/5 dark:border-slate-800/60">
            <span className="text-slate-500 font-medium">Acabamento:</span>
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className="w-3.5 h-3.5 rounded-full border border-black/20 dark:border-white/30 shrink-0 shadow-xs ring-1 ring-black/10"
                style={{
                  background: color.hexReference,
                  boxShadow:
                    color.slug === "white"
                      ? "inset 0 0 0 1px rgba(0,0,0,0.15), 0 1px 2px rgba(0,0,0,0.12)"
                      : undefined,
                }}
              />
              <strong className="text-[#1d1d1f] dark:text-white truncate">{color.name} (15mm BP)</strong>
              <button
                onClick={() => onEditStep(2)}
                className="p-1 rounded-lg hover:bg-black/5 text-[#0071e3] transition-colors"
                title="Alterar Cor"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Monitor / Kit */}
          <div className="py-1.5 flex items-center justify-between gap-2 border-b border-black/5 dark:border-slate-800/60">
            <span className="text-slate-500 font-medium">
              {isKit ? "Equipamento Display:" : "Monitor Touch:"}
            </span>
            <div className="flex items-center gap-1.5 min-w-0">
              <strong className="text-[#1d1d1f] dark:text-white truncate max-w-[140px]">
                {isKit ? `Kit de Montagem (${activeKitItems.length} itens)` : monitor?.displayName || "—"}
              </strong>
              {!isKit && (monitor?.priceAdjustmentCents || 0) > 0 && (
                <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 shrink-0">
                  (+{formatBRL(monitor?.priceAdjustmentCents || 0)})
                </span>
              )}
              <button
                onClick={() => onEditStep(3)}
                className="p-1 rounded-lg hover:bg-black/5 text-[#0071e3] transition-colors"
                title="Alterar Monitor ou Kit"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Impressora */}
          <div className="py-1.5 flex items-center justify-between gap-2 border-b border-black/5 dark:border-slate-800/60">
            <span className="text-slate-500 font-medium">Impressora Térmica:</span>
            <div className="flex items-center gap-1.5 min-w-0">
              <strong className="text-[#1d1d1f] dark:text-white truncate max-w-[140px]">
                {isKit
                  ? (printerSubItem?.selected ? "Inclusa no Kit (80mm)" : "Não inclusa no Kit")
                  : printer?.displayName || "—"}
              </strong>
              {!isKit && (printer?.priceAdjustmentCents || 0) > 0 && (
                <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 shrink-0">
                  (+{formatBRL(printer?.priceAdjustmentCents || 0)})
                </span>
              )}
              <button
                onClick={() => onEditStep(isKit ? 3 : 4)}
                className="p-1 rounded-lg hover:bg-black/5 text-[#0071e3] transition-colors"
                title={isKit ? "Personalizar no Kit" : "Alterar Impressora"}
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Leitor */}
          <div className="py-1.5 flex items-center justify-between gap-2 border-b border-black/5 dark:border-slate-800/60">
            <span className="text-slate-500 font-medium">Janela de Leitor 2D:</span>
            <div className="flex items-center gap-1.5 min-w-0">
              <strong className="text-[#1d1d1f] dark:text-white truncate max-w-[140px]">
                {isKit
                  ? (readerSubItem?.selected ? "Incluso no Kit (2D QR Code)" : "Não incluso no Kit")
                  : (useReader ? reader?.displayName || "Sim" : "Sem leitor")}
              </strong>
              {!isKit && useReader && (reader?.priceAdjustmentCents || 0) > 0 && (
                <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 shrink-0">
                  (+{formatBRL(reader?.priceAdjustmentCents || 0)})
                </span>
              )}
              <button
                onClick={() => onEditStep(isKit ? 3 : 5)}
                className="p-1 rounded-lg hover:bg-black/5 text-[#0071e3] transition-colors"
                title={isKit ? "Personalizar no Kit" : "Alterar Leitor"}
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Encaixes e Furações */}
          <div className="py-1.5 flex items-center justify-between gap-2 border-b border-black/5 dark:border-slate-800/60">
            <span className="text-slate-500 font-medium">Furação e Berço:</span>
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Garantido de Fábrica</span>
            </div>
          </div>

          {/* Opção de Montagem (Apenas se Kit) */}
          {isKit && (
            <div className="py-1.5 flex items-center justify-between gap-2 border-b border-black/5 dark:border-slate-800/60 sm:col-span-2">
              <span className="text-slate-500 font-medium">Serviço de Montagem:</span>
              <div className="flex items-center gap-1.5 min-w-0">
                {includeAssemblyService ? (
                  <span className="font-extrabold text-amber-600 dark:text-amber-400 flex items-center gap-1 truncate text-[11px] sm:text-xs">
                    <Wrench className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Totem 100% Montado de Fábrica (+ R$ 999,00)</span>
                  </span>
                ) : (
                  <span className="text-slate-600 dark:text-slate-400 font-semibold truncate text-[11px] sm:text-xs">
                    Montagem própria (Gabinete + Kit em peças avulsas)
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => onToggleAssemblyService?.(!includeAssemblyService)}
                  className="p-1 rounded-lg hover:bg-black/5 text-[#0071e3] transition-colors shrink-0"
                  title="Alterar opção de montagem"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Campo Opcional de Observações do Cliente para a Produção CNC */}
        {onChangeNotes && (
          <div className="pt-2 space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
              Observações ou Detalhes Especiais para a Fábrica (Opcional):
            </label>
            <textarea
              rows={2}
              value={customizationNotes}
              onChange={(e) => onChangeNotes(e.target.value)}
              placeholder="Ex: Posição de passagem de cabos, detalhe específico do seu equipamento ou instrução para a produção..."
              className="w-full px-3 py-2 rounded-xl border border-black/15 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/70 text-xs text-[#1d1d1f] dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#0071e3] dark:focus:border-indigo-500 transition-colors"
            />
          </div>
        )}

        {/* Linha Financeira e Ações Rápidas */}
        <div className="pt-3 border-t border-black/10 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                Total:
              </span>
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {formatBRL(reviewPixTotal)}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-extrabold border border-emerald-500/30 whitespace-nowrap">
                <Zap className="w-3 h-3 fill-emerald-500 shrink-0" />
                <span>no PIX à vista</span>
              </span>
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span>
                ou em até{" "}
                <strong className="text-slate-700 dark:text-slate-200 font-bold">
                  10x de {formatBRL(Math.round(finalTotemPriceCents / 10))}
                </strong>{" "}
                no cartão
              </span>
            </div>

            {isKit && includeAssemblyService && (
              <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <Wrench className="w-3 h-3 shrink-0" />
                <span>Serviço de Montagem de Fábrica Incluso: + R$ 999,00 (Totem 100% montado e testado)</span>
              </div>
            )}

            {itemDiscountCents > 0 && (
              <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                Cupom ativo: -{formatBRL(itemDiscountCents)} de desconto exclusivo no chassi
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto pt-1 sm:pt-0">
            <Button
              variant="outline"
              size="md"
              onClick={() => onEditStep(1)}
              className="text-xs font-semibold flex-1 sm:flex-none whitespace-nowrap"
            >
              <Edit3 className="w-3.5 h-3.5 mr-1 shrink-0" />
              Editar
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={onAddToCart}
              className="text-xs sm:text-sm font-bold shadow-lg shadow-blue-500/25 flex-1 sm:flex-none whitespace-nowrap"
            >
              <ShoppingCart className="w-4 h-4 mr-1.5 shrink-0" />
              Adicionar ao Carrinho
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
