"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/modules/cart/CartContext";
import { formatBRL } from "@/modules/pricing/pricingEngine";
import { trackEvent, ANALYTICS_EVENTS } from "@/lib/analytics/tracker";
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  Copy,
  Check,
  CreditCard,
  QrCode,
  RefreshCw,
  ShieldCheck,
  ExternalLink,
  ArrowLeft,
} from "lucide-react";

type StatusData = {
  ok: boolean;
  status: string;
  orderNumber: string;
  customerName?: string;
  totalCents: number;
  isPaid: boolean;
  paymentStatus: string;
  gatewayStatus?: string;
  statusTranslation?: {
    code: string;
    label: string;
    description: string;
    customerMessage: string;
    severity: "success" | "info" | "warn" | "error";
    canRetry: boolean;
  };
  expired: boolean;
  method: "pix" | "credit_card";
  pixCode?: string;
  checkoutUrl?: string;
  expiresAt?: string;
  paidAt?: string | null;
  subtotalCents?: number;
  shippingCents?: number;
  discountCents?: number;
  items?: {
    id: string;
    cabinetName: string;
    colorName: string;
    monitorName: string;
    printerName: string;
    readerName?: string;
    quantity: number;
    unitPriceCents: number;
    subtotalCents: number;
    deliveryChecklist?: {
      id: string;
      name: string;
      category: string;
      priceCents: number;
      included: boolean;
      quantity: number;
      badgeLabel: string;
      notes?: string;
    }[];
  }[];
  additionalCharges?: {
    id: string;
    description: string;
    amountCents: number;
    quantity?: number;
  }[];
};

function PaymentReturnContent() {
  const params = useSearchParams();
  const { clearCart } = useCart();
  const [status, setStatus] = useState<StatusData | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [error, setError] = useState("");
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [copiedPix, setCopiedPix] = useState(false);

  const orderId = params.get("orderId") || "";
  const token = params.get("token") || "";
  const mpReturnStatus = params.get("mp_status") || params.get("collection_status") || params.get("status") || "";

  const fetchStatus = useCallback(
    async (forceSync = false) => {
      if (!orderId || !token) return;
      try {
        const res = await fetch(
          `/api/checkout/status?orderId=${encodeURIComponent(orderId)}&token=${encodeURIComponent(token)}${forceSync ? "&forceSync=1" : ""}`,
          { cache: "no-store" }
        );
        const data = await res.json();
        if (!res.ok || !data.ok) {
          setError(data.error || "Não foi possível verificar o pagamento.");
          return;
        }
        setError("");
        setStatus(data);

        if (data.isPaid) {
          clearCart();
          if (!sessionStorage.getItem(`purchase_confirmed_${orderId}`)) {
            trackEvent(ANALYTICS_EVENTS.PURCHASE, {
              orderId,
              orderNumber: data.orderNumber,
              totalCents: data.totalCents,
              totalPriceCents: data.totalCents,
              source: "mercadopago_verified",
            });
            sessionStorage.setItem(`purchase_confirmed_${orderId}`, "1");
          }
        }
      } catch {
        setError("Oscilação de conexão ao consultar pagamento. Tentando novamente...");
      }
    },
    [orderId, token, clearCart]
  );

  useEffect(() => {
    if (!orderId || !token) {
      setError("Link de acompanhamento inválido ou incompleto.");
      return;
    }
    fetchStatus(true);
    const interval = setInterval(() => {
      fetchStatus(false);
    }, 5000);
    return () => clearInterval(interval);
  }, [orderId, token, fetchStatus]);

  const handleRegeneratePayment = async (targetMethod: "pix" | "credit_card", autoRedirectCard = false) => {
    if (!orderId || !token || isRegenerating) return;
    setIsRegenerating(true);
    setError("");
    try {
      const res = await fetch("/api/checkout/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, token, method: targetMethod }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Não foi possível gerar nova cobrança.");
      }

      if (data.payment?.qrCodeUrl) {
        setQrCodeDataUrl(data.payment.qrCodeUrl);
      }

      await fetchStatus(false);

      if (autoRedirectCard && data.payment?.checkoutUrl) {
        window.location.assign(data.payment.checkoutUrl);
      }
    } catch (err: any) {
      setError(err?.message || "Erro ao regenerar pagamento.");
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleCopyPix = () => {
    if (!status?.pixCode) return;
    navigator.clipboard.writeText(status.pixCode);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2500);
  };

  const isFailed =
    status &&
    !status.isPaid &&
    (["failed", "rejected", "cancelled"].includes(status.paymentStatus) ||
      status.statusTranslation?.severity === "error" ||
      mpReturnStatus === "rejected" ||
      mpReturnStatus === "failure");

  const isExpired = Boolean(status && !status.isPaid && status.expired);

  const effectiveQrUrl =
    qrCodeDataUrl ||
    (status?.pixCode
      ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&data=${encodeURIComponent(status.pixCode)}`
      : "");

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 px-4 py-10 sm:py-16">
      <div className="mx-auto max-w-xl space-y-5">
        <div className="flex items-center justify-between">
          <Link
            href="/?view=checkout"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Voltar à Loja
          </Link>
          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
            <ShieldCheck className="w-4 h-4" />
            Ambiente Seguro Mercado Pago
          </span>
        </div>

        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-lg space-y-6 text-center">
          {/* Status Icon */}
          <div className="flex justify-center">
            {status?.isPaid ? (
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 border-2 border-emerald-500 flex items-center justify-center text-emerald-500">
                <CheckCircle2 className="w-9 h-9" />
              </div>
            ) : isFailed || isExpired ? (
              <div className="w-16 h-16 rounded-full bg-amber-500/15 border-2 border-amber-500 flex items-center justify-center text-amber-500">
                <AlertTriangle className="w-9 h-9" />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-full bg-blue-500/15 border-2 border-blue-500 flex items-center justify-center text-blue-500">
                <Clock className="w-9 h-9 animate-pulse" />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              Totem Pro X-Point · {status?.method === "credit_card" ? "Cartão de Crédito" : "Pix à Vista"}
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              {status?.isPaid
                ? "Pagamento Confirmado!"
                : status?.statusTranslation?.label ||
                  (isFailed
                    ? "Pagamento Não Autorizado"
                    : isExpired
                    ? "Prazo da Cobrança Expirado"
                    : "Aguardando Confirmação do Pagamento")}
            </h1>
            {status && (
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Pedido <strong className="font-mono text-blue-600 dark:text-blue-400">{status.orderNumber}</strong>
                {status.customerName ? ` • ${status.customerName}` : ""}
              </p>
            )}
          </div>

          {/* Resumo dos Itens, Adicionais e Valor Total */}
          {status && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3 text-left">
              {status.items && status.items.length > 0 && (
                <div className="space-y-2 pb-3 border-b border-slate-200 dark:border-slate-800 text-xs">
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 font-extrabold block">
                    Itens do Pedido ({status.items.length})
                  </span>
                  {status.items.map((it, idx) => {
                    const includedItems = (it.deliveryChecklist || []).filter((c) => c.included);
                    const removedItems = (it.deliveryChecklist || []).filter((c) => !c.included);
                    return (
                      <div
                        key={it.id || idx}
                        className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-0.5 min-w-0">
                            <p className="font-bold text-slate-900 dark:text-white text-sm">
                              {it.quantity}x {it.cabinetName} ({it.colorName})
                            </p>
                            <p className="text-[11px] text-slate-600 dark:text-slate-400">
                              • Monitor: <strong className="text-slate-800 dark:text-slate-200">{it.monitorName}</strong>
                            </p>
                            <p className="text-[11px] text-slate-600 dark:text-slate-400">
                              • Impressora: <strong className="text-slate-800 dark:text-slate-200">{it.printerName}</strong>
                            </p>
                          </div>
                          <span className="font-extrabold text-slate-900 dark:text-white font-mono shrink-0 text-sm">
                            {formatBRL(it.subtotalCents)}
                          </span>
                        </div>

                        {includedItems.length > 0 && (
                          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
                            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                              ✓ Itens Inclusos na Entrega deste Pedido ({includedItems.length})
                            </span>
                            <div className="grid grid-cols-1 gap-1">
                              {includedItems.map((chk) => (
                                <div
                                  key={chk.id}
                                  className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between gap-2 text-[11px]"
                                >
                                  <span className="font-semibold text-emerald-900 dark:text-emerald-200">
                                    ✓ {chk.name}
                                  </span>
                                  {chk.priceCents > 0 && (
                                    <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300 shrink-0">
                                      + {formatBRL(chk.priceCents)}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {removedItems.length > 0 && (
                          <div className="pt-1.5 space-y-1">
                            <span className="text-[10px] font-black uppercase tracking-wider text-rose-500 block">
                              ✕ Itens Removidos do Kit pelo Cliente (Não Cobrados)
                            </span>
                            <div className="grid grid-cols-1 gap-1">
                              {removedItems.map((chk) => (
                                <div
                                  key={chk.id}
                                  className="px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-between gap-2 text-[11px] opacity-80"
                                >
                                  <span className="text-rose-700 dark:text-rose-300 line-through">
                                    ✕ {chk.name}
                                  </span>
                                  <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 shrink-0">
                                    Não cobrado (R$ 0,00)
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {status.additionalCharges && status.additionalCharges.length > 0 && (
                <div className="space-y-1.5 pb-3 border-b border-slate-200 dark:border-slate-800 text-xs">
                  <span className="text-[10px] uppercase tracking-wider text-amber-600 dark:text-amber-400 font-extrabold block">
                    Itens / Valores Adicionais Inclusos
                  </span>
                  {status.additionalCharges.map((ch, idx) => {
                    const qty = ch.quantity || 1;
                    const lineTotal = (ch.amountCents || 0) * qty;
                    return (
                      <div
                        key={ch.id || idx}
                        className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-2"
                      >
                        <span className="font-semibold text-amber-900 dark:text-amber-200">
                          + {ch.description} {qty > 1 ? `(${qty}x)` : ""}
                        </span>
                        <span className="font-extrabold text-amber-700 dark:text-amber-300 font-mono shrink-0">
                          {formatBRL(lineTotal)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {typeof status.shippingCents === "number" && status.shippingCents > 0 && (
                <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                  <span>Frete / Entrega:</span>
                  <span className="font-bold font-mono text-slate-800 dark:text-slate-200">
                    {formatBRL(status.shippingCents)}
                  </span>
                </div>
              )}

              <div className="text-center pt-1">
                <span className="text-[11px] uppercase tracking-wider text-slate-500 font-bold block">
                  Valor Total do Pedido
                </span>
                <span className="text-3xl font-black text-blue-600 dark:text-indigo-400 mt-0.5 block">
                  {formatBRL(status.totalCents)}
                </span>
              </div>
            </div>
          )}

          {/* Explicação detalhada do Mercado Pago */}
          {status?.statusTranslation && !status.isPaid && (
            <div
              className={`p-4 rounded-xl border text-left text-xs space-y-1.5 ${
                status.statusTranslation.severity === "error"
                  ? "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300"
                  : status.statusTranslation.severity === "warn"
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300"
                  : "bg-blue-500/10 border-blue-500/20 text-slate-700 dark:text-slate-300"
              }`}
            >
              <p className="font-bold text-sm">{status.statusTranslation.label}</p>
              <p>{status.statusTranslation.customerMessage}</p>
            </div>
          )}

          {error && (
            <div role="alert" className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-600 dark:text-rose-300">
              {error}
            </div>
          )}

          {/* SEÇÃO PIX ATIVO */}
          {status && !status.isPaid && status.method === "pix" && status.pixCode && !isExpired && (
            <div className="space-y-4 pt-2">
              {effectiveQrUrl && (
                <div className="flex flex-col items-center space-y-2">
                  <div className="p-3 bg-white rounded-2xl border-2 border-slate-200 shadow-md inline-block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={effectiveQrUrl} alt="QR Code Pix" width={220} height={220} className="w-48 h-48 object-contain" />
                  </div>
                  <span className="text-xs text-slate-500 flex items-center gap-1.5">
                    <QrCode className="w-4 h-4 text-cyan-500" />
                    Escaneie no aplicativo do seu banco
                  </span>
                </div>
              )}

              <div className="space-y-1.5 text-left">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Código Pix Copia e Cola:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={status.pixCode}
                    className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs font-mono text-slate-700 dark:text-slate-300 select-all"
                  />
                  <button
                    type="button"
                    onClick={handleCopyPix}
                    className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition cursor-pointer"
                  >
                    {copiedPix ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copiedPix ? "Copiado!" : "Copiar"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* BOTÕES DE AÇÃO E RECUPERAÇÃO IMEDIATA */}
          {status && !status.isPaid && (
            <div className="space-y-3 pt-2">
              {status.method === "credit_card" && status.checkoutUrl && !isExpired && (
                <a
                  href={status.checkoutUrl}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-5 py-3.5 font-bold text-sm text-white shadow-lg shadow-blue-600/25 transition"
                >
                  <CreditCard className="w-4 h-4" />
                  Pagar com Cartão no Mercado Pago (Até 10x)
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  disabled={isRegenerating}
                  onClick={() => handleRegeneratePayment("pix", false)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 px-4 py-3 text-xs font-bold text-emerald-700 dark:text-emerald-300 transition cursor-pointer disabled:opacity-50"
                >
                  {isRegenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
                  {status.method === "pix" ? "Gerar Novo QR Code Pix (24h)" : "Alternar e Pagar com Pix"}
                </button>

                <button
                  type="button"
                  disabled={isRegenerating}
                  onClick={() => handleRegeneratePayment("credit_card", true)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/20 px-4 py-3 text-xs font-bold text-blue-700 dark:text-blue-300 transition cursor-pointer disabled:opacity-50"
                >
                  {isRegenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                  {status.method === "credit_card" ? "Gerar Novo Link de Cartão" : "Pagar com Cartão (Até 10x)"}
                </button>
              </div>

              <button
                type="button"
                onClick={() => fetchStatus(true)}
                className="inline-flex items-center justify-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white pt-1 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Já realizei o pagamento — Verificar agora
              </button>
            </div>
          )}

          {status?.isPaid && (
            <div className="space-y-3 pt-2">
              <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                Recebemos a confirmação do Mercado Pago! Sua ordem de produção já foi liberada para a nossa fábrica CNC.
              </p>
              <Link
                href="/minha-conta"
                className="block rounded-xl bg-emerald-600 hover:bg-emerald-500 px-5 py-3.5 font-bold text-sm text-white shadow-lg shadow-emerald-600/25 transition"
              >
                Acompanhar Meu Pedido
              </Link>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default function PaymentReturnPage() {
  return (
    <Suspense fallback={<p className="p-12 text-center text-sm text-slate-500">Consultando status do pagamento no Mercado Pago…</p>}>
      <PaymentReturnContent />
    </Suspense>
  );
}
