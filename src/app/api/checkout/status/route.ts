import { NextResponse } from "next/server";
import { getOrderWithDetails } from "@/lib/appwrite/server";
import { verifyCheckoutStatusToken } from "@/lib/payments/mercadoPago";
import { refreshMercadoPagoOrder } from "@/lib/payments/mercadoPagoStore";

export const dynamic = "force-dynamic";
const lastRefresh = new Map<string, number>();

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("orderId");

    if (!orderId) {
      return NextResponse.json({ ok: false, error: "Parâmetro orderId obrigatório." }, { status: 400 });
    }
    if (!verifyCheckoutStatusToken(orderId, searchParams.get("token") || "")) {
      return NextResponse.json({ ok: false, error: "Acesso ao pedido inválido." }, { status: 403 });
    }

    let orderDetails = await getOrderWithDetails(orderId);
    if (!orderDetails) {
      return NextResponse.json({ ok: false, error: "Pedido não localizado." }, { status: 404 });
    }

    let syncPending = false;
    if (orderDetails.payment?.provider === "mercadopago" && orderDetails.order.status === "awaiting_payment" && Date.now() - (lastRefresh.get(orderId) || 0) >= 15000) {
      if (lastRefresh.size > 5000) lastRefresh.clear();
      lastRefresh.set(orderId, Date.now());
      try {
        await refreshMercadoPagoOrder(orderId, orderDetails.payment.payment_method === "pix" ? orderDetails.payment.gateway_payment_id || undefined : undefined);
        orderDetails = await getOrderWithDetails(orderId) || orderDetails;
      } catch { syncPending = true; }
    }
    const paymentStatus = orderDetails.payment?.status || "pending";
    const isPaid = ["paid", "partially_refunded"].includes(paymentStatus) && ["paid", "in_production", "ready", "shipped", "delivered"].includes(orderDetails.order.status);
    const expired = !isPaid && Date.parse(orderDetails.payment?.expires_at || "") < Date.now();

    return NextResponse.json({
      ok: true,
      status: orderDetails.order.status,
      isPaid,
      paymentStatus, expired, syncPending,
      method: orderDetails.payment?.payment_method || "pix",
      orderNumber: orderDetails.order.order_number,
      paidAt: orderDetails.payment?.paid_at || null,
      totalCents: orderDetails.order.total_cents,
    }, { headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: "Não foi possível consultar o pagamento." },
      { status: 500 }
    );
  }
}
