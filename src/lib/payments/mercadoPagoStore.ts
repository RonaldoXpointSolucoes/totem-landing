import { Query } from "node-appwrite";
import { CustomerInfo, DeliveryAddress, PaymentStatus } from "@/types/order";
import { getOrderWithDetails, getServerDatabases } from "@/lib/appwrite/server";
import { APPWRITE_CONFIG } from "@/lib/appwrite/config";
import { findOrderByNumber, saveLocalOrder } from "@/lib/orders/orderStore";
import { syncOrderStatusToVoucherUsage } from "@/lib/vouchers/voucherStore";
import { logEcosystemEvent } from "@/lib/logging/ecosystemLogger";
import { notifyPaymentConfirmedOnWhatsApp } from "@/lib/notifications/whatsappNotifier";
import { adsLeadsCartsStore } from "@/lib/analytics/adsLeadsCartsStore";
import { calculateSafeCardChargeCents } from "@/modules/pricing/pricingEngine";
import { buildOrderFinancialBreakdown } from "@/modules/catalog/kitDefaults";
import {
  createMercadoPagoPayment,
  mercadoPagoRequest,
  MercadoPagoMerchantOrder,
  MercadoPagoPayment,
  paymentMatchesOrder,
  translateMercadoPagoStatusDetail,
} from "./mercadoPago";

export interface OrderPaymentHistoryEntry {
  at: string;
  action: string;
  gatewayPaymentId?: string;
  gatewayPreferenceId?: string;
  gatewayStatus: string;
  statusDetail: string;
  statusLabel: string;
  statusDescription: string;
  severity: "success" | "info" | "warn" | "error";
  method: string;
  amountCents: number;
  installments?: number;
  cardLastFour?: string;
  paymentMethodId?: string;
  actor: string;
}

export async function updateMercadoPagoPayment(orderId: string, data: Record<string, unknown>) {
  const db = getServerDatabases();
  const payments = await db.listDocuments(APPWRITE_CONFIG.databaseId, APPWRITE_CONFIG.collections.payments, [
    Query.equal("order_id", orderId),
    Query.equal("provider", "mercadopago"),
    Query.orderDesc("$createdAt"),
    Query.limit(1),
  ]);
  if (!payments.documents[0]) throw new Error("Registro de pagamento indisponível.");
  return db.updateDocument(
    APPWRITE_CONFIG.databaseId,
    APPWRITE_CONFIG.collections.payments,
    payments.documents[0].$id,
    data
  );
}

/**
 * Persiste no JSON de metadados do pedido (delivery_address_json) o diagnóstico e histórico
 * de tentativas do Mercado Pago para exibição imediata no Painel Admin e sobrevivência a deploys.
 */
export async function appendOrderPaymentAuditEntry(
  orderDoc: any,
  entry: OrderPaymentHistoryEntry,
  extraMeta?: Record<string, any>
) {
  try {
    let parsed: Record<string, any> = {};
    try {
      parsed = orderDoc.delivery_address_json ? JSON.parse(orderDoc.delivery_address_json) : {};
    } catch {
      parsed = {};
    }

    const prevHistory: OrderPaymentHistoryEntry[] = Array.isArray(parsed.paymentHistory)
      ? parsed.paymentHistory
      : [];

    // Evita duplicar exatamente o mesmo evento consecutivo (idempotência de webhooks repetidos)
    const last = prevHistory[0];
    const isDuplicate =
      last &&
      last.gatewayPaymentId === entry.gatewayPaymentId &&
      last.gatewayStatus === entry.gatewayStatus &&
      last.statusDetail === entry.statusDetail &&
      last.action === entry.action;

    if (isDuplicate && !extraMeta) {
      return;
    }

    const nextHistory = isDuplicate
      ? [entry, ...prevHistory.slice(1)].slice(0, 20)
      : [entry, ...prevHistory].slice(0, 20);

    const updatedJson = JSON.stringify({
      ...parsed,
      ...(extraMeta || {}),
      lastGatewayDiag: entry,
      paymentHistory: nextHistory,
    });

    if (updatedJson.length < 9500) {
      await getServerDatabases().updateDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.collections.orders,
        orderDoc.$id,
        { delivery_address_json: updatedJson }
      );
      orderDoc.delivery_address_json = updatedJson;
    }
  } catch (err) {
    console.warn("Aviso ao salvar histórico de auditoria no pedido:", err);
  }
}

/** Every state change uses the authenticated API response, never a callback body or return URL. */
export async function reconcileMercadoPagoPayment(
  paymentId: string,
  triggerSource = "Webhook Mercado Pago"
) {
  const cleanId = String(paymentId || "").trim();
  if (!/^\d+$/.test(cleanId)) throw new Error("Identificador de pagamento inválido.");

  const payment = await mercadoPagoRequest<MercadoPagoPayment>(`/v1/payments/${cleanId}`);
  const orderRef = payment.external_reference || payment.metadata?.order_id || "";
  if (!orderRef) {
    return { ignored: true, reason: "missing_external_reference" };
  }

  const details = await getOrderWithDetails(orderRef);
  if (!details) {
    return { ignored: true, reason: "order_not_found" };
  }
  if (details.payment?.provider !== "mercadopago") {
    throw new Error("Pedido de pagamento indisponível.");
  }

  const { order, payment: storedPayment } = details;
  const method: "pix" | "credit_card" =
    payment.payment_method_id === "pix"
      ? "pix"
      : payment.payment_type_id === "credit_card" || storedPayment.payment_method === "credit_card"
      ? "credit_card"
      : "pix";

  const hasMerchantOrder = Boolean(payment.order?.id);
  if (
    !paymentMatchesOrder(payment, {
      id: order.$id,
      totalCents: order.total_cents,
      method,
      allowPartial: hasMerchantOrder,
      allowMissingMetadata: true,
    })
  ) {
    logEcosystemEvent({
      category: "payments",
      level: "warn",
      action: "Pagamento Divergente Detectado",
      target: `Pedido #${order.order_number || order.$id}`,
      details: `Pagamento MP #${cleanId} (R$ ${payment.transaction_amount}) divergente do pedido #${order.order_number} (R$ ${(order.total_cents / 100).toFixed(2)}).`,
      actor: triggerSource,
      metadata: {
        paymentId: cleanId,
        orderId: order.$id,
        orderNumber: order.order_number,
        transactionAmount: payment.transaction_amount,
        orderTotalCents: order.total_cents,
        paymentStatus: payment.status,
        statusDetail: payment.status_detail,
      },
    });
    throw new Error("Pagamento incompatível com o pedido.");
  }

  if (
    !hasMerchantOrder &&
    storedPayment.status === "paid" &&
    storedPayment.gateway_payment_id &&
    storedPayment.gateway_payment_id !== cleanId
  ) {
    return { ignored: true, reason: "already_paid" };
  }

  // Se o pedido já possui um NOVO pagamento pendente ativo (ex: Pix regenerado) e chegou um webhook atrasado
  // de expiração ("cancelled") de um pagamento ANTIGO, apenas registramos no histórico sem sobrescrever o novo Pix!
  const isOldAttemptExpiring =
    ["cancelled", "rejected"].includes(payment.status) &&
    storedPayment.gateway_payment_id &&
    storedPayment.gateway_payment_id !== cleanId &&
    storedPayment.status === "pending" &&
    Date.parse(storedPayment.expires_at || "") > Date.now();

  let approved = payment.status === "approved";
  let reversed = ["refunded", "charged_back"].includes(payment.status);
  let hasChargeback = payment.status === "charged_back";
  let partiallyRefunded = approved && (payment.transaction_amount_refunded || 0) > 0;

  if (hasMerchantOrder && payment.status === "approved") {
    if (
      storedPayment.status === "paid" &&
      storedPayment.gateway_order_id &&
      storedPayment.gateway_order_id !== String(payment.order!.id)
    ) {
      return { ignored: true, reason: "already_paid_other_order" };
    }
    const search = await mercadoPagoRequest<{ results: MercadoPagoPayment[]; paging?: { total: number } }>(
      `/v1/payments/search?external_reference=${encodeURIComponent(order.$id)}&sort=date_created&criteria=desc&limit=50`
    );
    const parts = (search.results || []).filter(
      (p) =>
        (p.external_reference === order.$id || p.metadata?.order_id === order.$id) &&
        String(p.order?.id) === String(payment.order!.id)
    );
    if (parts.length > 0) {
      let approvedCents = 0;
      let refundedCents = 0;
      let chargeback = false;
      for (const part of parts) {
        if (!["approved", "refunded", "charged_back"].includes(part.status)) continue;
        const verified =
          String(part.id) === cleanId
            ? payment
            : await mercadoPagoRequest<MercadoPagoPayment>(`/v1/payments/${part.id}`);
        if (
          !paymentMatchesOrder(verified, {
            id: order.$id,
            totalCents: order.total_cents,
            method,
            allowPartial: true,
            allowMissingMetadata: true,
          }) ||
          String(verified.order?.id) !== String(payment.order!.id)
        ) {
          throw new Error("Parcela de pagamento incompatível.");
        }
        if (verified.status === "approved") {
          approvedCents += Math.round(verified.transaction_amount * 100);
        }
        refundedCents += Math.round(
          (verified.transaction_amount_refunded ||
            (verified.status === "refunded" ? verified.transaction_amount : 0)) * 100
        );
        chargeback ||= verified.status === "charged_back";
      }
      approved = approvedCents >= Math.max(1, order.total_cents - 100);
      reversed = chargeback || refundedCents >= Math.max(1, order.total_cents - 100);
      hasChargeback = chargeback;
      partiallyRefunded = refundedCents > 0 && !reversed;
    }
  }

  const status = reversed
    ? hasChargeback
      ? "charged_back"
      : "refunded"
    : partiallyRefunded
    ? "partially_refunded"
    : approved
    ? "paid"
    : payment.status === "rejected"
    ? "failed"
    : payment.status === "cancelled"
    ? "cancelled"
    : "pending";

  const translation = translateMercadoPagoStatusDetail(payment.status, payment.status_detail, method);
  const compositeGatewayStatus = payment.status_detail
    ? `${payment.status}:${payment.status_detail}`.slice(0, 64)
    : payment.status;

  // Older pending/rejected deliveries cannot undo an already approved payment.
  if (
    ["paid", "partially_refunded", "refunded", "charged_back"].includes(storedPayment.status) &&
    !approved &&
    !reversed
  ) {
    return { ignored: true, reason: "final_state_protected" };
  }

  const paidAt = payment.date_approved || storedPayment.paid_at || null;

  if (!isOldAttemptExpiring) {
    await updateMercadoPagoPayment(order.$id, {
      gateway_payment_id: cleanId,
      gateway_status: compositeGatewayStatus,
      status,
      payment_method: method,
      ...(hasMerchantOrder ? { gateway_order_id: String(payment.order!.id) } : {}),
      ...(paidAt ? { paid_at: paidAt } : {}),
    });
  }

  // REGRA DE OURO: Expiração de QR Code Pix ("cancelled:expired") ou recusa de tentativa de cartão ("rejected")
  // NUNCA cancela o pedido inteiro automaticamente! O pedido permanece em "awaiting_payment" para permitir
  // nova tentativa, regeneração de Pix/Link ou troca de método de pagamento.
  const nextStatus = reversed
    ? "cancelled"
    : approved && (order.status === "awaiting_payment" || order.status === "cancelled")
    ? "paid"
    : order.status === "cancelled" && !reversed
    ? "awaiting_payment"
    : order.status;

  const transitionedToPaid = nextStatus !== order.status && nextStatus === "paid";

  if (nextStatus !== order.status) {
    await getServerDatabases().updateDocument(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.collections.orders,
      order.$id,
      { status: nextStatus }
    );
    order.status = nextStatus;
  }

  const auditEntry: OrderPaymentHistoryEntry = {
    at: new Date().toISOString(),
    action: approved
      ? "Pagamento Aprovado"
      : reversed
      ? "Pagamento Estornado"
      : payment.status === "rejected"
      ? "Tentativa de Cartão Recusada"
      : payment.status === "cancelled"
      ? "Cobrança Anterior Expirada"
      : "Status Sincronizado",
    gatewayPaymentId: cleanId,
    gatewayStatus: payment.status,
    statusDetail: payment.status_detail || payment.status,
    statusLabel: translation.label,
    statusDescription: translation.description,
    severity: translation.severity,
    method,
    amountCents: Math.round((payment.transaction_amount || 0) * 100),
    installments: payment.installments || 1,
    cardLastFour: payment.card?.last_four_digits || undefined,
    paymentMethodId: payment.payment_method_id || undefined,
    actor: triggerSource,
  };

  await appendOrderPaymentAuditEntry(order, auditEntry);

  if (transitionedToPaid) {
    adsLeadsCartsStore
      .syncOrderPaymentApproved({
        orderNumber: order.order_number || order.$id,
        customerDocument: order.customer_document,
        customerEmail: order.customer_email,
        customerWhatsapp: order.customer_whatsapp,
        totalCents: order.total_cents || 0,
      })
      .catch(() => {});
    await notifyPaymentConfirmedOnWhatsApp({
      orderId: order.$id,
      orderNumber: order.order_number || order.$id,
      customerName: order.customer_name || "Cliente",
      customerWhatsapp: order.customer_whatsapp || "",
      totalCents: order.total_cents || 0,
      method,
      installments: payment.installments || 1,
    });
  }

  const local = findOrderByNumber(order.$id);
  if (local) {
    saveLocalOrder({
      ...local,
      status: nextStatus,
      payment: {
        ...local.payment,
        status: status as PaymentStatus,
        gatewayPaymentId: cleanId,
        gatewayStatus: compositeGatewayStatus,
        ...(paidAt ? { paidAt } : {}),
      },
    });
  }

  if (approved || reversed) {
    await syncOrderStatusToVoucherUsage(order.order_number, nextStatus);
    await syncOrderStatusToVoucherUsage(order.$id, nextStatus);
  }

  try {
    logEcosystemEvent({
      category: "payments",
      level:
        translation.severity === "error"
          ? "error"
          : translation.severity === "warn"
          ? "warn"
          : approved
          ? "success"
          : "info",
      action: `${auditEntry.action} — ${translation.label}`,
      target: `Pedido #${order.order_number || order.$id}`,
      details: `${translation.description} (MP ID: ${cleanId} • Método: ${method === "credit_card" ? `Cartão ${payment.payment_method_id?.toUpperCase() || ""} ${payment.installments || 1}x` : "Pix"} • Cliente: ${order.customer_name || "Cliente"}).`,
      actor: triggerSource,
      metadata: {
        paymentId: cleanId,
        gatewayStatus: payment.status,
        statusDetail: payment.status_detail || null,
        statusLabel: translation.label,
        status,
        orderStatus: nextStatus,
        orderId: order.$id,
        orderNumber: order.order_number,
        customerName: order.customer_name,
        totalCents: order.total_cents,
        method,
        installments: payment.installments || 1,
        cardLastFour: payment.card?.last_four_digits || null,
      },
    });
  } catch {}

  return {
    orderId: order.$id,
    orderNumber: order.order_number,
    status: nextStatus,
    paymentStatus: status,
    gatewayStatus: compositeGatewayStatus,
    translation,
  };
}

/**
 * Reconcilia uma notificação de merchant_order (enviada pelo Checkout Pro do Mercado Pago).
 */
export async function reconcileMercadoPagoMerchantOrder(
  merchantOrderId: string,
  triggerSource = "Webhook MerchantOrder MP"
) {
  const cleanId = String(merchantOrderId || "").trim();
  if (!/^\d+$/.test(cleanId)) return { ignored: true };

  try {
    const mo = await mercadoPagoRequest<MercadoPagoMerchantOrder>(`/merchant_orders/${cleanId}`);
    const payments = mo.payments || [];
    if (payments.length === 0 && mo.external_reference) {
      return refreshMercadoPagoOrder(mo.external_reference, undefined, triggerSource);
    }
    let lastResult: any = { ignored: true };
    for (const p of payments) {
      if (p.id) {
        lastResult = await reconcileMercadoPagoPayment(String(p.id), triggerSource);
      }
    }
    return lastResult;
  } catch {
    // Caso a policy do token bloqueie GET /merchant_orders, fazemos fallback buscando os pagamentos mais recentes
    const recent = await mercadoPagoRequest<{ results: MercadoPagoPayment[] }>(
      `/v1/payments/search?sort=date_created&criteria=desc&limit=10`
    );
    const matching = (recent.results || []).filter((p) => String(p.order?.id) === cleanId);
    let lastResult: any = { ignored: true };
    for (const p of matching) {
      lastResult = await reconcileMercadoPagoPayment(String(p.id), triggerSource);
    }
    return lastResult;
  }
}

export async function refreshMercadoPagoOrder(
  orderId: string,
  knownPaymentId?: string,
  triggerSource = "Sincronização Ativa MP"
) {
  const result = await mercadoPagoRequest<{ results: MercadoPagoPayment[] }>(
    `/v1/payments/search?external_reference=${encodeURIComponent(orderId)}&sort=date_created&criteria=desc&limit=20`
  );
  const owned = (result.results || []).filter(
    (p) =>
      p.external_reference === orderId ||
      p.metadata?.order_id === orderId
  );

  // Prioriza pagamento aprovado/estornado, depois pendente/em análise, depois recusado, depois cancelado
  const candidate =
    owned.find((p) => ["approved", "refunded", "charged_back"].includes(p.status)) ||
    owned.find((p) => ["in_process", "authorized", "pending"].includes(p.status)) ||
    owned.find((p) => p.status === "rejected") ||
    owned[0];

  if (candidate) {
    const rec = await reconcileMercadoPagoPayment(String(candidate.id), triggerSource);
    return {
      ...rec,
      attemptsCount: owned.length,
      attempts: owned.map((p) => {
        const tr = translateMercadoPagoStatusDetail(p.status, p.status_detail, p.payment_method_id === "pix" ? "pix" : "credit_card");
        return {
          id: String(p.id),
          status: p.status,
          statusDetail: p.status_detail || p.status,
          statusLabel: tr.label,
          statusDescription: tr.description,
          severity: tr.severity,
          amountCents: Math.round((p.transaction_amount || 0) * 100),
          method: p.payment_method_id === "pix" ? "pix" : "credit_card",
          paymentMethodId: p.payment_method_id,
          installments: p.installments || 1,
          cardLastFour: p.card?.last_four_digits || null,
          dateCreated: p.date_created,
          dateApproved: p.date_approved,
        };
      }),
    };
  }

  if (knownPaymentId && /^\d+$/.test(knownPaymentId)) {
    const payment = await mercadoPagoRequest<MercadoPagoPayment>(`/v1/payments/${knownPaymentId}`);
    if (
      payment.external_reference === orderId ||
      payment.metadata?.order_id === orderId
    ) {
      const rec = await reconcileMercadoPagoPayment(knownPaymentId, triggerSource);
      return {
        ...rec,
        attemptsCount: 1,
      };
    }
  }

  // Se não há nenhum pagamento submetido na API do Mercado Pago (ex: cliente foi para o Checkout Pro mas o link expirou antes de submeter o cartão)
  const details = await getOrderWithDetails(orderId);
  if (details?.order && details?.payment) {
    const isExpired = Date.parse(details.payment.expires_at || "") < Date.now();
    const method = details.payment.payment_method === "credit_card" ? "credit_card" : "pix";
    if (isExpired && details.payment.status === "pending") {
      const translation = translateMercadoPagoStatusDetail("cancelled", "expired", method);
      const entry: OrderPaymentHistoryEntry = {
        at: new Date().toISOString(),
        action: method === "credit_card" ? "Link Checkout Pro Expirado s/ Tentativa" : "QR Code Pix Expirado",
        gatewayPreferenceId: details.payment.gateway_preference_id || undefined,
        gatewayPaymentId: details.payment.gateway_payment_id || undefined,
        gatewayStatus: "expired",
        statusDetail: "expired",
        statusLabel: translation.label,
        statusDescription:
          method === "credit_card"
            ? "O cliente foi redirecionado ao Mercado Pago, mas não chegou a submeter o cartão antes do link expirar. Gere um novo link de 72h ou Pix."
            : translation.description,
        severity: "warn",
        method,
        amountCents: details.order.total_cents || 0,
        actor: triggerSource,
      };
      await appendOrderPaymentAuditEntry(details.order, entry);
      await updateMercadoPagoPayment(orderId, {
        gateway_status: "cancelled:expired",
      });
    }
  }

  return {
    orderId,
    attemptsCount: 0,
    attempts: [],
  };
}

/**
 * Regenera um novo QR Code Pix (24h) ou um novo Link de Cartão Checkout Pro (72h)
 * para um pedido existente sem precisar criar outro pedido.
 */
export async function regenerateOrderPayment(params: {
  orderId: string;
  targetMethod?: "pix" | "credit_card";
  actor?: string;
}) {
  const { orderId, targetMethod, actor = "Cliente" } = params;
  const details = await getOrderWithDetails(orderId);
  if (!details || !details.order || !details.payment) {
    throw new Error("Pedido não localizado para regeneração de pagamento.");
  }

  const { order, payment: storedPayment } = details;
  if (order.status === "paid" || storedPayment.status === "paid") {
    throw new Error("Este pedido já consta como pago.");
  }

  let parsedAddress: any = {};
  try {
    parsedAddress = order.delivery_address_json ? JSON.parse(order.delivery_address_json) : {};
  } catch {}

  const method: "pix" | "credit_card" =
    targetMethod ||
    (storedPayment.payment_method === "credit_card" ? "credit_card" : "pix");

  const cleanDoc = String(order.customer_document || "").replace(/\D/g, "");
  const customer: CustomerInfo = {
    name: order.customer_name || "Cliente Totem",
    document: order.customer_document || "",
    email: order.customer_email || "cliente@xpointsolucoes.com.br",
    whatsapp: order.customer_whatsapp || "",
    personType: cleanDoc.length > 11 ? "company" : "individual",
  };

  const deliveryAddress: DeliveryAddress = {
    cep: parsedAddress.cep || "",
    street: parsedAddress.street || "",
    number: parsedAddress.number || "",
    complement: parsedAddress.complement || "",
    neighborhood: parsedAddress.neighborhood || "",
    city: parsedAddress.city || "",
    state: parsedAddress.state || "",
  };

  const additionalCharges: Array<{
    id?: string;
    type?: "addition" | "discount";
    description: string;
    amountCents: number;
    quantity?: number;
  }> = Array.isArray(parsedAddress.additionalCharges) ? parsedAddress.additionalCharges : [];
  const extrasSummary =
    additionalCharges.length > 0
      ? ` (${additionalCharges
          .map((c) => `${c.type === "discount" || c.amountCents < 0 ? "-" : "+"} ${c.description}`)
          .join(", ")})`
      : "";

  let parsedSheets: any[] = [];
  try {
    parsedSheets = order.manufacturing_sheet_json ? JSON.parse(order.manufacturing_sheet_json) : [];
  } catch {}

  const prevMethod =
    storedPayment.payment_method === "credit_card" || parsedAddress.paymentMethod === "credit_card"
      ? "credit_card"
      : "pix";

  const breakdown = buildOrderFinancialBreakdown({
    items: Array.isArray((details as any).items) ? (details as any).items : [],
    sheets: Array.isArray(parsedSheets) ? parsedSheets : [],
    additionalCharges: additionalCharges.map((c, idx) => ({
      id: c.id || `extra_${idx}`,
      type: c.type === "discount" ? "discount" : "addition",
      description: c.description,
      amountCents: c.amountCents,
      quantity: c.quantity || 1,
    })),
    discountCents: Number(order.discount_cents ?? parsedAddress.discountCents) || 0,
    couponCode: order.coupon_code || parsedAddress.couponCode || null,
    shippingCents: Number(order.shipping_cents) || 0,
    shippingName: parsedAddress.shippingMethod?.name || "Frete",
    paymentMethod: method,
  });

  // Determina com segurança o valor base à vista (PIX) do pedido para proteger 100% contra a taxa de 4,98% do MP no cartão
  let basePixTotalCents = Number(parsedAddress.basePixTotalCents) || 0;
  if (basePixTotalCents <= 0) {
    if (prevMethod === "pix") {
      basePixTotalCents = Number(order.total_cents) || breakdown.pixTotalCents;
    } else if (breakdown.pixTotalCents > 0) {
      basePixTotalCents = breakdown.pixTotalCents;
    } else {
      basePixTotalCents = Math.round((Number(order.total_cents) || 0) * 0.95);
    }
  }

  const safeCardTotalCents = calculateSafeCardChargeCents(basePixTotalCents);
  const effectiveAmountCents = method === "credit_card" ? safeCardTotalCents : basePixTotalCents;
  const effectiveSubtotalCents = Math.max(0, effectiveAmountCents - (Number(order.shipping_cents) || 0));

  const attemptKey = `regen-${Date.now()}`;
  const created = await createMercadoPagoPayment({
    orderId: order.$id,
    orderNumber: order.order_number,
    amountCents: effectiveAmountCents,
    customer,
    deliveryAddress,
    method,
    attemptKey,
    customDescription: `Pedido ${order.order_number} - Totem X-Point${extrasSummary}`,
  });

  await updateMercadoPagoPayment(order.$id, {
    payment_method: method,
    status: "pending",
    amount_cents: effectiveAmountCents,
    pix_code: created.pixCode || "",
    expires_at: created.expiresAt,
    gateway_payment_id: created.gatewayPaymentId || "",
    gateway_preference_id: created.gatewayPreferenceId || "",
    checkout_url: created.checkoutUrl || "",
    gateway_status: created.gatewayStatus || "pending",
  });

  const nextOrderStatus = order.status === "cancelled" ? "awaiting_payment" : order.status;
  if (
    order.status === "cancelled" ||
    order.total_cents !== effectiveAmountCents ||
    order.subtotal_cents !== effectiveSubtotalCents
  ) {
    await getServerDatabases().updateDocument(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.collections.orders,
      order.$id,
      {
        status: nextOrderStatus,
        total_cents: effectiveAmountCents,
        subtotal_cents: effectiveSubtotalCents,
      }
    );
    order.status = nextOrderStatus;
    order.total_cents = effectiveAmountCents;
    order.subtotal_cents = effectiveSubtotalCents;
  }

  const netEstimatedCents =
    method === "credit_card"
      ? effectiveAmountCents - Math.round(effectiveAmountCents * 0.0498)
      : effectiveAmountCents;

  const entry: OrderPaymentHistoryEntry = {
    at: new Date().toISOString(),
    action: method === "credit_card" ? "Novo Link de Cartão Gerado (72h • Protegido)" : "Novo QR Code Pix Gerado (24h)",
    gatewayPaymentId: created.gatewayPaymentId,
    gatewayPreferenceId: created.gatewayPreferenceId,
    gatewayStatus: "pending",
    statusDetail: method === "credit_card" ? "waiting_card" : "pending_waiting_transfer",
    statusLabel: method === "credit_card" ? "Aguardando Pagamento no Cartão (72h)" : "Aguardando Pagamento Pix (24h)",
    statusDescription:
      method === "credit_card"
        ? `Novo link Checkout Pro gerado por ${actor} com proteção de taxa MP (Base PIX: R$ ${(basePixTotalCents / 100).toFixed(2)} → Cobrado no Cartão: R$ ${(effectiveAmountCents / 100).toFixed(2)} • Líquido na conta MP: R$ ${(netEstimatedCents / 100).toFixed(2)}).`
        : `Novo QR Code Pix gerado por ${actor} com validade de 24 horas (R$ ${(effectiveAmountCents / 100).toFixed(2)}).`,
    severity: "info",
    method,
    amountCents: effectiveAmountCents,
    actor,
  };

  await appendOrderPaymentAuditEntry(order, entry, {
    paymentMethod: method,
    basePixTotalCents,
    safeCardTotalCents,
  });

  return {
    orderId: order.$id,
    orderNumber: order.order_number,
    status: "awaiting_payment",
    totalCents: effectiveAmountCents,
    basePixTotalCents,
    safeCardTotalCents,
    payment: {
      provider: "mercadopago",
      method,
      status: "pending",
      pixCode: created.pixCode || "",
      qrCodeUrl: created.qrCodeUrl || "",
      checkoutUrl: created.checkoutUrl || "",
      gatewayPaymentId: created.gatewayPaymentId || "",
      gatewayPreferenceId: created.gatewayPreferenceId || "",
      gatewayStatus: created.gatewayStatus || "pending",
      expiresAt: created.expiresAt,
    },
  };
}
