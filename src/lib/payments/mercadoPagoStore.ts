import { Query } from "node-appwrite";
import { PaymentStatus } from "@/types/order";
import { getOrderWithDetails, getServerDatabases } from "@/lib/appwrite/server";
import { APPWRITE_CONFIG } from "@/lib/appwrite/config";
import { findOrderByNumber, saveLocalOrder } from "@/lib/orders/orderStore";
import { syncOrderStatusToVoucherUsage } from "@/lib/vouchers/voucherStore";
import { logEcosystemEvent } from "@/lib/logging/ecosystemLogger";
import { notifyPaymentConfirmedOnWhatsApp } from "@/lib/notifications/whatsappNotifier";
import { mercadoPagoRequest, MercadoPagoPayment, paymentMatchesOrder } from "./mercadoPago";

export async function updateMercadoPagoPayment(orderId: string, data: Record<string, unknown>) {
  const db = getServerDatabases();
  const payments = await db.listDocuments(APPWRITE_CONFIG.databaseId, APPWRITE_CONFIG.collections.payments, [
    Query.equal("order_id", orderId), Query.equal("provider", "mercadopago"), Query.limit(1),
  ]);
  if (!payments.documents[0]) throw new Error("Registro de pagamento indisponível.");
  return db.updateDocument(APPWRITE_CONFIG.databaseId, APPWRITE_CONFIG.collections.payments, payments.documents[0].$id, data);
}

/** Every state change uses the authenticated API response, never a callback body or return URL. */
export async function reconcileMercadoPagoPayment(paymentId: string) {
  if (!/^\d+$/.test(paymentId)) throw new Error("Identificador de pagamento inválido.");
  const payment = await mercadoPagoRequest<MercadoPagoPayment>(`/v1/payments/${paymentId}`);
  if (!payment.external_reference || (payment.metadata?.order_id && payment.external_reference !== payment.metadata.order_id)) return { ignored: true };
  const details = await getOrderWithDetails(payment.external_reference);
  if (!details && !payment.metadata?.order_id) return { ignored: true };
  if (!details || details.payment?.provider !== "mercadopago") throw new Error("Pedido de pagamento indisponível.");
  const { order, payment: storedPayment } = details;
  const method = storedPayment.payment_method === "credit_card" ? "credit_card" : "pix";
  const hasMerchantOrder = method === "credit_card" && payment.order?.id;
  if (!paymentMatchesOrder(payment, { id: order.$id, totalCents: order.total_cents, method, allowPartial: Boolean(hasMerchantOrder), allowMissingMetadata: Boolean(hasMerchantOrder) })) {
    throw new Error("Pagamento incompatível com o pedido.");
  }
  if (!hasMerchantOrder && storedPayment.status === "paid" && storedPayment.gateway_payment_id && storedPayment.gateway_payment_id !== paymentId) {
    console.error("Pagamento adicional para pedido já pago", { orderId: order.$id, paymentId });
    return { ignored: true };
  }
  let approved = payment.status === "approved";
  let reversed = ["refunded", "charged_back"].includes(payment.status);
  let hasChargeback = payment.status === "charged_back";
  let partiallyRefunded = approved && (payment.transaction_amount_refunded || 0) > 0;
  if (hasMerchantOrder) {
    if (storedPayment.status === "paid" && storedPayment.gateway_order_id && storedPayment.gateway_order_id !== String(payment.order!.id)) return { ignored: true };
    // This account grants access to Payments API. Reconcile split payments through that API.
    const search = await mercadoPagoRequest<{ results: MercadoPagoPayment[]; paging?: { total: number } }>(
      `/v1/payments/search?external_reference=${encodeURIComponent(order.$id)}&sort=date_created&criteria=desc&limit=100`
    );
    if ((search.paging?.total || 0) > 100) throw new Error("Histórico de pagamento requer conferência.");
    const parts = search.results.filter((p) => p.external_reference === order.$id && String(p.order?.id) === String(payment.order!.id));
    if (!parts.some((p) => String(p.id) === paymentId)) throw new Error("Pagamento ainda não disponível para conciliação.");
    let approvedCents = 0;
    let refundedCents = 0;
    let chargeback = false;
    for (const part of parts) {
      if (!["approved", "refunded", "charged_back"].includes(part.status)) continue;
      const verified = String(part.id) === paymentId ? payment : await mercadoPagoRequest<MercadoPagoPayment>(`/v1/payments/${part.id}`);
      if (!paymentMatchesOrder(verified, { id: order.$id, totalCents: order.total_cents, method, allowPartial: true, allowMissingMetadata: true }) || String(verified.order?.id) !== String(payment.order!.id)) throw new Error("Parcela de pagamento incompatível.");
      if (verified.status === "approved") approvedCents += Math.round(verified.transaction_amount * 100);
      refundedCents += Math.round((verified.transaction_amount_refunded || (verified.status === "refunded" ? verified.transaction_amount : 0)) * 100);
      chargeback ||= verified.status === "charged_back";
    }
    approved = approvedCents >= order.total_cents;
    reversed = chargeback || refundedCents >= order.total_cents;
    hasChargeback = chargeback;
    partiallyRefunded = refundedCents > 0 && !reversed;
  }
  const status = reversed ? (hasChargeback ? "charged_back" : "refunded") : partiallyRefunded ? "partially_refunded" : approved ? "paid" :
    payment.status === "rejected" ? "failed" : payment.status === "cancelled" ? "cancelled" : "pending";
  // Older pending/rejected deliveries cannot undo an already approved payment.
  if (["paid", "partially_refunded", "refunded", "charged_back"].includes(storedPayment.status) && !approved && !reversed) return { ignored: true };
  const paidAt = payment.date_approved || storedPayment.paid_at || null;
  await updateMercadoPagoPayment(order.$id, {
    gateway_payment_id: paymentId, gateway_status: payment.status, status,
    ...(hasMerchantOrder ? { gateway_order_id: String(payment.order!.id) } : {}),
    ...(paidAt ? { paid_at: paidAt } : {}),
  });
  // Retrying after a partial database failure repairs the order without duplicating a purchase.
  const nextStatus = reversed || (!hasMerchantOrder && payment.status === "cancelled") ? "cancelled" : approved && order.status === "awaiting_payment" ? "paid" : order.status;
  if (nextStatus !== order.status) {
    await getServerDatabases().updateDocument(APPWRITE_CONFIG.databaseId, APPWRITE_CONFIG.collections.orders, order.$id, { status: nextStatus });
    if (nextStatus === "paid") {
      await notifyPaymentConfirmedOnWhatsApp({
        orderNumber: order.order_number || order.$id,
        customerName: order.customer_name || "Cliente",
        customerWhatsapp: order.customer_whatsapp || "",
        totalCents: order.total_cents || 0,
        method,
      });
    }
  }
  const local = findOrderByNumber(order.$id);
  if (local) saveLocalOrder({ ...local, status: nextStatus, payment: {
    ...local.payment, status: status as PaymentStatus, gatewayPaymentId: paymentId, ...(paidAt ? { paidAt } : {}),
  } });
  if (approved || reversed) {
    // This sync is idempotent and also runs on retried notifications.
    await syncOrderStatusToVoucherUsage(order.order_number, nextStatus);
    await syncOrderStatusToVoucherUsage(order.$id, nextStatus);
  }

  try {
    logEcosystemEvent({
      category: "payments",
      level: approved ? "success" : reversed ? "warn" : "info",
      action: approved ? "Pagamento Aprovado" : reversed ? "Pagamento Estornado" : "Pagamento Sincronizado",
      target: `Pedido #${order.order_number || order.$id}`,
      details: `Mercado Pago (ID ${paymentId}) para o pedido #${order.order_number || order.$id}. Status: ${status}`,
      actor: "Webhook Mercado Pago",
      metadata: {
        paymentId,
        gatewayStatus: payment.status,
        status,
        orderStatus: nextStatus,
        orderNumber: order.order_number,
        totalCents: order.total_cents,
        method,
      },
    });
  } catch {}

  return { orderId: order.$id, status: nextStatus, paymentStatus: status };
}

export async function refreshMercadoPagoOrder(orderId: string, knownPaymentId?: string) {
  if (knownPaymentId && /^\d+$/.test(knownPaymentId)) {
    // Verify ownership before permitting this ID to update any order.
    const payment = await mercadoPagoRequest<MercadoPagoPayment>(`/v1/payments/${knownPaymentId}`);
    if (payment.external_reference === orderId && (!payment.metadata?.order_id || payment.metadata.order_id === orderId)) {
      return reconcileMercadoPagoPayment(knownPaymentId);
    }
    return;
  }
  const result = await mercadoPagoRequest<{ results: MercadoPagoPayment[] }>(
    `/v1/payments/search?external_reference=${encodeURIComponent(orderId)}&sort=date_created&criteria=desc&limit=10`
  );
  const owned = result.results.filter((p) => p.external_reference === orderId && (!p.metadata?.order_id || p.metadata.order_id === orderId));
  const candidate = owned.find((p) => ["approved", "refunded", "charged_back"].includes(p.status)) || owned[0];
  if (candidate) return reconcileMercadoPagoPayment(String(candidate.id));
}
