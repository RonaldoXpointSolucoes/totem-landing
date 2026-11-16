"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Modal, Button } from "@/components/ui";
import { CartItem } from "@/types/order";
import { SharedCartCreateResponse } from "@/types/sharedCart";
import {
  SelectiveCoupon,
  calculateSelectiveCouponDiscount,
} from "@/modules/pricing/couponEngine";
import { calculateTotemPrice, calculateSafeCardChargeCents, formatBRL } from "@/modules/pricing/pricingEngine";
import { resolveKitEquipmentSummary } from "@/modules/catalog/kitDefaults";
import { serializeCartItemsForShare } from "@/modules/cart/sharedAssembly";
import {
  Share2,
  Copy,
  Check,
  MessageCircle,
  Loader2,
  Sparkles,
  Tag,
  RefreshCw,
  ShoppingCart,
  AlertCircle,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";

interface ShareAssemblyModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemsToShare: CartItem[];
  appliedCoupon?: SelectiveCoupon | null;
  mode?: "cart" | "single_item";
  defaultTitle?: string;
  onGoToCart?: () => void;
}

export const ShareAssemblyModal: React.FC<ShareAssemblyModalProps> = ({
  isOpen,
  onClose,
  itemsToShare,
  appliedCoupon = null,
  mode = "cart",
  defaultTitle = "",
  onGoToCart,
}) => {
  const [titleInput, setTitleInput] = useState(defaultTitle);
  const [includeCoupon, setIncludeCoupon] = useState<boolean>(Boolean(appliedCoupon?.active));
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [shareResult, setShareResult] = useState<SharedCartCreateResponse | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);

  useEffect(() => {
    setCanNativeShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  const previewTotals = useMemo(() => {
    const normalizedItems: CartItem[] = itemsToShare.map((item) => {
      const p = calculateTotemPrice({
        cabinet: item.configuration.model,
        color: item.configuration.color,
        monitor: item.configuration.monitor,
        printer: item.configuration.printer,
        barcodeReader: item.configuration.barcodeReader,
        includeAssemblyService: item.configuration.includeAssemblyService,
      });
      return {
        ...item,
        unitPriceCents: p.pixTotalPriceCents,
        subtotalCents: p.pixTotalPriceCents * Math.max(1, item.quantity),
      };
    });

    const discount =
      includeCoupon && appliedCoupon?.active
        ? calculateSelectiveCouponDiscount(normalizedItems, appliedCoupon)
        : calculateSelectiveCouponDiscount(normalizedItems, null);

    const pixTotal = discount.finalSubtotalCents;
    const cardTotal = calculateSafeCardChargeCents(pixTotal);
    const totalUnits = normalizedItems.reduce((acc, i) => acc + Math.max(1, i.quantity), 0);

    return {
      totalUnits,
      pixTotalCents: shareResult?.pixTotalCents ?? pixTotal,
      cardTotalCents: shareResult?.cardTotalCents ?? cardTotal,
    };
  }, [itemsToShare, includeCoupon, appliedCoupon, shareResult]);

  const generateShareLink = useCallback(
    async (customTitle: string, withCoupon: boolean) => {
      if (!itemsToShare || itemsToShare.length === 0) return;
      setIsGenerating(true);
      setErrorMsg(null);
      setCopiedLink(false);

      try {
        const sanitized = serializeCartItemsForShare(itemsToShare);
        const res = await fetch("/api/carts/share", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: customTitle.trim(),
            couponCode: withCoupon && appliedCoupon?.active ? appliedCoupon.code : null,
            items: sanitized,
          }),
        });

        const data: SharedCartCreateResponse = await res.json();
        if (!res.ok || !data.ok || !data.shareUrl) {
          throw new Error(data.error || "Não foi possível gerar o link compartilhável.");
        }

        setShareResult(data);
      } catch (err: any) {
        setErrorMsg(err?.message || "Falha de comunicação ao gerar o link.");
      } finally {
        setIsGenerating(false);
      }
    },
    [itemsToShare, appliedCoupon]
  );

  // Ao abrir o modal, gera o link automaticamente para compartilhamento instantâneo
  useEffect(() => {
    if (isOpen && itemsToShare.length > 0) {
      setTitleInput(defaultTitle);
      const shouldIncludeCoupon = Boolean(appliedCoupon?.active);
      setIncludeCoupon(shouldIncludeCoupon);
      setShareResult(null);
      setErrorMsg(null);
      generateShareLink(defaultTitle, shouldIncludeCoupon);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleCopyLink = async () => {
    if (!shareResult?.shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareResult.shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2600);
    } catch {}
  };

  const handleNativeShare = async () => {
    if (!shareResult?.shareUrl || typeof navigator === "undefined" || !navigator.share) return;
    try {
      await navigator.share({
        title: titleInput.trim()
          ? `Montagem Totem Pro: ${titleInput.trim()}`
          : "Montagem Pronta — Totem Pro",
        text: "Abri esta montagem pronta do Totem Pro para você conferir e finalizar seu pedido:",
        url: shareResult.shareUrl,
      });
    } catch {}
  };

  const whatsappHref = shareResult?.whatsappSummaryText
    ? `https://wa.me/?text=${encodeURIComponent(shareResult.whatsappSummaryText)}`
    : shareResult?.shareUrl
    ? `https://wa.me/?text=${encodeURIComponent(`Confira esta montagem pronta do Totem Pro:\n${shareResult.shareUrl}`)}`
    : "#";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        mode === "single_item"
          ? "Compartilhar Este Totem Configurado"
          : "Compartilhar Montagem do Carrinho"
      }
      description="Quem abrir este link já receberá os itens preenchidos e precisará apenas selecionar a conta de login, entrega e pagamento."
      className="max-w-xl"
    >
      <div className="space-y-4 text-xs sm:text-sm">
        {/* Prévia compacta dos itens incluídos */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-black/10 dark:border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-[#0071e3] dark:text-cyan-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                {previewTotals.totalUnits}{" "}
                {previewTotals.totalUnits === 1 ? "totem na montagem" : "totens na montagem"}
              </span>
            </span>
            <div className="text-right">
              <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm sm:text-base">
                {formatBRL(previewTotals.pixTotalCents)}{" "}
                <span className="text-[10px] font-bold uppercase">PIX</span>
              </span>
            </div>
          </div>

          <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
            {itemsToShare.map((item, idx) => {
              const eq = resolveKitEquipmentSummary({
                monitor: item.configuration.monitor,
                printerName: item.configuration.printer?.displayName,
                readerName: item.configuration.barcodeReader?.displayName,
              });
              return (
                <div
                  key={item.id || idx}
                  className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white dark:bg-slate-900 border border-black/5 dark:border-slate-800/80 text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-[#1d1d1f] dark:text-white truncate">
                      {item.quantity}x {item.configuration.model.name} ({item.configuration.color.name})
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {eq.isKit
                        ? `Kit (${eq.selectedCount}/${eq.totalCount} itens)`
                        : "Só Gabinete CNC"}{" "}
                      • {eq.monitorDisplay}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Opções de Título & Cupom */}
        <div className="space-y-2.5">
          <div>
            <label
              htmlFor="share-assembly-title"
              className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1"
            >
              Nome / Referência da Montagem (opcional)
            </label>
            <div className="flex gap-2">
              <input
                id="share-assembly-title"
                type="text"
                maxLength={120}
                placeholder="Ex: Totens Unidade Centro ou Orçamento Cliente..."
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-black/15 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#0071e3]"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => generateShareLink(titleInput, includeCoupon)}
                disabled={isGenerating}
                className="shrink-0 text-xs font-bold"
                title="Atualizar link com esse título"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isGenerating ? "animate-spin" : ""}`} />
                Atualizar
              </Button>
            </div>
          </div>

          {appliedCoupon?.active && (
            <label className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-500/25 cursor-pointer text-xs">
              <span className="flex items-center gap-2 font-semibold text-emerald-800 dark:text-emerald-300">
                <Tag className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Enviar cupom <strong className="font-mono">{appliedCoupon.code}</strong> ({appliedCoupon.discountPercent}% OFF no gabinete) junto no link
                </span>
              </span>
              <input
                type="checkbox"
                checked={includeCoupon}
                onChange={(e) => {
                  const next = e.target.checked;
                  setIncludeCoupon(next);
                  generateShareLink(titleInput, next);
                }}
                className="w-4 h-4 rounded border-emerald-400 text-emerald-600 focus:ring-emerald-500"
              />
            </label>
          )}
        </div>

        {/* Estado de Geração / Link Pronto */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-700/50 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </span>
            <button
              type="button"
              onClick={() => generateShareLink(titleInput, includeCoupon)}
              className="font-bold underline shrink-0 cursor-pointer"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {isGenerating && !shareResult ? (
          <div className="p-5 rounded-2xl border border-black/10 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 flex items-center justify-center gap-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <Loader2 className="w-4 h-4 animate-spin text-[#0071e3]" />
            <span>Gerando link curto seguro da sua montagem...</span>
          </div>
        ) : shareResult?.shareUrl ? (
          <div className="p-3.5 rounded-2xl border border-[#0071e3]/30 bg-blue-50/60 dark:bg-indigo-950/30 space-y-3">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-extrabold text-[#0071e3] dark:text-cyan-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Link da Montagem Pronto ({shareResult.shareCode})</span>
              </span>
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                Sem dados pessoais
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareResult.shareUrl}
                aria-label="Link compartilhável da montagem"
                onClick={(e) => (e.target as HTMLInputElement).select()}
                className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-black/10 dark:border-slate-700 text-xs font-mono text-slate-800 dark:text-slate-200 select-all focus:outline-none"
              />
              <Button
                type="button"
                variant={copiedLink ? "primary" : "secondary"}
                size="sm"
                onClick={handleCopyLink}
                className="shrink-0 h-9 px-3.5 text-xs font-bold"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                    <span>Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 mr-1" />
                    <span>Copiar</span>
                  </>
                )}
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all active:scale-95"
              >
                <MessageCircle className="w-4 h-4 shrink-0" />
                <span>Enviar no WhatsApp</span>
              </a>

              {canNativeShare ? (
                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="py-2.5 px-3.5 rounded-xl bg-[#0071e3] hover:bg-blue-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 transition-all active:scale-95 cursor-pointer"
                >
                  <Share2 className="w-4 h-4 shrink-0" />
                  <span>Compartilhar App / E-mail</span>
                </button>
              ) : (
                <a
                  href={shareResult.sharePath || `/montagem/${shareResult.shareCode}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2.5 px-3.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-black/15 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition-all"
                >
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                  <span>Testar Link em Nova Aba</span>
                </a>
              )}
            </div>
          </div>
        ) : null}

        {/* Rodapé */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-1 border-t border-black/5 dark:border-slate-800">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} className="text-xs">
            Fechar
          </Button>
          {onGoToCart && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => {
                onClose();
                onGoToCart();
              }}
              className="text-xs font-bold"
            >
              <ShoppingCart className="w-3.5 h-3.5 mr-1.5" />
              Ir para o Carrinho
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};
