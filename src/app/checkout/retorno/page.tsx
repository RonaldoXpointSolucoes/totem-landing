"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/modules/cart/CartContext";
import { formatBRL } from "@/modules/pricing/pricingEngine";
import { trackEvent, ANALYTICS_EVENTS } from "@/lib/analytics/tracker";

type Status = { orderNumber: string; totalCents: number; isPaid: boolean; paymentStatus: string; expired: boolean };

function PaymentReturn() {
  const params = useSearchParams();
  const { clearCart } = useCart();
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState("");
  const orderId = params.get("orderId") || "";
  const token = params.get("token") || "";
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const res = await fetch(`/api/checkout/status?orderId=${encodeURIComponent(orderId)}&token=${encodeURIComponent(token)}`, { cache: "no-store" });
        const data = await res.json();
        if (!active) return;
        if (!res.ok || !data.ok) { setError(data.error || "Não foi possível verificar o pagamento."); return; }
        setError(""); setStatus(data);
        if (data.isPaid) {
          clearCart();
          if (!sessionStorage.getItem(`purchase_confirmed_${orderId}`)) {
            trackEvent(ANALYTICS_EVENTS.PURCHASE, { orderId, orderNumber: data.orderNumber, totalCents: data.totalCents, totalPriceCents: data.totalCents, source: "mercadopago_verified" });
            sessionStorage.setItem(`purchase_confirmed_${orderId}`, "1");
          }
          return;
        }
        if (!data.expired && !["failed", "cancelled", "refunded", "charged_back"].includes(data.paymentStatus)) timer = setTimeout(poll, 5000);
      } catch {
        if (active) { setError("Conexão indisponível. Aguardando para consultar novamente."); timer = setTimeout(poll, 10000); }
      }
    };
    if (orderId && token) poll(); else setError("Link de acompanhamento inválido.");
    return () => { active = false; clearTimeout(timer); };
  }, [orderId, token, clearCart]);
  const failed = status && ["failed", "cancelled", "refunded", "charged_back"].includes(status.paymentStatus);
  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 px-4 py-16">
      <section className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-5">
        <p className="text-sm font-semibold text-blue-600">Totem X-Point · Mercado Pago</p>
        <h1 className="text-2xl font-bold">{status?.isPaid ? "Pagamento confirmado" : failed ? "Pagamento não concluído" : status?.expired ? "Prazo de pagamento encerrado" : "Verificando seu pagamento"}</h1>
        {status && <p>Pedido <strong>{status.orderNumber}</strong> · {formatBRL(status.totalCents)}</p>}
        <p className="text-sm text-slate-600 dark:text-slate-300">{status?.isPaid ? "Recebemos a confirmação do Mercado Pago. Você pode acompanhar seu pedido na sua conta." : "O pedido será confirmado após a aprovação pelo Mercado Pago. Se o pagamento estiver em análise, aguarde a atualização."}</p>
        {error && <p role="alert" className="text-sm text-amber-700">{error}</p>}
        <Link href="/minha-conta" className="block rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white">Acompanhar meus pedidos</Link>
        {!status?.isPaid && <Link href="/checkout" className="block text-sm text-blue-600">Voltar ao checkout</Link>}
      </section>
    </main>
  );
}

export default function PaymentReturnPage() {
  return <Suspense fallback={<p className="p-8 text-center">Consultando pagamento…</p>}><PaymentReturn /></Suspense>;
}
