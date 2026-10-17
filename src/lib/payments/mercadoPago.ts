import { createHmac, timingSafeEqual } from "node:crypto";
import { CustomerInfo } from "@/types/order";

export const MAX_CARD_INSTALLMENTS = 10;
const API = "https://api.mercadopago.com";

export function requirePaymentConfiguration() {
  if (!process.env.MERCADOPAGO_ACCESS_TOKEN || !process.env.CHECKOUT_STATUS_SECRET || !process.env.MERCADOPAGO_WEBHOOK_SECRET) {
    throw new Error("Pagamento temporariamente indisponível. Tente novamente em instantes.");
  }
}

export function checkoutStatusToken(orderId: string): string {
  const secret = process.env.CHECKOUT_STATUS_SECRET;
  if (!secret) throw new Error("Configuração de pagamento indisponível.");
  return createHmac("sha256", secret).update(`checkout:${orderId}`).digest("hex");
}

function equalHex(actual: string, expected: string) {
  return /^[a-f0-9]{64}$/i.test(actual) && timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expected, "hex"));
}

export function verifyCheckoutStatusToken(orderId: string, token: string) {
  return equalHex(token, checkoutStatusToken(orderId));
}

export function verifyMercadoPagoSignature(headers: Headers, dataId: string) {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  const requestId = headers.get("x-request-id");
  const signature = headers.get("x-signature") || "";
  const parts = Object.fromEntries(signature.split(",").map((part) => part.trim().split("=")));
  if (!secret || !requestId || !dataId || !/^\d+$/.test(parts.ts || "")) return false;
  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${parts.ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");
  return equalHex(parts.v1 || "", expected);
}

export async function mercadoPagoRequest<T>(path: string, body?: unknown, idempotencyKey?: string): Promise<T> {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) throw new Error("Pagamento temporariamente indisponível.");
  const response = await fetch(`${API}${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(idempotencyKey ? { "X-Idempotency-Key": idempotencyKey } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  const result = await response.json();
  if (!response.ok) {
    // Provider errors may contain personal data; never forward the payload or credentials.
    console.error("Mercado Pago request failed", {
      status: response.status, path: path.split("?")[0], code: result.error,
      reason: String(result.message || "").replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]").replace(/\b\d{8,}\b/g, "[id]").slice(0, 200),
    });
    throw new Error("Não foi possível iniciar ou consultar o pagamento no Mercado Pago. Tente novamente.");
  }
  return result as T;
}

export interface MercadoPagoPayment {
  id: number;
  status: string;
  status_detail?: string;
  transaction_amount: number;
  currency_id: string;
  external_reference: string;
  payment_method_id: string;
  payment_type_id: string;
  installments?: number;
  date_approved?: string;
  date_of_expiration?: string;
  collector_id?: number;
  live_mode?: boolean;
  transaction_amount_refunded?: number;
  metadata?: { order_id?: string };
  order?: { id?: string | number; type?: string };
  point_of_interaction?: { transaction_data?: { qr_code?: string; qr_code_base64?: string } };
}

export function paymentMatchesOrder(payment: MercadoPagoPayment, order: { id: string; totalCents: number; method: "pix" | "credit_card"; allowPartial?: boolean; allowMissingMetadata?: boolean }) {
  const amountCents = Math.round(payment.transaction_amount * 100);
  return payment.external_reference === order.id &&
    (payment.metadata?.order_id === order.id || (order.allowMissingMetadata && !payment.metadata?.order_id)) &&
    payment.currency_id === "BRL" &&
    (order.allowPartial ? amountCents > 0 && amountCents <= order.totalCents : amountCents === order.totalCents) &&
    (order.method === "pix" ? payment.payment_method_id === "pix" :
      // Checkout Pro requires the Mercado Pago balance option to remain available.
      (payment.payment_type_id === "credit_card" && (payment.installments || 1) <= MAX_CARD_INSTALLMENTS) ||
      (payment.payment_type_id === "account_money" && (payment.installments || 1) === 1)) &&
    (!process.env.MERCADOPAGO_COLLECTOR_ID || String(payment.collector_id) === process.env.MERCADOPAGO_COLLECTOR_ID) &&
    (process.env.MERCADOPAGO_MODE !== "production" || payment.live_mode === true);
}

export async function createMercadoPagoPayment(params: {
  orderId: string; orderNumber: string; amountCents: number; customer: CustomerInfo; method: "pix" | "credit_card";
}) {
  const { orderId, orderNumber, amountCents, customer, method } = params;
  const site = (process.env.NEXT_PUBLIC_SITE_URL || "https://totem.xpointsolucoes.com.br").replace(/\/$/, "");
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  const document = (customer.document || "").replace(/\D/g, "");
  const payer = {
    email: customer.email,
    first_name: customer.name.trim().split(/\s+/)[0],
    last_name: customer.name.trim().split(/\s+/).slice(1).join(" ") || customer.name,
    identification: { type: customer.personType === "company" ? "CNPJ" : "CPF", number: document },
  };
  const common = {
    external_reference: orderId,
    metadata: { order_id: orderId, order_number: orderNumber, integration: "totem_xpoint" },
    notification_url: `${site}/api/webhooks/mercadopago`,
    payer,
  };
  if (method === "pix") {
    const payment = await mercadoPagoRequest<MercadoPagoPayment>("/v1/payments", {
      ...common,
      transaction_amount: amountCents / 100,
      description: `Pedido ${orderNumber} - Totem X-Point`,
      payment_method_id: "pix",
      date_of_expiration: expiresAt,
    }, `totem-pix-${orderId}`);
    const data = payment.point_of_interaction?.transaction_data;
    if (!data?.qr_code || !data.qr_code_base64) throw new Error("O Mercado Pago não disponibilizou o QR Code Pix. Tente novamente.");
    return {
      provider: "mercadopago", method, status: "pending" as const,
      gatewayPaymentId: String(payment.id), pixCode: data.qr_code,
      qrCodeUrl: `data:image/png;base64,${data.qr_code_base64}`,
      expiresAt: payment.date_of_expiration || expiresAt,
    };
  }
  const returnUrl = `${site}/checkout/retorno?orderId=${encodeURIComponent(orderId)}&token=${checkoutStatusToken(orderId)}`;
  const preference = await mercadoPagoRequest<{ id: string; init_point: string; sandbox_init_point?: string }>("/checkout/preferences", {
    ...common,
    items: [{ id: orderId, title: `Pedido ${orderNumber} - Totem X-Point`, quantity: 1, currency_id: "BRL", unit_price: amountCents / 100 }],
    payment_methods: {
      installments: MAX_CARD_INSTALLMENTS,
      excluded_payment_types: ["ticket", "bank_transfer", "debit_card", "prepaid_card", "atm", "digital_currency"].map((id) => ({ id })),
      excluded_payment_methods: [{ id: "pix" }],
    },
    back_urls: { success: returnUrl, failure: returnUrl, pending: returnUrl },
    auto_return: "approved",
    statement_descriptor: "XPOINT TOTEM",
    expires: true,
    expiration_date_to: expiresAt,
  }, `totem-card-${orderId}`);
  const checkoutUrl = process.env.MERCADOPAGO_MODE === "test" ? preference.sandbox_init_point : preference.init_point;
  if (!checkoutUrl || !/^https:\/\/(?:www\.)?(?:sandbox\.)?mercadopago\.com(?:\.br)?\//.test(checkoutUrl)) throw new Error("Checkout do Mercado Pago indisponível.");
  return {
    provider: "mercadopago", method, status: "pending" as const,
    gatewayPreferenceId: preference.id, checkoutUrl, pixCode: "", expiresAt,
  };
}
