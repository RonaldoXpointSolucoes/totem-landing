"use client";

import React, { useState } from "react";
import { useCart } from "@/modules/cart/CartContext";
import { formatBRL, calculateTotemPrice } from "@/modules/pricing/pricingEngine";
import { resolveKitEquipmentSummary } from "@/modules/catalog/kitDefaults";
import { Button, Card, Badge } from "@/components/ui";
import {
  Copy,
  Edit3,
  Trash2,
  Plus,
  Minus,
  ShoppingCart,
  ArrowRight,
  PlusCircle,
  Package,
  ShieldCheck,
  CheckCircle2,
  Tag,
  Zap,
  Truck,
  Loader2,
  Check,
  CreditCard,
  Wrench,
  FileText,
  MessageCircle,
  Monitor as MonitorIcon,
  Printer as PrinterIcon,
  QrCode,
  Ruler,
  Sparkles,
} from "lucide-react";
import { trackEvent, ANALYTICS_EVENTS } from "@/lib/analytics/tracker";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

interface CartViewProps {
  onContinueShopping: () => void;
  onEditItem: (itemId: string) => void;
  onProceedToCheckout: () => void;
}

export const CartView: React.FC<CartViewProps> = ({
  onContinueShopping,
  onEditItem,
  onProceedToCheckout,
}) => {
  const {
    items,
    duplicateItem,
    removeItem,
    updateQuantity,
    totalPriceCents,
    totalItems,
    appliedCoupon,
    couponDiscountCents,
    couponError,
    isApplyingCoupon,
    eligibleCabinetsSubtotalCents,
    ineligibleSubtotalCents,
    finalTotalPriceCents,
    applyCoupon,
    removeCoupon,
  } = useCart();

  const [couponInput, setCouponInput] = useState("");

  // Estados de Frete Antecipado por CEP no Carrinho
  const [shippingCep, setShippingCep] = useState("");
  const [shippingQuotes, setShippingQuotes] = useState<any[]>([]);
  const [selectedShippingId, setSelectedShippingId] = useState<string | null>(null);
  const [isLoadingShipping, setIsLoadingShipping] = useState(false);
  const [shippingRetryAttempt, setShippingRetryAttempt] = useState(0);
  const [shippingError, setShippingError] = useState<string | null>(null);
  const cartEnteredAtRef = React.useRef<number>(Date.now());

  // Estados de Captura de Lead B2B: Orçamento Formal em PDF no WhatsApp
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [quoteName, setQuoteName] = useState("");
  const [quoteWhatsapp, setQuoteWhatsapp] = useState("");
  const [quoteDocOrEmail, setQuoteDocOrEmail] = useState("");
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [generatedQuoteRef, setGeneratedQuoteRef] = useState<string | null>(null);
  const [generatedWhatsappUrl, setGeneratedWhatsappUrl] = useState<string>("");

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const savedDraftRaw = localStorage.getItem("totem_checkout_draft_v2");
      if (savedDraftRaw) {
        const draft = JSON.parse(savedDraftRaw);
        if (draft?.name && !quoteName) setQuoteName(String(draft.name));
        if (draft?.whatsapp && !quoteWhatsapp) setQuoteWhatsapp(String(draft.whatsapp));
        if ((draft?.document || draft?.email) && !quoteDocOrEmail) {
          setQuoteDocOrEmail(String(draft.document || draft.email));
        }
      }
    } catch {}
  }, []);

  const persistCartTelemetry = React.useCallback(
    (patch: Record<string, unknown>) => {
      if (typeof window === "undefined") return;
      try {
        const prevRaw = sessionStorage.getItem("totem_cart_telemetry_v1");
        const prev = prevRaw ? JSON.parse(prevRaw) : {};
        const next = {
          ...prev,
          ...patch,
          timeInCartSeconds: Math.max(
            1,
            Math.round((Date.now() - cartEnteredAtRef.current) / 1000)
          ),
          updatedAt: new Date().toISOString(),
        };
        sessionStorage.setItem("totem_cart_telemetry_v1", JSON.stringify(next));
      } catch {}
    },
    []
  );

  const calculateShippingForCep = React.useCallback(
    async (rawCep: string) => {
      const cleanCep = rawCep.replace(/\D/g, "");
      if (cleanCep.length !== 8 || items.length === 0) return;

      setIsLoadingShipping(true);
      setShippingError(null);
      setShippingRetryAttempt(0);

      if (typeof window !== "undefined") {
        sessionStorage.setItem("totem_shipping_cep", cleanCep);
      }

      const payloadItems = items.map((i) => {
        const p = calculateTotemPrice({
          cabinet: i.configuration.model,
          color: i.configuration.color,
          monitor: i.configuration.monitor,
          printer: i.configuration.printer,
          barcodeReader: i.configuration.barcodeReader,
          includeAssemblyService: i.configuration.includeAssemblyService,
        });
        return {
          modelId: i.configuration.model.id,
          quantity: i.quantity,
          unitPriceCents: p.cardTotalPriceCents,
          declaredValueCents: p.cardTotalPriceCents,
        };
      });

      const MAX_ATTEMPTS = 2; // Exatamente 2 tentativas com transparência
      let lastErr = "Serviço dos Correios temporariamente indisponível.";

      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        setShippingRetryAttempt(attempt);
        try {
          const res = await fetch("/api/shipping/quote", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              destinationCep: cleanCep,
              items: payloadItems,
            }),
          });

          const data = await res.json();
          if (res.ok && data.ok && Array.isArray(data.quotes) && data.quotes.length > 0) {
            setShippingQuotes(data.quotes);
            setShippingError(null);
            setShippingRetryAttempt(0);
            const available = data.quotes.filter((q: any) => q.isAvailable);
            if (available.length > 0) {
              const firstQuote = available[0];
              persistCartTelemetry({
                hasSimulatedShipping: true,
                cep: cleanCep,
                shippingCents: Number(firstQuote.priceCents || 0),
                shippingCarrier: String(firstQuote.carrierName || firstQuote.serviceName || ""),
                shippingDeliveryDays: Number(firstQuote.deliveryDays || 0),
                shippingError: null,
              });
              trackEvent(ANALYTICS_EVENTS.SHIPPING_SIMULATED, {
                cep: cleanCep,
                shippingCents: Number(firstQuote.priceCents || 0),
                shippingCarrier: String(firstQuote.carrierName || firstQuote.serviceName || ""),
                shippingDeliveryDays: Number(firstQuote.deliveryDays || 0),
                totalCents: finalTotalPriceCents + Number(firstQuote.priceCents || 0),
              });
              setSelectedShippingId((prev) => {
                const savedOpt =
                  typeof window !== "undefined"
                    ? sessionStorage.getItem("totem_shipping_option_id")
                    : null;
                const preferred = prev || savedOpt;
                const stillValid = available.find((q: any) => q.id === preferred);
                const chosen = stillValid ? stillValid.id : available[0].id;
                if (typeof window !== "undefined") {
                  sessionStorage.setItem("totem_shipping_option_id", chosen);
                }
                return chosen;
              });
            }
            setIsLoadingShipping(false);
            return;
          }

          lastErr = data?.error || "Serviço de cotação temporariamente indisponível.";
          // Se for erro de CEP inválido (400), não precisa tentar 3 vezes
          if (res.status === 400 && lastErr.toLowerCase().includes("cep")) {
            break;
          }
        } catch {
          lastErr = "Erro de comunicação ao consultar os Correios.";
        }

        if (attempt < MAX_ATTEMPTS) {
          await new Promise((resolve) => setTimeout(resolve, 600 * attempt));
        }
      }

      const fullErr = `${lastErr} (Tentamos ${MAX_ATTEMPTS} vezes automaticamente)`;
      setShippingError(fullErr);
      persistCartTelemetry({
        hasSimulatedShipping: false,
        cep: cleanCep,
        shippingError: lastErr,
      });
      trackEvent(ANALYTICS_EVENTS.VIEW_CART, {
        itemsCount: totalItems,
        totalPriceCents: finalTotalPriceCents,
        cep: cleanCep,
        shippingError: lastErr,
        abandonmentSignal: "shipping_quote_error",
      });
      setShippingQuotes([]);
      setSelectedShippingId(null);
      setShippingRetryAttempt(0);
      setIsLoadingShipping(false);
    },
    [items, finalTotalPriceCents, totalItems, persistCartTelemetry]
  );

  // Rastreia tempo de permanência e sinais de abandono ao sair do /carrinho
  React.useEffect(() => {
    if (typeof window === "undefined" || items.length === 0) return;
    persistCartTelemetry({
      enteredCartAt: new Date(cartEnteredAtRef.current).toISOString(),
      itemsCount: totalItems,
    });

    const handleVisibilityOrExit = () => {
      if (document.visibilityState === "hidden") {
        const cleanCep = shippingCep.replace(/\D/g, "");
        const hasQuotes = shippingQuotes.some((q) => q.isAvailable);
        const reason = shippingError
          ? `Erro ao cotar frete (${shippingError})`
          : cleanCep.length !== 8
          ? "Parou no carrinho sem simular CEP/Frete (Revisão de orçamento ou dúvida técnica)"
          : hasQuotes
          ? "Simulou frete por CEP, avaliou prazo/valor de entrega e pausou antes do checkout"
          : "Saiu do carrinho durante simulação de frete";

        persistCartTelemetry({
          abandonmentReason: reason,
          hasSimulatedShipping: hasQuotes,
          cep: cleanCep || undefined,
        });
        trackEvent(ANALYTICS_EVENTS.VIEW_CART, {
          itemsCount: totalItems,
          totalPriceCents: finalTotalPriceCents,
          cep: cleanCep || undefined,
          abandonmentReason: reason,
          hasSimulatedShipping: hasQuotes,
          timeInCartSeconds: Math.max(
            1,
            Math.round((Date.now() - cartEnteredAtRef.current) / 1000)
          ),
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityOrExit);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityOrExit);
    };
  }, [
    items.length,
    totalItems,
    finalTotalPriceCents,
    shippingCep,
    shippingQuotes,
    shippingError,
    persistCartTelemetry,
  ]);

  // Recupera CEP persistido em sessão
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const savedCep = sessionStorage.getItem("totem_shipping_cep");
      if (savedCep) {
        const clean = savedCep.replace(/\D/g, "");
        setShippingCep(clean.length === 8 ? `${clean.slice(0, 5)}-${clean.slice(5)}` : savedCep);
      }
    }
  }, []);

  // Recalcula automaticamente o frete sempre que a quantidade ou itens mudarem e já houver CEP válido
  React.useEffect(() => {
    const cleanCep = shippingCep.replace(/\D/g, "");
    if (cleanCep.length === 8 && items.length > 0) {
      calculateShippingForCep(cleanCep);
    }
  }, [items, shippingCep, calculateShippingForCep]);

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/\D/g, "");
    if (raw.length > 8) raw = raw.slice(0, 8);
    if (raw.length > 5) {
      setShippingCep(`${raw.slice(0, 5)}-${raw.slice(5)}`);
    } else {
      setShippingCep(raw);
    }
  };

  const handleCalculateShipping = async () => {
    const cleanCep = shippingCep.replace(/\D/g, "");
    if (cleanCep.length !== 8) {
      setShippingError("Digite um CEP válido com 8 dígitos.");
      return;
    }
    await calculateShippingForCep(cleanCep);
  };

  const selectedShippingQuote = shippingQuotes.find(
    (q) => q.id === selectedShippingId && q.isAvailable
  ) || null;
  const shippingCents = selectedShippingQuote ? selectedShippingQuote.priceCents : 0;

  const rawPixTotalCents = items.reduce((acc, it) => {
    const p = calculateTotemPrice({
      cabinet: it.configuration.model,
      color: it.configuration.color,
      monitor: it.configuration.monitor,
      printer: it.configuration.printer,
      barcodeReader: it.configuration.barcodeReader,
      includeAssemblyService: it.configuration.includeAssemblyService,
    });
    return acc + p.pixTotalPriceCents * it.quantity;
  }, 0);

  const rawCardTotalCents = items.reduce((acc, it) => {
    const p = calculateTotemPrice({
      cabinet: it.configuration.model,
      color: it.configuration.color,
      monitor: it.configuration.monitor,
      printer: it.configuration.printer,
      barcodeReader: it.configuration.barcodeReader,
      includeAssemblyService: it.configuration.includeAssemblyService,
    });
    return acc + p.cardTotalPriceCents * it.quantity;
  }, 0);

  const cartPixSavings = Math.max(0, rawCardTotalCents - rawPixTotalCents);
  const finalPixTotal = Math.max(0, rawPixTotalCents - couponDiscountCents);
  const finalCardTotal = Math.max(0, rawCardTotalCents - couponDiscountCents);

  const handleQuoteWhatsappChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 11);
    if (digits.length === 0) {
      setQuoteWhatsapp("");
    } else if (digits.length <= 2) {
      setQuoteWhatsapp(`(${digits}`);
    } else if (digits.length <= 6) {
      setQuoteWhatsapp(`(${digits.slice(0, 2)}) ${digits.slice(2)}`);
    } else if (digits.length <= 10) {
      setQuoteWhatsapp(
        `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
      );
    } else {
      setQuoteWhatsapp(
        `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
      );
    }
  };

  const openPrintableFormalQuotePdf = (
    quoteRef: string,
    customerName: string,
    customerWhatsapp: string,
    customerDocOrEmail: string,
    whatsappLink: string
  ) => {
    if (typeof window === "undefined") return;
    const issueDate = new Date().toLocaleDateString("pt-BR", {
      timeZone: "America/Sao_Paulo",
    });
    const validUntilDate = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000
    ).toLocaleDateString("pt-BR", {
      timeZone: "America/Sao_Paulo",
    });

    const escapeHtml = (str: string) =>
      String(str || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

    const rowsHtml = items
      .map((item, idx) => {
        const { configuration, quantity } = item;
        const { model, color, monitor, printer, barcodeReader } = configuration;
        const itemPrice = calculateTotemPrice({
          cabinet: model,
          color,
          monitor,
          printer,
          barcodeReader,
          includeAssemblyService: configuration.includeAssemblyService,
        });
        const kitEq = resolveKitEquipmentSummary({
          monitor,
          printerName: printer?.displayName,
          readerName: barcodeReader?.displayName,
        });
        const isKit = itemPrice.equipmentAdjustmentCents > 0 || kitEq.isKit;
        const modeLabel = isKit
          ? "Gabinete + Kit Completo de Periféricos"
          : "Apenas Gabinete CNC (-50% • Furação Sob Medida)";
        const unitPix = formatBRL(itemPrice.pixTotalPriceCents);
        const subPix = formatBRL(itemPrice.pixTotalPriceCents * quantity);
        const subCard = formatBRL(itemPrice.cardTotalPriceCents * quantity);

        return `
          <tr>
            <td style="padding:12px;border-bottom:1px solid #e2e8f0;font-weight:700;color:#0f172a;vertical-align:top;">
              ${idx + 1}
            </td>
            <td style="padding:12px;border-bottom:1px solid #e2e8f0;vertical-align:top;">
              <div style="font-weight:800;font-size:14px;color:#0f172a;margin-bottom:4px;">
                ${escapeHtml(model.name)}
              </div>
              <div style="font-size:12px;color:#334155;line-height:1.5;">
                • <strong>Modalidade:</strong> ${escapeHtml(modeLabel)}<br/>
                • <strong>Acabamento / Cor:</strong> ${escapeHtml(color.name)}<br/>
                • <strong>Monitor Touch VESA:</strong> ${escapeHtml(kitEq.monitorDisplay)}<br/>
                • <strong>Impressora Térmica:</strong> ${escapeHtml(kitEq.printerDisplay)}
                ${
                  kitEq.hasReader
                    ? `<br/>• <strong>Leitor 2D QR/Barras:</strong> ${escapeHtml(kitEq.readerDisplay)}`
                    : ""
                }
                ${
                  configuration.includeAssemblyService
                    ? `<br/>• <strong style="color:#047857;">✓ Inclui Montagem Técnica Pronta de Fábrica (+ R$ 999,00)</strong>`
                    : ""
                }
              </div>
            </td>
            <td style="padding:12px;border-bottom:1px solid #e2e8f0;text-align:center;font-weight:700;vertical-align:top;">
              ${quantity} un.
            </td>
            <td style="padding:12px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600;vertical-align:top;">
              ${unitPix}
            </td>
            <td style="padding:12px;border-bottom:1px solid #e2e8f0;text-align:right;vertical-align:top;">
              <div style="font-weight:800;color:#047857;font-size:14px;">${subPix} (PIX)</div>
              <div style="font-size:11px;color:#64748b;">10x: ${subCard}</div>
            </td>
          </tr>
        `;
      })
      .join("");

    const shippingLineText = selectedShippingQuote
      ? `${
          shippingCents === 0 ? "Grátis" : formatBRL(shippingCents)
        } (${escapeHtml(
          selectedShippingQuote.name ||
            selectedShippingQuote.serviceName ||
            selectedShippingQuote.carrier ||
            "Transportadora"
        )})`
      : shippingCep.replace(/\D/g, "").length === 8
      ? `CEP ${escapeHtml(shippingCep)} (Sob consulta na finalização)`
      : "A calcular conforme CEP de destino";

    const htmlDoc = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Orçamento Formal ${escapeHtml(quoteRef)} — Totem Pro (X-Point Soluções)</title>
  <style>
    @page { size: A4; margin: 14mm; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #f1f5f9;
      margin: 0;
      padding: 24px;
    }
    .toolbar {
      max-width: 820px;
      margin: 0 auto 16px auto;
      background: #0f172a;
      color: #fff;
      padding: 12px 18px;
      border-radius: 14px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      box-shadow: 0 10px 25px rgba(15,23,42,0.2);
    }
    .toolbar-btns { display: flex; gap: 10px; flex-wrap: wrap; }
    .btn {
      border: none;
      padding: 9px 16px;
      border-radius: 10px;
      font-weight: 700;
      font-size: 13px;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .btn-print { background: #0284c7; color: #fff; }
    .btn-wpp { background: #10b981; color: #fff; }
    .sheet {
      max-width: 820px;
      margin: 0 auto;
      background: #ffffff;
      padding: 32px 36px;
      border-radius: 16px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.08);
      border: 1px solid #cbd5e1;
    }
    @media print {
      body { background: #fff; padding: 0; }
      .toolbar { display: none !important; }
      .sheet { box-shadow: none; border: none; padding: 0; max-width: 100%; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <div style="font-size:13px;">
      <strong>📄 Orçamento Formal ${escapeHtml(quoteRef)} pronto!</strong>
      <span style="color:#94a3b8;margin-left:6px;">Escolha "Salvar como PDF" na janela de impressão.</span>
    </div>
    <div class="toolbar-btns">
      <button class="btn btn-print" onclick="window.print()">🖨️ Salvar em PDF / Imprimir</button>
      <a class="btn btn-wpp" href="${escapeHtml(whatsappLink)}" target="_blank" rel="noopener noreferrer">💬 Receber Cópia no WhatsApp</a>
    </div>
  </div>

  <div class="sheet">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #0f172a;padding-bottom:18px;margin-bottom:20px;gap:16px;">
      <div>
        <div style="font-size:11px;font-weight:800;letter-spacing:1.2px;color:#0284c7;text-transform:uppercase;">
          X-Point Soluções em Tecnologia & Engenharia CNC
        </div>
        <h1 style="margin:4px 0 4px 0;font-size:22px;font-weight:900;color:#0f172a;">
          TOTEM PRO — PROPOSTA COMERCIAL TÉCNICA
        </h1>
        <div style="font-size:12px;color:#475569;">
          Site Oficial: <strong>totem.xpointsolucoes.com.br</strong> • WhatsApp Engenharia: <strong>(11) 99164-9959</strong>
        </div>
      </div>
      <div style="text-align:right;background:#f8fafc;border:1px solid #cbd5e1;padding:10px 14px;border-radius:10px;min-width:190px;">
        <div style="font-size:11px;color:#64748b;font-weight:700;">PROPOSTA Nº</div>
        <div style="font-size:15px;font-weight:900;color:#0f172a;">${escapeHtml(quoteRef)}</div>
        <div style="font-size:11px;color:#475569;margin-top:4px;">
          Emissão: <strong>${issueDate}</strong><br/>
          Validade: <strong>${validUntilDate} (7 dias)</strong>
        </div>
      </div>
    </div>

    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:14px 18px;margin-bottom:20px;display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:13px;">
      <div>
        <span style="color:#64748b;">Solicitante / Empresa:</span><br/>
        <strong style="font-size:14px;color:#0f172a;">${escapeHtml(customerName)}</strong>
      </div>
      <div>
        <span style="color:#64748b;">WhatsApp de Contato:</span><br/>
        <strong style="font-size:14px;color:#047857;">${escapeHtml(customerWhatsapp)}</strong>
      </div>
      <div>
        <span style="color:#64748b;">CNPJ / CPF ou E-mail:</span><br/>
        <strong>${escapeHtml(customerDocOrEmail || "A informar no faturamento")}</strong>
      </div>
      <div>
        <span style="color:#64748b;">Frete / CEP Simulado:</span><br/>
        <strong>${shippingLineText}</strong>
      </div>
    </div>

    <table style="width:100%;border-collapse:collapse;margin-bottom:22px;font-size:13px;">
      <thead>
        <tr style="background:#0f172a;color:#ffffff;">
          <th style="padding:10px 12px;text-align:left;border-radius:8px 0 0 0;">#</th>
          <th style="padding:10px 12px;text-align:left;">Especificação Técnica do Totem Configurado</th>
          <th style="padding:10px 12px;text-align:center;">Qtd</th>
          <th style="padding:10px 12px;text-align:right;">Unit. PIX</th>
          <th style="padding:10px 12px;text-align:right;border-radius:0 8px 0 0;">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>

    <div style="display:flex;justify-content:space-between;gap:20px;align-items:stretch;flex-wrap:wrap;">
      <div style="flex:1;min-width:260px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:14px 16px;font-size:12px;color:#166534;line-height:1.5;">
        <div style="font-weight:800;font-size:13px;margin-bottom:4px;">
          🛡️ Garantia Técnica de Engenharia & Usinagem CNC
        </div>
        • Estrutura em MDF Naval / MaDeFibra BP de alta densidade com usinagem computadorizada CNC submilimétrica.<br/>
        • Furação VESA e berço de impressora térmica conferidos individualmente pela nossa Engenharia após o pedido.<br/>
        • Pintura e acabamento de padrão corporativo pronto para operação intensiva.
      </div>

      <div style="min-width:280px;background:#f8fafc;border:2px solid #0f172a;border-radius:12px;padding:14px 18px;font-size:13px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:6px;color:#475569;">
          <span>Subtotal dos Itens (${totalItems} un.):</span>
          <strong>${formatBRL(rawPixTotalCents)}</strong>
        </div>
        ${
          appliedCoupon && couponDiscountCents > 0
            ? `<div style="display:flex;justify-content:space-between;margin-bottom:6px;color:#047857;">
                <span>Cupom (${escapeHtml(appliedCoupon.code)}):</span>
                <strong>-${formatBRL(couponDiscountCents)}</strong>
              </div>`
            : ""
        }
        <div style="display:flex;justify-content:space-between;margin-bottom:10px;color:#475569;">
          <span>Frete Estimado:</span>
          <strong>${shippingCents > 0 ? formatBRL(shippingCents) : "A calcular"}</strong>
        </div>
        <div style="border-top:1px solid #cbd5e1;padding-top:10px;display:flex;justify-content:space-between;align-items:baseline;">
          <span style="font-weight:800;color:#0f172a;">TOTAL NO PIX À VISTA:</span>
          <span style="font-size:20px;font-weight:900;color:#047857;">
            ${formatBRL(finalPixTotal + shippingCents)}
          </span>
        </div>
        <div style="text-align:right;font-size:11px;color:#475569;margin-top:4px;">
          Ou no Cartão em até 10x de <strong>${formatBRL(
            Math.round((finalCardTotal + shippingCents) / 10)
          )}</strong> (Total: ${formatBRL(finalCardTotal + shippingCents)})
        </div>
      </div>
    </div>
  </div>
  <script>
    window.addEventListener("load", function() {
      setTimeout(function() { window.print(); }, 450);
    });
  </script>
</body>
</html>`;

    const printWin = window.open("", "_blank");
    if (printWin) {
      printWin.document.open();
      printWin.document.write(htmlDoc);
      printWin.document.close();
    }
  };

  const handleGenerateFormalQuotePdfAndWhatsapp = () => {
    const cleanName = quoteName.trim();
    const cleanWppDigits = quoteWhatsapp.replace(/\D/g, "");
    const cleanDocOrEmail = quoteDocOrEmail.trim();

    if (cleanName.length < 2) {
      setQuoteError("Por favor, informe seu nome ou nome da empresa.");
      return;
    }
    if (cleanWppDigits.length < 10) {
      setQuoteError("Informe um WhatsApp válido com DDD (ex: 11 99999-9999).");
      return;
    }

    setQuoteError(null);

    const dateCode = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const quoteRef = `ORC-${dateCode}-${randSuffix}`;

    const isEmail = cleanDocOrEmail.includes("@");
    const emailVal = isEmail ? cleanDocOrEmail : "";
    const docVal = !isEmail ? cleanDocOrEmail : "";
    const cleanCep = shippingCep.replace(/\D/g, "");

    // Salva também no rascunho do Checkout para que o cliente não precise redigitar se avançar
    if (typeof window !== "undefined") {
      try {
        const prevRaw = localStorage.getItem("totem_checkout_draft_v2");
        const prev = prevRaw ? JSON.parse(prevRaw) : {};
        localStorage.setItem(
          "totem_checkout_draft_v2",
          JSON.stringify({
            ...prev,
            name: cleanName,
            whatsapp: quoteWhatsapp,
            ...(emailVal ? { email: emailVal } : {}),
            ...(docVal ? { document: docVal } : {}),
            ...(cleanCep.length === 8 ? { cep: shippingCep } : {}),
          })
        );
      } catch {}
    }

    // Atualiza telemetria local da sessão do carrinho
    persistCartTelemetry({
      quotePdfRequested: true,
      quoteNumber: quoteRef,
      customerName: cleanName,
      whatsapp: quoteWhatsapp,
      abandonmentReason: `Solicitou Orçamento Formal em PDF (${quoteRef}) no /carrinho (${cleanName} • ${quoteWhatsapp})`,
    });

    // Dispara captura imediata do Lead para o Appwrite (ads_leads_carts) e Analytics
    const leadPayload = {
      quotePdfRequested: true,
      quoteNumber: quoteRef,
      customerName: cleanName,
      name: cleanName,
      whatsapp: quoteWhatsapp,
      phone: quoteWhatsapp,
      email: emailVal || undefined,
      document: docVal || undefined,
      cep: cleanCep || undefined,
      shippingCents,
      shippingCarrier: selectedShippingQuote
        ? String(
            selectedShippingQuote.name ||
              selectedShippingQuote.serviceName ||
              selectedShippingQuote.carrier ||
              ""
          )
        : undefined,
      totalItems,
      totalPriceCents: finalPixTotal + shippingCents,
      totalCents: finalPixTotal + shippingCents,
    };

    trackEvent(ANALYTICS_EVENTS.LEAD_SUBMITTED, leadPayload);
    trackEvent(ANALYTICS_EVENTS.WHATSAPP_CLICK, {
      ...leadPayload,
      location: "cart_formal_pdf_quote",
    });

    // Monta mensagem estruturada do Orçamento Formal para o WhatsApp da Engenharia
    const itemsLines = items
      .map((it, idx) => {
        const { configuration, quantity } = it;
        const { model, color, monitor, printer, barcodeReader } = configuration;
        const p = calculateTotemPrice({
          cabinet: model,
          color,
          monitor,
          printer,
          barcodeReader,
          includeAssemblyService: configuration.includeAssemblyService,
        });
        const kitEq = resolveKitEquipmentSummary({
          monitor,
          printerName: printer?.displayName,
          readerName: barcodeReader?.displayName,
        });
        const isKit = p.equipmentAdjustmentCents > 0 || kitEq.isKit;
        return `${idx + 1}. *${quantity}x ${model.name}* (${color.name}) — ${
          isKit ? "Gabinete + Kit Completo" : "Apenas Gabinete (-50%)"
        } | Tela: ${kitEq.monitorDisplay} | Impressora: ${kitEq.printerDisplay}${
          kitEq.hasReader ? ` | Leitor: ${kitEq.readerDisplay}` : ""
        }${
          configuration.includeAssemblyService ? " | + Montagem Pronta" : ""
        } = *${formatBRL(p.pixTotalPriceCents * quantity)} no PIX*`;
      })
      .join("\n");

    const wppText = [
      `Olá! Emiti o *Orçamento Formal ${quoteRef}* no carrinho da Totem Pro e gostaria de receber o acompanhamento no WhatsApp:`,
      ``,
      `👤 *Solicitante/Empresa:* ${cleanName}`,
      `📱 *WhatsApp:* ${quoteWhatsapp}`,
      cleanDocOrEmail ? `🏢 *CNPJ/CPF/E-mail:* ${cleanDocOrEmail}` : null,
      cleanCep ? `📍 *CEP:* ${shippingCep}` : null,
      ``,
      `🛒 *Itens Configurados (${totalItems} un.):*`,
      itemsLines,
      ``,
      `💰 *Total no PIX à vista:* ${formatBRL(finalPixTotal + shippingCents)}`,
      `💳 *Ou em até 10x no Cartão:* ${formatBRL(finalCardTotal + shippingCents)}`,
    ]
      .filter(Boolean)
      .join("\n");

    const wppUrl = `https://wa.me/${siteConfig.links.whatsappRaw}?text=${encodeURIComponent(
      wppText
    )}`;

    setGeneratedQuoteRef(quoteRef);
    setGeneratedWhatsappUrl(wppUrl);

    // Abre o PDF formal timbrado em nova guia pronto para salvar/imprimir
    openPrintableFormalQuotePdf(
      quoteRef,
      cleanName,
      quoteWhatsapp,
      cleanDocOrEmail,
      wppUrl
    );
  };

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-slate-100 dark:bg-slate-900/80 border border-black/10 dark:border-slate-800 text-slate-500 mx-auto flex items-center justify-center shadow-md dark:shadow-xl">
          <ShoppingCart className="w-10 h-10 stroke-[1.5]" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-[#1d1d1f] dark:text-white">Seu carrinho está vazio</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
            Você ainda não configurou nenhum Totem. Comece escolhendo o modelo ideal para seu negócio.
          </p>
        </div>
        <Button
          variant="primary"
          size="lg"
          onClick={onContinueShopping}
          className="shadow-blue-500/25 shadow-xl bg-[#0071e3] hover:bg-[#0077ed]"
        >
          Montar meu Primeiro Totem <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Cabeçalho do Carrinho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-black/10 dark:border-slate-800">
        <div>
          <Badge variant="accent" className="text-xs mb-1.5">
            Carrinho de Compras Multicomponentes
          </Badge>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1d1d1f] dark:text-white">
            Seus Totens Configurados ({totalItems} {totalItems === 1 ? "unidade" : "unidades"})
          </h1>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onContinueShopping}
          className="w-full sm:w-auto"
        >
          <PlusCircle className="w-4 h-4 mr-1.5 text-[#0071e3]" />
          Configurar Outro Totem
        </Button>
      </div>

      {/* Grid: Lista de Itens + Resumo do Pedido */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Coluna Esquerda: Lista de Totens */}
        <div className="lg:col-span-8 space-y-4">
          {items.map((item, index) => {
            const { configuration, quantity, id } = item;
            const { model, color, monitor, printer, barcodeReader } = configuration;
            const itemPricing = calculateTotemPrice({
              cabinet: model,
              color,
              monitor,
              printer,
              barcodeReader,
              includeAssemblyService: configuration.includeAssemblyService,
            });
            const itemPixUnitCents = itemPricing.pixTotalPriceCents;
            const itemPixSubtotalCents = itemPixUnitCents * quantity;
            const itemCardSubtotalCents = itemPricing.cardTotalPriceCents * quantity;

            const kitEq = resolveKitEquipmentSummary({
              monitor,
              printerName: printer?.displayName,
              readerName: barcodeReader?.displayName,
            });
            const effectiveCutoutMon =
              kitEq.isKit && !kitEq.hasMonitorInKit
                ? monitor?.cutoutMonitor || null
                : !kitEq.isKit
                ? monitor
                : null;
            const customMonDims = effectiveCutoutMon?.customDimensions || monitor?.customDimensions;
            const resolvedMonitorTitle = kitEq.isKit
              ? kitEq.hasMonitorInKit
                ? kitEq.includedSubItems.find((s) => s.category === "monitor")?.name ||
                  kitEq.kitMonitorModel
                : effectiveCutoutMon?.displayName ||
                  kitEq.cutoutMonitorName ||
                  "Monitor do Cliente (Clique em Editar para informar)"
              : monitor?.displayName || "Padrão Homologado";

            const resolvedPrinterTitle = kitEq.isKit
              ? kitEq.hasPrinterInKit
                ? kitEq.includedSubItems.find((s) => s.category === "printer")?.name ||
                  "IMPRESSORA PDV - VT-8360 80mm"
                : printer?.displayName ||
                  kitEq.cutoutPrinterName ||
                  "Impressora do Cliente (Clique em Editar para informar)"
              : printer?.displayName || "Padrão Homologado";

            const resolvedReaderTitle = kitEq.isKit
              ? kitEq.includedSubItems.find((s) => s.category === "reader")?.name ||
                barcodeReader?.displayName ||
                ""
              : barcodeReader?.displayName || "";

            return (
              <Card
                key={id}
                className="p-4 sm:p-6 border-black/10 dark:border-slate-800 bg-white/95 dark:bg-slate-900/80 backdrop-blur-xl flex flex-col gap-4 shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-xl rounded-2xl transition-all"
              >
                {/* Topo do Card: Miniatura + Título + Modalidade + Preço */}
                <div className="flex flex-col sm:flex-row gap-4 sm:items-start">
                  {/* Imagem do Gabinete */}
                  <div className="relative aspect-[3/4] w-24 sm:w-28 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-black/10 dark:border-slate-800 p-2.5 flex items-center justify-center shrink-0 mx-auto sm:mx-0 shadow-inner">
                    <img
                      src={model.mainImage}
                      alt={model.name}
                      className="h-full w-auto object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.15)] dark:drop-shadow-[0_8px_16px_rgba(0,0,0,0.5)]"
                    />
                    <span className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-[#0071e3] text-white text-xs font-black flex items-center justify-center shadow-sm">
                      {index + 1}
                    </span>
                  </div>

                  {/* Cabeçalho e Resumo Financeiro Unitário */}
                  <div className="flex-1 min-w-0 space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <h3 className="text-lg sm:text-xl font-black text-[#1d1d1f] dark:text-white tracking-tight">
                            {model.name}
                          </h3>
                          {kitEq.isKit ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-500/10 dark:bg-indigo-500/20 text-[#0071e3] dark:text-indigo-300 border border-indigo-500/25 text-[10px] font-extrabold uppercase tracking-wider">
                              <Package className="w-3 h-3 shrink-0" />
                              {kitEq.selectedCount === kitEq.totalCount
                                ? `Gabinete + Kit Completo (${kitEq.selectedCount}/${kitEq.totalCount} itens)`
                                : `Gabinete + Kit Personalizado (${kitEq.selectedCount}/${kitEq.totalCount} itens)`}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 text-[10px] font-extrabold uppercase tracking-wider">
                              Só Gabinete CNC • Furação Grátis
                            </span>
                          )}
                        </div>

                        {/* Pílulas de Composição do Valor */}
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 font-medium">
                            <span
                              className="w-2.5 h-2.5 rounded-full border border-black/20 dark:border-slate-500 shrink-0"
                              style={{ background: color.hexReference }}
                            />
                            <span>
                              Cor: <strong className="text-slate-900 dark:text-white">{color.name}</strong>
                            </span>
                          </span>
                          <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 font-medium">
                            Gabinete no PIX:{" "}
                            <strong className="text-slate-900 dark:text-white">
                              {formatBRL(itemPricing.pixBasePriceCents + itemPricing.colorAdjustmentCents)}
                            </strong>
                          </span>
                          {itemPricing.equipmentAdjustmentCents > 0 && (
                            <span className="px-2 py-0.5 rounded-lg bg-blue-500/10 text-[#0071e3] dark:text-cyan-300 font-bold">
                              + Kit ({kitEq.selectedCount} itens):{" "}
                              {formatBRL(itemPricing.equipmentAdjustmentCents)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Bloco de Preço Total do Item */}
                      <div className="sm:text-right space-y-0.5 shrink-0 bg-emerald-50/60 dark:bg-emerald-950/20 sm:bg-transparent p-2.5 sm:p-0 rounded-xl border border-emerald-500/20 sm:border-0">
                        <div className="flex items-baseline sm:justify-end gap-1.5 flex-wrap">
                          <span className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                            {formatBRL(itemPixSubtotalCents)}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-extrabold border border-emerald-500/30 whitespace-nowrap">
                            <Zap className="w-2.5 h-2.5 fill-emerald-500 shrink-0" />
                            <span>no PIX</span>
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center sm:justify-end gap-1">
                          <CreditCard className="w-3 h-3 text-indigo-500 shrink-0" />
                          <span>
                            ou em até{" "}
                            <strong className="text-slate-700 dark:text-slate-300 font-bold">
                              10x de {formatBRL(Math.round(itemCardSubtotalCents / 10))}
                            </strong>{" "}
                            no cartão
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* GRID DETALHADO DE EQUIPAMENTOS E FURAÇÃO DO GABINETE (SEM CORTAR OS NOMES!) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      {/* 1. MONITOR / TELA */}
                      <div
                        className={cn(
                          "p-3 rounded-xl border space-y-1",
                          kitEq.isKit && !kitEq.hasMonitorInKit
                            ? "bg-amber-500/5 dark:bg-amber-950/20 border-amber-500/30"
                            : "bg-slate-50/90 dark:bg-slate-950/60 border-black/10 dark:border-slate-800"
                        )}
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <MonitorIcon className="w-3.5 h-3.5 text-[#0071e3] dark:text-cyan-400 shrink-0" />
                            {kitEq.isKit && kitEq.hasMonitorInKit
                              ? "Monitor Incluso no Kit"
                              : kitEq.isKit && !kitEq.hasMonitorInKit
                              ? "Seu Monitor (Furação no Gabinete)"
                              : "Monitor (Furação no Gabinete)"}
                          </span>
                          <span
                            className={cn(
                              "text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase",
                              kitEq.isKit && kitEq.hasMonitorInKit
                                ? "bg-blue-500/15 text-[#0071e3] dark:text-cyan-300"
                                : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                            )}
                          >
                            {kitEq.isKit && kitEq.hasMonitorInKit
                              ? "Vai no Kit"
                              : "Furação Grátis (+ R$ 0)"}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm font-extrabold text-[#1d1d1f] dark:text-white leading-snug break-words">
                          {resolvedMonitorTitle}
                        </p>
                        {kitEq.isKit && !kitEq.hasMonitorInKit && (
                          <p className="text-[11px] text-amber-700 dark:text-amber-300 font-medium">
                            Monitor removido do Kit • Gabinete será usinado na medida exata para esta tela.
                          </p>
                        )}
                        {customMonDims && (
                          <div className="pt-1 flex flex-wrap items-center gap-1.5 text-[10px] font-mono text-indigo-700 dark:text-indigo-300">
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">
                              <Ruler className="w-3 h-3 shrink-0" />
                              Visor: {customMonDims.screenWidthCm}×{customMonDims.screenHeightCm}cm • Ext:{" "}
                              {customMonDims.outerWidthCm}×{customMonDims.outerHeightCm}cm
                            </span>
                          </div>
                        )}
                      </div>

                      {/* 2. IMPRESSORA TÉRMICA */}
                      <div
                        className={cn(
                          "p-3 rounded-xl border space-y-1",
                          kitEq.isKit && !kitEq.hasPrinterInKit
                            ? "bg-amber-500/5 dark:bg-amber-950/20 border-amber-500/30"
                            : "bg-slate-50/90 dark:bg-slate-950/60 border-black/10 dark:border-slate-800"
                        )}
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <PrinterIcon className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            {kitEq.isKit && kitEq.hasPrinterInKit
                              ? "Impressora Inclusa no Kit"
                              : kitEq.isKit && !kitEq.hasPrinterInKit
                              ? "Sua Impressora (Suporte no Gabinete)"
                              : "Impressora (Suporte no Gabinete)"}
                          </span>
                          <span
                            className={cn(
                              "text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase",
                              kitEq.isKit && kitEq.hasPrinterInKit
                                ? "bg-blue-500/15 text-[#0071e3] dark:text-cyan-300"
                                : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                            )}
                          >
                            {kitEq.isKit && kitEq.hasPrinterInKit
                              ? "Vai no Kit"
                              : "Suporte Grátis (+ R$ 0)"}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm font-extrabold text-[#1d1d1f] dark:text-white leading-snug break-words">
                          {resolvedPrinterTitle}
                        </p>
                        {kitEq.isKit && !kitEq.hasPrinterInKit ? (
                          <p className="text-[11px] text-amber-700 dark:text-amber-300 font-medium">
                            Impressora removida do Kit • Gabinete será usinado com suporte/boca para este modelo.
                          </p>
                        ) : (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {kitEq.isKit && kitEq.hasPrinterInKit
                              ? "Impressora térmica 80mm enviada junto com o Kit"
                              : "Berço interno e rasgo frontal de saída de papel 80mm"}
                          </p>
                        )}
                      </div>

                      {/* 3. LEITOR DE CÓDIGO DE BARRAS / QR CODE (Quando ativo) */}
                      {resolvedReaderTitle && (
                        <div className="p-3 rounded-xl bg-slate-50/90 dark:bg-slate-950/60 border border-black/10 dark:border-slate-800 space-y-1 sm:col-span-2">
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                              <QrCode className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              {kitEq.isKit &&
                              kitEq.includedSubItems.some((s) => s.category === "reader")
                                ? "Leitor QR / Código de Barras (Incluso no Kit)"
                                : "Leitor QR / Código de Barras (Janela no Gabinete)"}
                            </span>
                            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                              {kitEq.isKit &&
                              kitEq.includedSubItems.some((s) => s.category === "reader")
                                ? "Vai no Kit"
                                : "Janela Usinada"}
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm font-bold text-[#1d1d1f] dark:text-white">
                            {resolvedReaderTitle}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* DETALHAMENTO COMPLETO DOS SUB-ITENS DO KIT DE MONTAGEM (QUANDO KIT ESTÁ SELECIONADO) */}
                    {kitEq.isKit && (
                      <div className="p-3.5 rounded-2xl bg-indigo-500/[0.04] dark:bg-indigo-950/25 border border-indigo-500/20 dark:border-indigo-500/30 space-y-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-extrabold text-[#1d1d1f] dark:text-indigo-200 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-[#0071e3] dark:text-indigo-400 shrink-0" />
                            Itens Inclusos no Seu Kit ({kitEq.selectedCount} de {kitEq.totalCount}{" "}
                            selecionados)
                          </span>
                          <span className="text-xs font-black text-[#0071e3] dark:text-indigo-300">
                            + {formatBRL(kitEq.kitPriceCents)}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {kitEq.includedSubItems.map((sub) => (
                            <span
                              key={sub.id}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-emerald-500/30 text-[11px] font-semibold text-slate-800 dark:text-slate-200 shadow-2xs"
                            >
                              <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400 stroke-[3] shrink-0" />
                              <span>{sub.name}</span>
                              {sub.priceCents > 0 && (
                                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                                  ({formatBRL(sub.priceCents)})
                                </span>
                              )}
                            </span>
                          ))}
                        </div>

                        {kitEq.removedSubItems.length > 0 && (
                          <div className="pt-1.5 border-t border-indigo-500/15 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                            <span className="font-bold text-amber-700 dark:text-amber-300">
                              Desmarcados do Kit:
                            </span>
                            {kitEq.removedSubItems.map((rem) => (
                              <span
                                key={rem.id}
                                className="px-2 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 line-through"
                              >
                                {rem.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Serviço de Montagem de Fábrica */}
                    {configuration.includeAssemblyService && (
                      <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-300">
                        <Wrench className="w-4 h-4 shrink-0" />
                        <span>
                          Serviço de Montagem Completa de Fábrica Contratado (+ R$ 999,00) — Totem entregue 100% montado e testado
                        </span>
                      </div>
                    )}

                    {/* Observações de Engenharia (se houver) */}
                    {configuration.customizationNotes && (
                      <div className="p-2.5 rounded-xl bg-slate-100/80 dark:bg-slate-950/70 border border-black/10 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400">
                        <strong className="text-slate-800 dark:text-slate-200">
                          Observações p/ Engenharia:
                        </strong>{" "}
                        {configuration.customizationNotes}
                      </div>
                    )}
                  </div>
                </div>

                {/* Barra Inferior do Card: Quantidade e Ações */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-black/10 dark:border-slate-800/80">
                  {/* Seletor de Quantidade (+/-) */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-500 mr-1">Qtd:</span>
                    <div className="flex items-center border border-black/15 dark:border-slate-700/80 rounded-xl bg-slate-50 dark:bg-slate-950">
                      <button
                        onClick={() => updateQuantity(id, quantity - 1)}
                        className="p-2 text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white active:scale-95 transition-all cursor-pointer"
                        aria-label="Diminuir quantidade"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-9 text-center text-xs font-black text-slate-900 dark:text-white select-none">
                        {quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(id, quantity + 1)}
                        className="p-2 text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white active:scale-95 transition-all cursor-pointer"
                        aria-label="Aumentar quantidade"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <span className="text-[11px] text-slate-500 font-medium">
                      ({formatBRL(itemPixUnitCents)} un. no PIX)
                    </span>
                  </div>

                  {/* Ações: Duplicar, Editar, Excluir */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        duplicateItem(id);
                        trackEvent(ANALYTICS_EVENTS.DUPLICATE_ITEM, {
                          itemId: id,
                          modelId: model.id,
                          modelName: model.name,
                        });
                      }}
                      title="Duplicar configuração para compra em lote"
                      className="h-9 px-3 text-xs font-bold active:scale-95 transition-transform"
                    >
                      <Copy className="w-3.5 h-3.5 mr-1.5 text-cyan-600 dark:text-cyan-400" />
                      Duplicar
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEditItem(id)}
                      title="Editar configurações deste totem"
                      className="h-9 px-3 text-xs font-bold active:scale-95 transition-transform"
                    >
                      <Edit3 className="w-3.5 h-3.5 mr-1.5 text-[#0071e3] dark:text-indigo-400" />
                      Editar
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        removeItem(id);
                        trackEvent(ANALYTICS_EVENTS.REMOVE_FROM_CART, {
                          itemId: id,
                          modelId: model.id,
                          modelName: model.name,
                          totalPriceCents: itemPixSubtotalCents,
                        });
                      }}
                      title="Remover do carrinho"
                      className="h-9 px-2.5 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:text-rose-300 dark:hover:bg-rose-950/30 active:scale-95 transition-transform"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Coluna Direita: Resumo do Pedido & Checkout */}
        <div className="lg:col-span-4 sticky top-24">
          <Card className="p-6 border-black/10 dark:border-slate-800 bg-white dark:bg-slate-900/80 backdrop-blur-xl space-y-6 shadow-sm dark:shadow-xl">
            <h2 className="text-base font-bold text-[#1d1d1f] dark:text-white pb-3 border-b border-black/10 dark:border-slate-800">
              Resumo do Pedido
            </h2>

            <div className="space-y-3 text-xs sm:text-sm">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Total de Totens:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-200">
                  {totalItems} {totalItems === 1 ? "unidade" : "unidades"}
                </span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Subtotal dos Gabinetes:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-200">
                  {formatBRL(eligibleCabinetsSubtotalCents)}
                </span>
              </div>

              {ineligibleSubtotalCents > 0 && (
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Kits & Periféricos (Integral):</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-200">
                    {formatBRL(ineligibleSubtotalCents)}
                  </span>
                </div>
              )}

              {appliedCoupon && couponDiscountCents > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                  <span>Desconto ({appliedCoupon.code} • {appliedCoupon.discountPercent}% no Gabinete):</span>
                  <span>-{formatBRL(couponDiscountCents)}</span>
                </div>
              )}

              <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                <span>Frete ({totalItems} {totalItems === 1 ? "volume" : "volumes"}):</span>
                {selectedShippingQuote ? (
                  <div className="text-right">
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {shippingCents === 0 ? "Grátis" : formatBRL(shippingCents)}
                    </span>
                    <span className="block text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                      {selectedShippingQuote.name || selectedShippingQuote.serviceName || selectedShippingQuote.carrier}
                    </span>
                    {totalItems > 1 && shippingCents > 0 && selectedShippingQuote.unitPriceCents > 0 && (
                      <span className="block text-[10px] text-slate-500 dark:text-slate-400">
                        {totalItems}× {formatBRL(selectedShippingQuote.unitPriceCents)} (1 frete por unidade)
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-slate-400 dark:text-slate-500 italic text-[11px]">
                    Calcular abaixo
                  </span>
                )}
              </div>

              {/* Bloco de Cálculo de Frete por CEP */}
              <div className="pt-3 border-t border-black/10 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-[#0071e3] dark:text-cyan-400" />
                    Calcular Frete e Prazo
                  </span>
                  {shippingQuotes.length > 0 && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                      {shippingQuotes.filter((q) => q.isAvailable).length} opções ({totalItems} {totalItems === 1 ? "vol." : "vols."})
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    id="cart-shipping-cep"
                    name="shippingCep"
                    aria-label="CEP para cálculo de frete"
                    type="text"
                    inputMode="numeric"
                    placeholder="00000-000"
                    value={shippingCep}
                    onChange={handleCepChange}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleCalculateShipping();
                      }
                    }}
                    className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-black/10 dark:border-slate-800 rounded-xl text-xs font-mono placeholder-slate-400 text-slate-900 dark:text-white focus:outline-none focus:border-[#0071e3]"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCalculateShipping}
                    disabled={isLoadingShipping || shippingCep.replace(/\D/g, "").length !== 8}
                    className="h-auto py-1 px-3 text-xs font-bold shrink-0"
                  >
                    {isLoadingShipping ? (
                      <span className="flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        {shippingRetryAttempt === 2 ? "Tentativa 2/2" : "Cotando (1/2)"}
                      </span>
                    ) : (
                      "Calcular"
                    )}
                  </Button>
                </div>

                {shippingError && (
                  <p className="text-[11px] text-rose-500 font-semibold">{shippingError}</p>
                )}

                {/* Lista de Opções de Frete (Correios, Transportadora e Retirada) */}
                {shippingQuotes.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    {shippingQuotes
                      .filter((q) => q.isAvailable)
                      .map((quote) => {
                        const isSelected = selectedShippingId === quote.id;
                        const daysText =
                          quote.deliveryDaysMin && quote.deliveryDaysMax
                            ? `${quote.deliveryDaysMin} a ${quote.deliveryDaysMax} dias úteis`
                            : `${quote.deliveryDays || quote.deliveryDaysMax || 5} dias úteis`;
                        return (
                          <div
                            key={quote.id}
                            onClick={() => {
                              setSelectedShippingId(quote.id);
                              if (typeof window !== "undefined") {
                                sessionStorage.setItem("totem_shipping_option_id", quote.id);
                              }
                            }}
                            className={cn(
                              "p-2.5 rounded-xl border text-xs cursor-pointer flex items-center justify-between gap-2 transition-all",
                              isSelected
                                ? "border-[#0071e3] bg-blue-50/70 dark:bg-blue-950/40 text-slate-900 dark:text-white font-semibold ring-1 ring-[#0071e3]/30"
                                : "border-black/10 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-slate-600 dark:text-slate-400 hover:border-black/20"
                            )}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div
                                className={cn(
                                  "w-4 h-4 rounded-full border flex items-center justify-center shrink-0",
                                  isSelected
                                    ? "border-[#0071e3] bg-[#0071e3] text-white"
                                    : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                                )}
                              >
                                {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-[#1d1d1f] dark:text-white leading-tight truncate">
                                  {quote.name || quote.serviceName || quote.carrier}
                                </div>
                                <div className="text-[10px] text-slate-500 dark:text-slate-400">
                                  Prazo: {daysText}
                                  {totalItems > 1 && quote.priceCents > 0 && quote.unitPriceCents
                                    ? ` • ${totalItems}× ${formatBRL(quote.unitPriceCents)}`
                                    : ""}
                                </div>
                              </div>
                            </div>
                            <span className="font-black text-[#0071e3] dark:text-cyan-400 shrink-0">
                              {quote.priceCents === 0 ? "Grátis" : formatBRL(quote.priceCents)}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

              {/* Bloco de Cupom de Desconto */}
              <div className="pt-3 border-t border-black/10 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-[#0071e3] dark:text-indigo-400" />
                    Cupom de Desconto
                  </span>
                  {appliedCoupon && (
                    <button
                      onClick={removeCoupon}
                      className="text-[11px] text-rose-500 hover:text-rose-600 font-semibold cursor-pointer"
                    >
                      Remover
                    </button>
                  )}
                </div>

                {appliedCoupon ? (
                  <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <div>
                        <div className="font-bold text-emerald-800 dark:text-emerald-300 font-mono">
                          {appliedCoupon.code}
                        </div>
                        <div className="text-[10px] text-emerald-700 dark:text-emerald-400">
                          {appliedCoupon.discountPercent}% OFF exclusivo no Gabinete
                        </div>
                      </div>
                    </div>
                    <span className="font-bold text-emerald-700 dark:text-emerald-400">
                      -{formatBRL(couponDiscountCents)}
                    </span>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex gap-2">
                      <input
                        id="cart-coupon-code"
                        name="couponCode"
                        aria-label="Código do cupom de desconto"
                        type="text"
                        placeholder="Código do cupom..."
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            applyCoupon(couponInput);
                          }
                        }}
                        className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-black/10 dark:border-slate-800 rounded-xl text-xs font-mono uppercase placeholder-slate-400 text-slate-900 dark:text-white focus:outline-none focus:border-[#0071e3]"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => applyCoupon(couponInput)}
                        disabled={isApplyingCoupon || !couponInput.trim()}
                        className="h-auto py-1 px-3 text-xs font-bold shrink-0"
                      >
                        {isApplyingCoupon ? "..." : "Aplicar"}
                      </Button>
                    </div>
                    {couponError && (
                      <p className="text-[11px] text-rose-500 font-semibold">{couponError}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-black/10 dark:border-slate-800 space-y-2.5">
                <div className="p-3.5 rounded-2xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/70 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs sm:text-sm font-extrabold text-emerald-800 dark:text-emerald-300">
                      <Zap className="w-4 h-4 fill-emerald-500 text-emerald-600 shrink-0" />
                      <span>Total no PIX à vista:</span>
                    </div>
                    <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                      {formatBRL(finalPixTotal + shippingCents)}
                    </span>
                  </div>
                  {cartPixSavings > 0 && (
                    <div className="flex items-center justify-between text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">
                      <span>Desconto à vista no PIX aplicado</span>
                      <span>Economia de {formatBRL(cartPixSavings)}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
                  <span className="flex items-center gap-1.5 font-medium">
                    <CreditCard className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span>No Cartão:</span>
                  </span>
                  <div className="text-right">
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      Cartão em até 10x, com condições informadas pelo Mercado Pago
                    </span>
                    <span className="block text-[10px] text-slate-400">
                      (Total no cartão: {formatBRL(finalCardTotal + shippingCents)})
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-black/10 dark:border-slate-800/80 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-300">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Garantia de Encaixe e Furação</span>
              </div>
              <p>
                Cada gabinete é inspecionado e usinado rigorosamente conforme os equipamentos declarados.
              </p>
            </div>

            <div className="space-y-2.5">
              <Button
                variant="primary"
                size="lg"
                onClick={() => {
                  const clean = shippingCep.replace(/\D/g, "");
                  if (typeof window !== "undefined" && clean.length === 8) {
                    sessionStorage.setItem("totem_shipping_cep", clean);
                    if (selectedShippingId) {
                      sessionStorage.setItem("totem_shipping_option_id", selectedShippingId);
                    }
                  }
                  trackEvent(ANALYTICS_EVENTS.BEGIN_CHECKOUT, {
                    totalItems,
                    totalPriceCents,
                    shippingCents,
                  });
                  onProceedToCheckout();
                }}
                className="w-full font-bold shadow-blue-500/25 shadow-lg bg-[#0071e3] hover:bg-[#0077ed]"
              >
                Avançar para o Checkout <ArrowRight className="w-4 h-4 ml-2" />
              </Button>

              {/* BOTÃO DE CAPTURA B2B: RECEBER ORÇAMENTO FORMAL EM PDF NO WHATSAPP */}
              <button
                type="button"
                onClick={() => setShowQuoteForm((prev) => !prev)}
                className="w-full py-2.5 px-3.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/50 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
              >
                <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Receber Orçamento Formal em PDF no WhatsApp</span>
              </button>

              {showQuoteForm && (
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/90 border border-emerald-500/40 space-y-2.5 text-xs animate-in fade-in duration-200">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-extrabold text-slate-900 dark:text-emerald-300 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>Emissão de Proposta Comercial (PDF + WhatsApp)</span>
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                      Validade 7 dias
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    Ideal para aprovação da diretoria/sócios. Gere o PDF timbrado com especificações técnicas e receba atendimento no WhatsApp:
                  </p>

                  <div className="space-y-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                        Seu Nome ou Empresa *
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: João Silva / Rede Farmácias..."
                        value={quoteName}
                        onChange={(e) => setQuoteName(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-black/15 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                        Seu WhatsApp com DDD *
                      </label>
                      <input
                        type="tel"
                        inputMode="numeric"
                        placeholder="(11) 99999-9999"
                        value={quoteWhatsapp}
                        onChange={handleQuoteWhatsappChange}
                        className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-black/15 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                        CNPJ / CPF ou E-mail (Opcional — sai no cabeçalho do PDF)
                      </label>
                      <input
                        type="text"
                        placeholder="00.000.000/0001-00 ou email@empresa.com.br"
                        value={quoteDocOrEmail}
                        onChange={(e) => setQuoteDocOrEmail(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-black/15 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {quoteError && (
                    <p className="text-[11px] font-bold text-rose-500">{quoteError}</p>
                  )}

                  <button
                    type="button"
                    onClick={handleGenerateFormalQuotePdfAndWhatsapp}
                    className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer transition-all"
                  >
                    <FileText className="w-3.5 h-3.5 shrink-0" />
                    <span>Gerar Orçamento em PDF & Receber no WhatsApp</span>
                  </button>

                  {generatedQuoteRef && (
                    <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 space-y-2 text-[11px]">
                      <div className="font-bold text-emerald-700 dark:text-emerald-300 flex items-center justify-between">
                        <span>✓ Proposta {generatedQuoteRef} emitida!</span>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-1.5">
                        <a
                          href={generatedWhatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-1.5 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-center flex items-center justify-center gap-1"
                        >
                          <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>Enviar / Abrir no WhatsApp</span>
                        </a>
                        <button
                          type="button"
                          onClick={() =>
                            openPrintableFormalQuotePdf(
                              generatedQuoteRef,
                              quoteName.trim(),
                              quoteWhatsapp,
                              quoteDocOrEmail.trim(),
                              generatedWhatsappUrl
                            )
                          }
                          className="py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold cursor-pointer"
                        >
                          🖨️ Reabrir PDF
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
