import { createHmac, timingSafeEqual } from "node:crypto";
import { CustomerInfo, DeliveryAddress } from "@/types/order";
import { logEcosystemEvent } from "@/lib/logging/ecosystemLogger";

export const MAX_CARD_INSTALLMENTS = 10;
export const PIX_EXPIRATION_MS = 24 * 60 * 60 * 1000; // 24 horas
export const CARD_PREFERENCE_EXPIRATION_MS = 72 * 60 * 60 * 1000; // 72 horas
const API = "https://api.mercadopago.com";

export function requirePaymentConfiguration() {
  if (!process.env.MERCADOPAGO_ACCESS_TOKEN || !process.env.CHECKOUT_STATUS_SECRET) {
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

export interface MercadoPagoStatusTranslation {
  code: string;
  label: string;
  description: string;
  customerMessage: string;
  severity: "success" | "info" | "warn" | "error";
  canRetry: boolean;
}

export function translateMercadoPagoStatusDetail(
  status?: string | null,
  statusDetail?: string | null,
  method?: "pix" | "credit_card" | string
): MercadoPagoStatusTranslation {
  const rawStatus = String(status || "").toLowerCase();
  const rawDetail = String(statusDetail || "").toLowerCase();
  const detail = rawDetail.includes(":") ? rawDetail.split(":")[1] : rawDetail;
  const baseStatus = rawStatus.includes(":") ? rawStatus.split(":")[0] : rawStatus;

  if (baseStatus === "approved" || detail === "accredited") {
    return {
      code: detail || "accredited",
      label: "Pagamento Aprovado",
      description: "Valor compensado e confirmado pelo Mercado Pago.",
      customerMessage: "Seu pagamento foi aprovado com sucesso!",
      severity: "success",
      canRetry: false,
    };
  }

  const detailMap: Record<string, Omit<MercadoPagoStatusTranslation, "code">> = {
    pending_waiting_transfer: {
      label: "Aguardando Transferência Pix",
      description: "QR Code Pix gerado e aguardando pagamento no app do banco do cliente.",
      customerMessage: "Escaneie o QR Code ou use o código Pix Copia e Cola no seu banco.",
      severity: "info",
      canRetry: true,
    },
    pending_waiting_payment: {
      label: "Aguardando Pagamento",
      description: "Transação aguardando confirmação de pagamento pelo comprador.",
      customerMessage: "Aguardando conclusão do pagamento.",
      severity: "info",
      canRetry: true,
    },
    pending_contingency: {
      label: "Em Processamento pelo Mercado Pago",
      description: "O pagamento está sendo processado internamente. Confirmação em instantes.",
      customerMessage: "Estamos processando seu pagamento junto ao Mercado Pago. Aguarde alguns instantes.",
      severity: "info",
      canRetry: false,
    },
    pending_review_manual: {
      label: "Em Análise Antifraude (Mercado Pago)",
      description: "O cartão está em revisão de segurança pelo Mercado Pago (até 24h).",
      customerMessage: "Seu pagamento com cartão está em análise de segurança pelo Mercado Pago.",
      severity: "warn",
      canRetry: false,
    },
    cc_rejected_high_risk: {
      label: "Recusado pelo Antifraude (Alto Risco)",
      description: "O antifraude do Mercado Pago recusou a transação preventivamente. Recomendado tentar outro cartão, pagar logado na conta MP ou via Pix.",
      customerMessage: "O sistema de segurança do Mercado Pago não autorizou esta tentativa no cartão. Tente outro cartão ou pague via Pix com aprovação imediata.",
      severity: "error",
      canRetry: true,
    },
    cc_rejected_insufficient_amount: {
      label: "Saldo ou Limite Insuficiente no Cartão",
      description: "O banco emissor informou que o cartão não possui limite disponível para o valor total da compra.",
      customerMessage: "O banco informou limite insuficiente neste cartão. Você pode usar outro cartão, combinar 2 cartões no Mercado Pago ou pagar via Pix.",
      severity: "error",
      canRetry: true,
    },
    cc_rejected_call_for_authorize: {
      label: "Banco Exige Autorização do Titular",
      description: "O banco emissor bloqueou preventivamente pelo valor e exige liberação no app do banco ou telefone.",
      customerMessage: "O seu banco exige que você autorize esta compra no aplicativo do cartão antes de tentar novamente.",
      severity: "error",
      canRetry: true,
    },
    cc_rejected_bad_filled_security_code: {
      label: "Código de Segurança (CVV) Inválido",
      description: "O código CVV de 3 ou 4 dígitos do cartão foi digitado incorretamente.",
      customerMessage: "Código de segurança (CVV) inválido. Verifique os dígitos no verso do cartão e tente novamente.",
      severity: "error",
      canRetry: true,
    },
    cc_rejected_bad_filled_date: {
      label: "Data de Validade Inválida ou Cartão Vencido",
      description: "A data de vencimento do cartão foi informada incorretamente ou está expirada.",
      customerMessage: "Data de validade incorreta. Confira o mês/ano no cartão e tente novamente.",
      severity: "error",
      canRetry: true,
    },
    cc_rejected_bad_filled_card_number: {
      label: "Número do Cartão Inválido",
      description: "O número do cartão digitado contém erro.",
      customerMessage: "Número do cartão inválido. Revise a numeração e tente novamente.",
      severity: "error",
      canRetry: true,
    },
    cc_rejected_bad_filled_other: {
      label: "Dados do Cartão ou Titular Incorretos",
      description: "Algum dado do titular (CPF/CNPJ ou nome) ou do cartão foi rejeitado pelo emissor.",
      customerMessage: "Dados do cartão ou CPF/CNPJ do titular incorretos. Revise e tente novamente.",
      severity: "error",
      canRetry: true,
    },
    cc_rejected_card_disabled: {
      label: "Cartão Desabilitado ou Bloqueado",
      description: "O cartão está bloqueado ou não está ativo para compras online.",
      customerMessage: "Este cartão está desabilitado para compras online. Ative-o no app do seu banco ou use outro cartão.",
      severity: "error",
      canRetry: true,
    },
    cc_rejected_max_attempts: {
      label: "Limite de Tentativas Excedido no Cartão",
      description: "O cliente atingiu o máximo de tentativas seguidas neste mesmo cartão.",
      customerMessage: "Você atingiu o limite de tentativas para este cartão. Utilize outro cartão ou pague via Pix.",
      severity: "error",
      canRetry: true,
    },
    cc_rejected_duplicated_payment: {
      label: "Pagamento Duplicado Detectado",
      description: "Uma cobrança idêntica foi realizada recentemente para este mesmo cartão.",
      customerMessage: "Já identificamos uma tentativa recente de mesmo valor. Verifique se o pagamento já foi processado.",
      severity: "warn",
      canRetry: false,
    },
    expired: {
      label: method === "credit_card" ? "Link de Cartão Expirado" : "QR Code Pix Expirado",
      description: method === "credit_card"
        ? "O prazo de validade da sessão do Mercado Pago venceu sem conclusão. Gere um novo link para o cliente."
        : "O prazo de validade do QR Code Pix venceu sem pagamento. É possível gerar um novo QR Code imediatamente.",
      customerMessage: method === "credit_card"
        ? "Sua sessão de pagamento expirou. Clique abaixo para gerar um novo link de pagamento."
        : "O QR Code Pix anterior expirou. Clique em 'Gerar Novo QR Code Pix' abaixo para pagar agora.",
      severity: "warn",
      canRetry: true,
    },
    by_collector: {
      label: "Cobrança Cancelada",
      description: "Cobrança cancelada ou substituída por uma nova tentativa.",
      customerMessage: "Esta cobrança foi encerrada. Gere um novo link ou QR Code para prosseguir.",
      severity: "warn",
      canRetry: true,
    },
    by_payer: {
      label: "Cancelado pelo Comprador",
      description: "O comprador cancelou a operação na tela do Mercado Pago.",
      customerMessage: "Você cancelou a operação no Mercado Pago. Clique abaixo para tentar novamente.",
      severity: "warn",
      canRetry: true,
    },
  };

  if (detail && detailMap[detail]) {
    return { code: detail, ...detailMap[detail] };
  }

  if (baseStatus === "rejected" || baseStatus === "failed") {
    return {
      code: detail || "cc_rejected_other_reason",
      label: "Pagamento Recusado pelo Emissor",
      description: `O banco emissor ou o Mercado Pago não autorizou a tentativa (${detail || "recusa geral"}).`,
      customerMessage: "O pagamento não foi autorizado pelo banco emissor. Tente outro cartão ou alterne para Pix.",
      severity: "error",
      canRetry: true,
    };
  }

  if (baseStatus === "cancelled") {
    return {
      code: detail || "cancelled",
      label: method === "credit_card" ? "Sessão de Cartão Expirada/Cancelada" : "QR Code Pix Expirado",
      description: "O código ou sessão anterior venceu sem compensação financeira. O pedido continua ativo aguardando pagamento.",
      customerMessage: "O código de pagamento anterior expirou. Gere um novo código ou link abaixo para concluir sua compra.",
      severity: "warn",
      canRetry: true,
    };
  }

  if (baseStatus === "refunded" || baseStatus === "charged_back") {
    return {
      code: detail || baseStatus,
      label: baseStatus === "charged_back" ? "Contestação / Chargeback" : "Pagamento Estornado",
      description: "O valor foi devolvido/estornado ao comprador pelo Mercado Pago.",
      customerMessage: "Este pagamento foi estornado.",
      severity: "warn",
      canRetry: false,
    };
  }

  return {
    code: detail || baseStatus || "pending",
    label: method === "credit_card" ? "Aguardando Pagamento no Cartão" : "Aguardando Pagamento Pix",
    description: method === "credit_card"
      ? "Link de pagamento ativo aguardando conclusão com cartão no Mercado Pago."
      : "QR Code Pix ativo aguardando leitura e confirmação bancária.",
    customerMessage: "Aguardando confirmação do pagamento pelo Mercado Pago.",
    severity: "info",
    canRetry: true,
  };
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
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const safeReason = String((result as any)?.message || (result as any)?.error || "HTTP_ERROR")
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
      .slice(0, 240);
    console.error("Mercado Pago request failed", {
      status: response.status,
      path: path.split("?")[0],
      code: (result as any)?.error || (result as any)?.code,
      reason: safeReason,
      causes: (result as any)?.cause,
    });
    try {
      logEcosystemEvent({
        category: "payments",
        level: "error",
        action: "Erro de Comunicação API Mercado Pago",
        target: path.split("?")[0],
        details: `HTTP ${response.status}: ${safeReason}`,
        actor: "Gateway Mercado Pago",
        metadata: {
          httpStatus: response.status,
          path: path.split("?")[0],
          code: (result as any)?.error || (result as any)?.code,
          causes: (result as any)?.cause,
        },
      });
    } catch {}
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
  date_created?: string;
  date_approved?: string;
  date_last_updated?: string;
  date_of_expiration?: string;
  collector_id?: number;
  live_mode?: boolean;
  transaction_amount_refunded?: number;
  transaction_details?: {
    net_received_amount?: number;
    total_paid_amount?: number;
    installment_amount?: number;
  };
  card?: {
    first_six_digits?: string;
    last_four_digits?: string;
    cardholder?: { name?: string };
  };
  payer?: {
    email?: string;
    first_name?: string;
    last_name?: string;
    identification?: { type?: string; number?: string };
  };
  metadata?: { order_id?: string; order_number?: string };
  order?: { id?: string | number; type?: string };
  point_of_interaction?: { transaction_data?: { qr_code?: string; qr_code_base64?: string; ticket_url?: string } };
}

export interface MercadoPagoMerchantOrder {
  id: number;
  status: string;
  external_reference: string;
  preference_id?: string;
  total_amount: number;
  paid_amount: number;
  payments?: Array<{
    id: number;
    transaction_amount: number;
    total_paid_amount: number;
    status: string;
    status_detail?: string;
    date_approved?: string;
  }>;
}

export function paymentMatchesOrder(
  payment: MercadoPagoPayment,
  order: {
    id: string;
    totalCents: number;
    method: "pix" | "credit_card";
    allowPartial?: boolean;
    allowMissingMetadata?: boolean;
  }
) {
  const amountCents = Math.round((payment.transaction_amount || 0) * 100);
  if (payment.external_reference !== order.id) return false;
  if (payment.metadata?.order_id ? payment.metadata.order_id !== order.id : !order.allowMissingMetadata) {
    return false;
  }
  if (payment.currency_id !== "BRL") return false;
  if ((payment.installments || 1) > MAX_CARD_INSTALLMENTS) return false;
  if (
    process.env.MERCADOPAGO_COLLECTOR_ID &&
    String(payment.collector_id) !== process.env.MERCADOPAGO_COLLECTOR_ID
  ) {
    return false;
  }
  if (process.env.MERCADOPAGO_MODE === "production" && payment.live_mode !== true) {
    return false;
  }

  // Para tentativas pendentes, recusadas ou expiradas, aceitamos para registrar diagnóstico e logs
  if (payment.status !== "approved") {
    return amountCents > 0;
  }

  // Para pagamentos aprovados, garantimos que o valor pago cobre o pedido
  if (order.allowPartial) {
    return amountCents > 0;
  }
  return amountCents >= order.totalCents;
}

/**
 * Sanitiza nome/razão social (especialmente MEI que inicia com CNPJ como "59.942.855 Luis Fernando...")
 * para evitar bloqueio ou score negativo no antifraude do Mercado Pago.
 */
export function buildMercadoPagoPayer(customer: CustomerInfo, deliveryAddress?: DeliveryAddress) {
  const rawName = (customer.name || "Cliente Totem").trim();
  const cleanedName = rawName
    .replace(/^[\d.\-/]+\s*/, "")
    .replace(/\b(?:LTDA|MEI|ME|EIRELI|S\/A|SA)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim() || rawName;

  const parts = cleanedName.split(/\s+/);
  const firstName = (parts[0] || "Cliente").slice(0, 60);
  const lastName = (parts.slice(1).join(" ") || firstName).slice(0, 60);

  const document = (customer.document || "").replace(/\D/g, "");
  const docType = document.length > 11 || customer.personType === "company" ? "CNPJ" : "CPF";

  const cleanPhone = (customer.whatsapp || "").replace(/\D/g, "");
  const phone =
    cleanPhone.length >= 10
      ? {
          area_code: cleanPhone.slice(0, 2),
          number: cleanPhone.slice(2),
        }
      : undefined;

  const cleanCep = (deliveryAddress?.cep || "").replace(/\D/g, "");
  const address =
    cleanCep.length === 8
      ? {
          zip_code: cleanCep,
          street_name: deliveryAddress?.street || "",
          street_number: Number(String(deliveryAddress?.number || "").replace(/\D/g, "")) || 0,
        }
      : undefined;

  return {
    email: (customer.email || "").trim().toLowerCase(),
    first_name: firstName,
    last_name: lastName,
    ...(document ? { identification: { type: docType, number: document } } : {}),
    ...(phone ? { phone } : {}),
    ...(address ? { address } : {}),
  };
}

export async function createMercadoPagoPayment(params: {
  orderId: string;
  orderNumber: string;
  amountCents: number;
  customer: CustomerInfo;
  deliveryAddress?: DeliveryAddress;
  method: "pix" | "credit_card";
  attemptKey?: string;
  customDescription?: string;
}) {
  const { orderId, orderNumber, amountCents, customer, deliveryAddress, method, attemptKey, customDescription } = params;
  const site = (process.env.NEXT_PUBLIC_SITE_URL || "https://totem.xpointsolucoes.com.br").replace(/\/$/, "");
  const payer = buildMercadoPagoPayer(customer, deliveryAddress);
  const idempSuffix = attemptKey ? `-${attemptKey}` : "";
  const effectiveDescription = (customDescription || `Pedido ${orderNumber} - Totem X-Point`).slice(0, 240);

  const common = {
    external_reference: orderId,
    metadata: {
      order_id: orderId,
      order_number: orderNumber,
      integration: "totem_xpoint",
      payment_method: method,
    },
    notification_url: `${site}/api/webhooks/mercadopago`,
    payer,
  };

  if (method === "pix") {
    const expiresAt = new Date(Date.now() + PIX_EXPIRATION_MS).toISOString();
    const payment = await mercadoPagoRequest<MercadoPagoPayment>(
      "/v1/payments",
      {
        ...common,
        transaction_amount: Number((amountCents / 100).toFixed(2)),
        description: effectiveDescription,
        payment_method_id: "pix",
        date_of_expiration: expiresAt,
      },
      `totem-pix-${orderId}${idempSuffix}`
    );

    const data = payment.point_of_interaction?.transaction_data;
    if (!data?.qr_code || !data.qr_code_base64) {
      throw new Error("O Mercado Pago não disponibilizou o QR Code Pix. Tente novamente.");
    }

    try {
      logEcosystemEvent({
        category: "payments",
        level: "info",
        action: attemptKey ? "Novo QR Code Pix Regenerado" : "QR Code Pix Gerado (24h)",
        target: `Pedido #${orderNumber}`,
        details: `Cobrança Pix criada no Mercado Pago (ID ${payment.id}) no valor de R$ ${(amountCents / 100).toFixed(2)} com validade de 24h.`,
        actor: attemptKey ? "Recuperação / Checkout" : "Checkout Cliente",
        metadata: {
          orderId,
          orderNumber,
          gatewayPaymentId: String(payment.id),
          amountCents,
          expiresAt: payment.date_of_expiration || expiresAt,
          customerName: customer.name,
          customerEmail: customer.email,
        },
      });
    } catch {}

    return {
      provider: "mercadopago",
      method,
      status: "pending" as const,
      gatewayPaymentId: String(payment.id),
      gatewayStatus: payment.status_detail ? `${payment.status}:${payment.status_detail}` : payment.status || "pending",
      pixCode: data.qr_code,
      qrCodeUrl: `data:image/png;base64,${data.qr_code_base64}`,
      expiresAt: payment.date_of_expiration || expiresAt,
    };
  }

  const expiresAt = new Date(Date.now() + CARD_PREFERENCE_EXPIRATION_MS).toISOString();
  const returnUrl = `${site}/checkout/retorno?orderId=${encodeURIComponent(orderId)}&token=${checkoutStatusToken(orderId)}`;
  const preference = await mercadoPagoRequest<{ id: string; init_point: string; sandbox_init_point?: string }>(
    "/checkout/preferences",
    {
      ...common,
      items: [
        {
          id: orderId,
          title: `Pedido ${orderNumber} - Gabinete Totem X-Point`,
          description: effectiveDescription,
          category_id: "electronics",
          quantity: 1,
          currency_id: "BRL",
          unit_price: Number((amountCents / 100).toFixed(2)),
        },
      ],
      payment_methods: {
        default_payment_method_id: null,
        installments: MAX_CARD_INSTALLMENTS,
        excluded_payment_types: [{ id: "ticket" }, { id: "bank_transfer" }, { id: "atm" }],
      },
      back_urls: {
        success: `${returnUrl}&mp_status=approved`,
        failure: `${returnUrl}&mp_status=rejected`,
        pending: `${returnUrl}&mp_status=pending`,
      },
      auto_return: "approved",
      binary_mode: false,
      statement_descriptor: "XPOINT TOTEM",
      expires: true,
      expiration_date_from: new Date().toISOString(),
      expiration_date_to: expiresAt,
    },
    `totem-card-${orderId}${idempSuffix}`
  );

  const checkoutUrl = process.env.MERCADOPAGO_MODE === "test" ? preference.sandbox_init_point : preference.init_point;
  if (!checkoutUrl || !/^https:\/\/(?:www\.)?(?:sandbox\.)?mercadopago\.com(?:\.br)?\//.test(checkoutUrl)) {
    throw new Error("Checkout do Mercado Pago indisponível.");
  }

  try {
    logEcosystemEvent({
      category: "payments",
      level: "info",
      action: attemptKey ? "Link de Cartão Regenerado (72h)" : "Checkout Cartão Criado (72h)",
      target: `Pedido #${orderNumber}`,
      details: `Preferência Checkout Pro criada no Mercado Pago (${preference.id}) no valor de R$ ${(amountCents / 100).toFixed(2)} em até ${MAX_CARD_INSTALLMENTS}x (validade 72h).`,
      actor: attemptKey ? "Recuperação / Checkout" : "Checkout Cliente",
      metadata: {
        orderId,
        orderNumber,
        gatewayPreferenceId: preference.id,
        checkoutUrl,
        amountCents,
        expiresAt,
        customerName: customer.name,
        customerEmail: customer.email,
      },
    });
  } catch {}

  return {
    provider: "mercadopago",
    method,
    status: "pending" as const,
    gatewayPreferenceId: preference.id,
    gatewayStatus: "pending:waiting_card",
    checkoutUrl,
    pixCode: "",
    expiresAt,
  };
}
