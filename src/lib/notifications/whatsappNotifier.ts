import { formatBRL } from "@/modules/pricing/pricingEngine";
import { resolveKitEquipmentSummary } from "@/modules/catalog/kitDefaults";
import { OrderDetails } from "@/types/order";
import { logEcosystemEvent } from "@/lib/logging/ecosystemLogger";
import { getOrderWithDetails, getServerDatabases } from "@/lib/appwrite/server";
import { APPWRITE_CONFIG } from "@/lib/appwrite/config";
import { findOrderByNumber } from "@/lib/orders/orderStore";

const DEFAULT_WHATSAPP_API_URL = "https://wh1ss8sy848ufj6zh8t492y7.69.62.92.212.sslip.io";
// Instância Interna de Alertas Administrativos (FoodNext -> node alpha-worker / ALFA-A)
const DEFAULT_WHATSAPP_INSTANCE = "cc4efe36-f391-4b3d-a24c-ddcd8a293cf6";
const DEFAULT_WHATSAPP_API_KEY = "sk_inst_c79464fa9eea45b0860033430a3cf30d";

// Instância Oficial Exclusiva para Comunicação com Clientes e Remarketing ("Comercial X-Point" -> node production-worker / PROD-C)
const DEFAULT_COMMERCIAL_WHATSAPP_API_URL = "https://owckk0k8w8soo40w40owc4ss.69.62.92.212.sslip.io";
export const COMMERCIAL_WHATSAPP_INSTANCE_NAME = "Comercial X-Point";
export const COMMERCIAL_WHATSAPP_INSTANCE_ID = "f695a096-cb11-48aa-b603-27f0d41ae97d";
export const COMMERCIAL_WHATSAPP_PHONE = "5511991649959";
export const COMMERCIAL_WHATSAPP_NUMBER = "5511991649959";
export const COMMERCIAL_WHATSAPP_API_KEY = "sk_f069b525379f002b983225c0f4e0cdac";

// Trava anti-duplicidade em memória para envios a clientes (evita duplo clique ou loop acidental)
const recentCustomerDispatchCache = new Map<string, number>();
const CUSTOMER_MIN_REPEAT_INTERVAL_MS = 60 * 1000; // 60 segundos entre disparos idênticos para o mesmo número

// Controle de idempotência para mensagem de confirmação de pagamento ao cliente (evita envio duplicado por múltiplos webhooks)
const inFlightOrderConfirmationSet = new Set<string>();
const sentOrderConfirmationSet = new Set<string>();

function extractCustomerFirstName(rawName: string): string {
  const cleaned = String(rawName || "")
    .replace(/[0-9./-]+/g, " ")
    .replace(/\b(LTDA|ME|MEI|EIRELI|S\/A|SA|EPP|COMERCIO|SERVICOS|SOLUCOES)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return "Cliente";
  const words = cleaned.split(" ").filter((w) => w.length >= 2);
  const first = words[0] || "Cliente";
  if (first.toLowerCase() === "cliente" || first.toLowerCase() === "consumidor") {
    return "Cliente";
  }
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

export interface NotificationRecipient {
  name: string;
  number: string;
}

export const DEFAULT_ORDER_NOTIFICATION_RECIPIENTS: NotificationRecipient[] = [
  { name: "Ronaldo", number: "5511975960999" },
  { name: "Daniela", number: "5511947020103" },
];

export function sanitizePhoneNumber(raw: string): string {
  return String(raw || "").replace(/\D/g, "");
}

function getWhatsAppConfig() {
  const baseUrl = (process.env.WHATSAPP_API_URL || DEFAULT_WHATSAPP_API_URL).replace(/\/+$/, "");
  const instance = (process.env.WHATSAPP_INSTANCE_ID || DEFAULT_WHATSAPP_INSTANCE).trim();
  const apiKey = (process.env.WHATSAPP_API_KEY || DEFAULT_WHATSAPP_API_KEY).trim();

  const commercialBaseUrl = (
    process.env.WHATSAPP_COMMERCIAL_API_URL || DEFAULT_COMMERCIAL_WHATSAPP_API_URL
  ).replace(/\/+$/, "");
  const commercialInstance = (
    process.env.WHATSAPP_COMMERCIAL_INSTANCE || COMMERCIAL_WHATSAPP_INSTANCE_NAME
  ).trim();
  const commercialApiKey = (
    process.env.WHATSAPP_COMMERCIAL_API_KEY || COMMERCIAL_WHATSAPP_API_KEY
  ).trim();

  const envRecipientsRaw = process.env.WHATSAPP_NOTIFY_NUMBERS;
  let recipients: NotificationRecipient[] = DEFAULT_ORDER_NOTIFICATION_RECIPIENTS;

  if (envRecipientsRaw && envRecipientsRaw.trim().length > 0) {
    const parsed = envRecipientsRaw
      .split(",")
      .map((entry, idx) => {
        const parts = entry.split(":");
        if (parts.length === 2) {
          return { name: parts[0].trim(), number: sanitizePhoneNumber(parts[1]) };
        }
        return { name: `Contato ${idx + 1}`, number: sanitizePhoneNumber(entry) };
      })
      .filter((r) => r.number.length >= 10);

    if (parsed.length > 0) {
      recipients = parsed;
    }
  }

  return { baseUrl, instance, apiKey, commercialBaseUrl, commercialInstance, commercialApiKey, recipients };
}

/**
 * Consulta o status ao vivo da instância "Comercial X-Point" no servidor WhatsApp de Produção (PROD-C).
 */
export async function checkCommercialWhatsAppStatus(): Promise<{
  ok: boolean;
  instanceName: string;
  instanceId: string;
  phone: string;
  state: string;
  error?: string;
}> {
  const { commercialBaseUrl, commercialInstance, commercialApiKey } = getWhatsAppConfig();
  try {
    const res = await fetch(
      `${commercialBaseUrl}/instance/${encodeURIComponent(commercialInstance)}/status`,
      {
        method: "GET",
        headers: { apikey: commercialApiKey },
        signal: AbortSignal.timeout(6000),
      }
    );
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      const state = data?.state || data?.instance?.status || data?.instance?.state || "connected";
      return {
        ok: state === "connected" || state === "open",
        instanceName: COMMERCIAL_WHATSAPP_INSTANCE_NAME,
        instanceId: COMMERCIAL_WHATSAPP_INSTANCE_ID,
        phone: COMMERCIAL_WHATSAPP_PHONE,
        state,
      };
    }
    return {
      ok: false,
      instanceName: COMMERCIAL_WHATSAPP_INSTANCE_NAME,
      instanceId: COMMERCIAL_WHATSAPP_INSTANCE_ID,
      phone: COMMERCIAL_WHATSAPP_PHONE,
      state: `http_${res.status}`,
      error: `HTTP ${res.status}`,
    };
  } catch (err: any) {
    return {
      ok: false,
      instanceName: COMMERCIAL_WHATSAPP_INSTANCE_NAME,
      instanceId: COMMERCIAL_WHATSAPP_INSTANCE_ID,
      phone: COMMERCIAL_WHATSAPP_PHONE,
      state: "unreachable",
      error: err?.message || "Erro ao consultar status da instância Comercial X-Point",
    };
  }
}

/**
 * Envia uma mensagem de texto via API WhatsApp com até 3 tentativas automáticas.
 * Permite especificar instância customizada (ex: "Comercial X-Point" para clientes).
 */
export async function sendWhatsAppTextMessage(
  number: string,
  text: string,
  maxAttempts = 3,
  customInstanceConfig?: { instance: string; apiKey: string; baseUrl?: string }
): Promise<{ ok: boolean; status?: number; error?: string; instanceUsed?: string }> {
  const cfg = getWhatsAppConfig();
  const instance = customInstanceConfig?.instance || cfg.instance;
  const apiKey = customInstanceConfig?.apiKey || cfg.apiKey;
  const isCommercialTarget =
    instance === cfg.commercialInstance ||
    instance === COMMERCIAL_WHATSAPP_INSTANCE_ID ||
    apiKey === cfg.commercialApiKey ||
    apiKey === COMMERCIAL_WHATSAPP_API_KEY;
  const baseUrl = (
    customInstanceConfig?.baseUrl || (isCommercialTarget ? cfg.commercialBaseUrl : cfg.baseUrl)
  ).replace(/\/+$/, "");
  const cleanNumber = sanitizePhoneNumber(number);

  if (!cleanNumber || cleanNumber.length < 10) {
    return { ok: false, error: "Número de destinatário inválido." };
  }

  const endpoint = `${baseUrl}/message/sendText`;
  let lastError = "Falha desconhecida";

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          apikey: apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          number: cleanNumber,
          text,
          instance,
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (response.ok) {
        return { ok: true, status: response.status, instanceUsed: instance };
      }

      const errBody = await response.text().catch(() => "");
      lastError = `HTTP ${response.status}: ${errBody.slice(0, 200)}`;
    } catch (err: any) {
      lastError = err?.message || "Erro de rede ao conectar na API de WhatsApp";
    }

    if (attempt < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
    }
  }

  return { ok: false, error: lastError, instanceUsed: instance };
}

/**
 * Dispara o texto para todos os contatos administrativos configurados (Ronaldo e Daniela).
 */
export async function broadcastAdminWhatsAppNotification(
  text: string,
  contextLabel: string
): Promise<{ sentCount: number; results: { recipient: string; number: string; ok: boolean; error?: string }[] }> {
  const { recipients } = getWhatsAppConfig();

  const settled = await Promise.allSettled(
    recipients.map(async (recipient) => {
      const res = await sendWhatsAppTextMessage(recipient.number, text);
      return {
        recipient: recipient.name,
        number: recipient.number,
        ok: res.ok,
        error: res.error,
      };
    })
  );

  const results = settled.map((item, idx) =>
    item.status === "fulfilled"
      ? item.value
      : {
          recipient: recipients[idx]?.name || "Admin",
          number: recipients[idx]?.number || "",
          ok: false,
          error: String(item.reason),
        }
  );

  const sentCount = results.filter((r) => r.ok).length;

  try {
    logEcosystemEvent({
      category: "orders",
      level: sentCount > 0 ? "info" : "warn",
      action: sentCount > 0 ? "Notificação WhatsApp Enviada" : "Falha na Notificação WhatsApp",
      target: contextLabel,
      details: `Enviado para ${sentCount}/${results.length} contatos (${results
        .map((r) => `${r.recipient}: ${r.ok ? "OK" : r.error}`)
        .join(" | ")})`,
      actor: "FooodNext WhatsApp Notifier",
      metadata: { results },
    });
  } catch {
    // Ignora falha de log
  }

  return { sentCount, results };
}

/**
 * Formata e envia a notificação completa de Novo Pedido no Checkout para Ronaldo e Daniela.
 */
export async function notifyNewOrderOnWhatsApp(
  order: OrderDetails,
  extra?: { couponCode?: string; discountCents?: number }
) {
  try {
    const paymentMethodLabel =
      order.payment?.method === "credit_card" ? "💳 Cartão de Crédito (Mercado Pago)" : "💠 PIX à Vista (Mercado Pago)";

    const itemsLines = order.items
      .map((item, idx) => {
        const cfg = item.configuration;
        const kitEq = resolveKitEquipmentSummary({
          monitor: cfg.monitor,
          printerName: cfg.printer?.displayName,
          readerName: cfg.barcodeReader?.displayName,
        });
        const monitorLabel = kitEq.isKit ? kitEq.monitorDisplay : cfg.monitor?.displayName || "Sem monitor";
        const printerLabel = kitEq.isKit ? kitEq.printerDisplay : cfg.printer?.displayName || "Sem impressora";
        const readerLine = kitEq.hasReader ? `\n   • Leitor: ${kitEq.readerDisplay}` : "";
        const assemblyLabel = cfg.includeAssemblyService ? "\n   🔧 *Montagem de Fábrica:* Sim (+ R$ 999,00)" : "";

        const customDims = cfg.monitor?.customDimensions;
        const customDimsLabel = customDims
          ? `\n   📐 *Medidas Monitor Sob Medida:* Inteiro ${customDims.outerWidthCm}x${customDims.outerHeightCm}cm | Tela ${customDims.screenWidthCm}x${customDims.screenHeightCm}cm`
          : "";

        const notesLabel =
          cfg.customizationNotes && cfg.customizationNotes.trim().length > 0
            ? `\n   ⚠️ *Obs. do Item:* ${cfg.customizationNotes.trim()}`
            : "";

        const checklistToDeliver = [
          `✅ ${item.quantity}x ${cfg.model.name} (${cfg.color.name})`,
          ...(kitEq.isKit
            ? kitEq.includedSubItems.map(
                (sub) => `✅ ${item.quantity}x ${sub.name}${sub.priceCents > 0 ? ` (+${formatBRL(sub.priceCents)})` : ""}`
              )
            : []),
        ].join("\n   ");

        const checklistRemoved =
          kitEq.isKit && kitEq.removedSubItems.length > 0
            ? `\n   🚨 *NÃO ENVIAR (Removido pelo Cliente):*\n   ` +
              kitEq.removedSubItems.map((rem) => `❌ ${rem.name} (Não cobrado)`).join("\n   ")
            : !kitEq.isKit
            ? `\n   ℹ️ *Apenas Gabinete Físico:* Não enviar equipamentos eletrônicos (somente furação CNC)`
            : "";

        return (
          `*${idx + 1}. ${item.quantity}x ${cfg.model.name}*\n` +
          `   • Cor: ${cfg.color.name}\n` +
          `   • Monitor: ${monitorLabel}\n` +
          `   • Impressora: ${printerLabel}` +
          readerLine +
          assemblyLabel +
          customDimsLabel +
          notesLabel +
          `\n   📋 *Checklist — O que entregar junto c/ Gabinete:*\n   ${checklistToDeliver}` +
          checklistRemoved +
          `\n   • Subtotal Item: *${formatBRL(item.subtotalCents)}*`
        );
      })
      .join("\n\n");

    const addr = order.deliveryAddress;
    const addressBlock = addr
      ? `${addr.street}, nº ${addr.number}${addr.complement ? ` (${addr.complement})` : ""}\n` +
        `Bairro: ${addr.neighborhood || "—"} — ${addr.city}/${addr.state || "SP"}\n` +
        `CEP: ${addr.cep}`
      : "Endereço não informado";

    const customerNotesBlock =
      addr?.customerNotes && addr.customerNotes.trim().length > 0
        ? `\n\n⚠️ *OBSERVAÇÃO DO CLIENTE:*\n"${addr.customerNotes.trim()}"`
        : "";

    const shippingName = order.shippingMethod?.name || "Frete Padrão";
    const shippingDelivery =
      order.shippingMethod?.deliveryDaysMin && order.shippingMethod?.deliveryDaysMax
        ? ` (${order.shippingMethod.deliveryDaysMin} a ${order.shippingMethod.deliveryDaysMax} dias úteis)`
        : "";

    const discountLine =
      extra?.discountCents && extra.discountCents > 0
        ? `\n🏷️ *Cupom (${extra.couponCode || "Desconto"}):* -${formatBRL(extra.discountCents)}`
        : "";

    const message =
      `🚨 *NOVO PEDIDO NO SITE — TOTEM PRO* 🚨\n\n` +
      `📦 *Pedido:* #${order.orderNumber}\n` +
      `🕒 *Data:* ${new Date(order.createdAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}\n\n` +
      `👤 *DADOS DO CLIENTE*\n` +
      `• Nome: *${order.customer.name}*\n` +
      `• CPF/CNPJ: ${order.customer.document || "—"}\n` +
      `• WhatsApp: ${order.customer.whatsapp}\n` +
      `• E-mail: ${order.customer.email}\n\n` +
      `🛒 *ITENS ESCOLHIDOS (${order.items.length})*\n` +
      `${itemsLines}\n\n` +
      `🚚 *ENTREGA & ENDEREÇO*\n` +
      `• Modalidade: *${shippingName}*${shippingDelivery}\n` +
      `• Valor do Frete: *${order.shippingCents > 0 ? formatBRL(order.shippingCents) : "Grátis"}*\n` +
      `• Endereço:\n${addressBlock}` +
      `${customerNotesBlock}\n\n` +
      `💰 *RESUMO FINANCEIRO*\n` +
      `• Método: ${paymentMethodLabel}` +
      `${discountLine}\n` +
      `• Subtotal Produtos: ${formatBRL(order.subtotalCents)}\n` +
      `• Frete: ${formatBRL(order.shippingCents)}\n` +
      `• *VALOR TOTAL: ${formatBRL(order.totalCents)}*\n\n` +
      `🔗 *Gerenciar no Painel Admin:*\nhttps://totem.xpointsolucoes.com.br/admin`;

    return await broadcastAdminWhatsAppNotification(message, `Novo Pedido #${order.orderNumber}`);
  } catch (err) {
    console.warn("Aviso ao enviar notificação de novo pedido via WhatsApp:", err);
    return { sentCount: 0, results: [] };
  }
}

/**
 * Envia notificação quando uma Solicitação de Customização Especial (CUST-) é aberta no site.
 */
export async function notifyCustomRequestOnWhatsApp(params: {
  orderNumber: string;
  customerName: string;
  customerWhatsapp: string;
  customerEmail: string;
  cabinetName: string;
  colorName: string;
  equipmentType: string;
  equipmentBrand: string;
  equipmentModel: string;
  notes?: string;
  basePriceCents: number;
}) {
  try {
    const message =
      `🛠️ *NOVA SOLICITAÇÃO SOB MEDIDA — TOTEM PRO* 🛠️\n\n` +
      `📋 *Protocolo:* #${params.orderNumber}\n` +
      `👤 *Cliente:* ${params.customerName}\n` +
      `📱 *WhatsApp:* ${params.customerWhatsapp}\n` +
      `✉️ *E-mail:* ${params.customerEmail}\n\n` +
      `🗄️ *Gabinete Base:* ${params.cabinetName} (${params.colorName})\n` +
      `🔌 *Equipamento Especial (${params.equipmentType}):* ${params.equipmentBrand} ${params.equipmentModel}\n` +
      (params.notes ? `📝 *Observações:* ${params.notes}\n` : "") +
      `💵 *Valor Base Inicial:* ${formatBRL(params.basePriceCents)}\n\n` +
      `🔗 *Avaliar no Painel Admin:*\nhttps://totem.xpointsolucoes.com.br/admin`;

    return await broadcastAdminWhatsAppNotification(message, `Customização #${params.orderNumber}`);
  } catch (err) {
    console.warn("Aviso ao enviar notificação de customização via WhatsApp:", err);
    return { sentCount: 0, results: [] };
  }
}

/**
 * Constrói a mensagem completa, organizada, intuitiva e comercial de confirmação de pedido pago
 * para envio ao WhatsApp do cliente via instância "Comercial X-Point".
 */
export function buildCustomerOrderConfirmedWhatsAppMessage(params: {
  orderNumber: string;
  customerName: string;
  customerDocument?: string;
  customerEmail?: string;
  method: string;
  installments?: number;
  subtotalCents?: number;
  shippingCents?: number;
  discountCents?: number;
  couponCode?: string | null;
  totalCents: number;
  deliveryAddress?: {
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    cep?: string;
    customerNotes?: string;
    shippingMethod?: {
      name?: string;
      carrier?: string;
      deliveryDaysMin?: number;
      deliveryDaysMax?: number;
    } | null;
    additionalCharges?: Array<{
      description?: string;
      amountCents?: number;
      quantity?: number;
      type?: string;
    }>;
  };
  items: Array<{
    cabinetName: string;
    colorName: string;
    monitorName?: string;
    printerName?: string;
    readerName?: string;
    quantity: number;
    subtotalCents?: number;
    kitItemsSnapshot?: any[] | null;
    includeAssemblyService?: boolean;
    customizationNotes?: string;
    customDimensions?: {
      outerWidthCm?: number;
      outerHeightCm?: number;
      screenWidthCm?: number;
      screenHeightCm?: number;
    } | null;
  }>;
}): string {
  const firstName = extractCustomerFirstName(params.customerName);
  const greeting =
    firstName && firstName !== "Cliente"
      ? `Olá, *${firstName}*! Tudo bem?`
      : `Olá! Tudo bem?`;

  const isCard = params.method === "credit_card";
  const installmentsLabel =
    isCard && params.installments && params.installments > 1
      ? ` (${params.installments}x)`
      : "";
  const paymentMethodLabel = isCard
    ? `Cartão de Crédito${installmentsLabel}`
    : "PIX à Vista";

  // 1. Formatação organizada dos itens do pedido
  const itemsBlocks =
    params.items && params.items.length > 0
      ? params.items
          .map((item, idx) => {
            const kitEq = resolveKitEquipmentSummary({
              kitItemsSnapshot: item.kitItemsSnapshot || null,
              monitorName: item.monitorName,
              printerName: item.printerName,
              readerName: item.readerName,
            });

            const itemTitle =
              params.items.length > 1
                ? `*Item ${idx + 1}: ${item.quantity || 1}x ${item.cabinetName || "Gabinete Totem Pro"}*`
                : `*${item.quantity || 1}x ${item.cabinetName || "Gabinete Totem Pro"}*`;

            const lines: string[] = [
              `🔹 ${itemTitle}`,
              `   • *Modelo do Gabinete:* ${item.cabinetName || "Gabinete Totem Pro"}`,
              `   • *Cor / Acabamento:* ${item.colorName || "Padrão"}`,
            ];

            if (kitEq.isKit) {
              lines.push(
                `   • *Modalidade:* ${
                  kitEq.removedSubItems.length > 0
                    ? "Kit Parcial de Autoatendimento (Personalizado)"
                    : "Kit Completo de Autoatendimento"
                }`
              );
              if (kitEq.includedSubItems.length > 0) {
                lines.push(
                  `   • *Itens Inclusos no Kit:*\n` +
                    kitEq.includedSubItems
                      .map((sub) => `      ✅ ${item.quantity || 1}x ${sub.name}`)
                      .join("\n")
                );
              }
              if (kitEq.removedSubItems.length > 0) {
                lines.push(
                  `   • *Observação de Configuração:* Sem ${kitEq.removedSubItems
                    .map((r) => r.name)
                    .join(" / ")} (removido na montagem do pedido)`
                );
              }
            } else {
              lines.push(`   • *Modalidade:* Apenas Gabinete Físico (Furação CNC sob medida)`);
              lines.push(`   • *Padrão de Monitor:* ${kitEq.monitorDisplay || item.monitorName || "Sem monitor"}`);
              lines.push(`   • *Padrão de Impressora:* ${kitEq.printerDisplay || item.printerName || "Sem impressora"}`);
              if (kitEq.hasReader) {
                lines.push(`   • *Leitor de Código:* ${kitEq.readerDisplay}`);
              }
            }

            if (item.customDimensions && item.customDimensions.outerWidthCm) {
              lines.push(
                `   • *Medidas Informadas do Monitor:* Externo ${item.customDimensions.outerWidthCm}x${item.customDimensions.outerHeightCm}cm | Tela Ativa ${item.customDimensions.screenWidthCm}x${item.customDimensions.screenHeightCm}cm`
              );
            }

            if (item.includeAssemblyService) {
              lines.push(`   • *Montagem de Fábrica:* Inclusa`);
            }

            if (item.customizationNotes && item.customizationNotes.trim().length > 0) {
              lines.push(`   • *Detalhes / Obs. Técnica:* "${item.customizationNotes.trim()}"`);
            }

            return lines.join("\n");
          })
          .join("\n\n")
      : `🔹 *1x Gabinete de Autoatendimento Totem Pro*`;

  // 2. Endereço e modalidade de entrega
  const addr = params.deliveryAddress || {};
  const shippingName =
    addr.shippingMethod?.name ||
    (params.shippingCents && params.shippingCents > 0 ? "Transportadora / Correios" : "Retirada / Frete Combinado");
  const deliveryEstimate =
    addr.shippingMethod?.deliveryDaysMin && addr.shippingMethod?.deliveryDaysMax
      ? ` (${addr.shippingMethod.deliveryDaysMin} a ${addr.shippingMethod.deliveryDaysMax} dias úteis após fabricação)`
      : "";

  const streetLine = addr.street
    ? `${addr.street}, nº ${addr.number || "S/N"}${addr.complement ? ` — ${addr.complement}` : ""}`
    : "Endereço conforme cadastro";
  const cityLine = addr.city
    ? `${addr.neighborhood ? `${addr.neighborhood} — ` : ""}${addr.city}/${addr.state || "SP"}`
    : "";
  const rawCepDigits = String(addr.cep || "").replace(/\D/g, "");
  const formattedCep =
    rawCepDigits.length === 8
      ? `${rawCepDigits.slice(0, 5)}-${rawCepDigits.slice(5)}`
      : addr.cep || "";
  const cepLine = formattedCep ? `CEP: ${formattedCep}` : "";

  // 3. Adicionais ou descontos
  const extrasLines =
    Array.isArray(addr.additionalCharges) && addr.additionalCharges.length > 0
      ? addr.additionalCharges
          .map(
            (c) =>
              `• *${c.description || "Adicional"}:* ${formatBRL(
                (Number(c.amountCents) || 0) * Math.max(1, Number(c.quantity) || 1)
              )}`
          )
          .join("\n") + "\n"
      : "";

  const discountLine =
    params.discountCents && params.discountCents > 0
      ? `• *Desconto Aplicado${params.couponCode ? ` (${params.couponCode})` : ""}:* -${formatBRL(params.discountCents)}\n`
      : "";

  const customerNotesBlock =
    addr.customerNotes && addr.customerNotes.trim().length > 0
      ? `\n📝 *Observação Registrada no Pedido:*\n"${addr.customerNotes.trim()}"\n`
      : "";

  return (
    `🎉 *PEDIDO CONFIRMADO COM SUCESSO — TOTEM PRO* ✅\n\n` +
    `${greeting}\n\n` +
    `Confirmamos o recebimento do pagamento do seu pedido *#${params.orderNumber}*! Muito obrigado pela sua compra e pela confiança na *X-Point Soluções Tecnológicas*. 🤝\n\n` +
    `⏱️ *Prazo de Produção e Envio:* Informamos que o prazo para fabricação sob medida na CNC, inspeção de qualidade e envio do seu pedido é de *até 5 dias*.\n\n` +
    `👨‍💼 *Próximo Passo:* Seu pedido já deu entrada em nossa programação e, *em seguida, um dos nossos atendentes retornará por aqui com todos os detalhes do envio e acompanhamento da sua entrega*.\n\n` +
    `Enquanto iniciamos a preparação técnica, pedimos que *confira atentamente o resumo completo abaixo* para confirmar que todas as informações e especificações do que você precisa estão corretas:\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `📦 *1. ITENS E ESPECIFICAÇÕES DO PEDIDO*\n` +
    `${itemsBlocks}\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `💳 *2. RESUMO DO PAGAMENTO*\n` +
    `• *Forma de Pagamento:* ${paymentMethodLabel}\n` +
    extrasLines +
    discountLine +
    `• *Frete (${shippingName}):* ${
      params.shippingCents && params.shippingCents > 0 ? formatBRL(params.shippingCents) : "Isento / Incluso"
    }\n` +
    `• *Valor Total Confirmado:* *${formatBRL(params.totalCents)}*\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `🚚 *3. DADOS E ENDEREÇO DE ENTREGA*\n` +
    `• *Modalidade:* ${shippingName}${deliveryEstimate}\n` +
    `• *Destinatário:* ${params.customerName}\n` +
    (params.customerDocument ? `• *CPF/CNPJ:* ${params.customerDocument}\n` : "") +
    `• *Endereço:* ${streetLine}\n` +
    (cityLine ? `• *Bairro / Cidade:* ${cityLine}\n` : "") +
    (cepLine ? `• *${cepLine}*\n` : "") +
    customerNotesBlock +
    `\n━━━━━━━━━━━━━━━━━━━━\n` +
    `✅ *CONFIRMAÇÃO DE SEGURANÇA*\n` +
    `Por gentileza, verifique se o *modelo do gabinete, a cor, os detalhes dos seus equipamentos e o endereço completo de entrega* estão 100% corretos.\n\n` +
    `👉 Responda esta mensagem com *CONFIRMO* se estiver tudo certinho, ou nos avise por aqui caso precise ajustar qualquer informação antes da expedição!`
  );
}

/**
 * Dispara a mensagem completa de confirmação de pedido pago para o WhatsApp do cliente
 * utilizando OBRIGATORIAMENTE a instância "Comercial X-Point", com garantia de idempotência
 * para evitar envios duplicados em múltiplos webhooks.
 */
export async function sendCustomerOrderConfirmedWhatsApp(params: {
  orderIdOrNumber: string;
  method?: string;
  installments?: number;
  forceResend?: boolean;
  actor?: string;
}): Promise<{
  ok: boolean;
  skippedDuplicate?: boolean;
  error?: string;
  instanceUsed?: string;
  phoneE164?: string;
  orderNumber?: string;
}> {
  const rawKey = String(params.orderIdOrNumber || "").trim();
  if (!rawKey) {
    return { ok: false, error: "Identificador do pedido ausente." };
  }

  if (!params.forceResend && (inFlightOrderConfirmationSet.has(rawKey) || sentOrderConfirmationSet.has(rawKey))) {
    return {
      ok: true,
      skippedDuplicate: true,
      instanceUsed: COMMERCIAL_WHATSAPP_INSTANCE_NAME,
    };
  }

  inFlightOrderConfirmationSet.add(rawKey);
  let lockedOrderNumber: string | null = null;

  try {
    const details = await getOrderWithDetails(rawKey);
    let orderNumber = rawKey;
    let appwriteOrderDoc: any = details?.order || null;
    let customerName = "Cliente";
    let customerDocument = "";
    let customerEmail = "";
    let customerWhatsapp = "";
    let method = params.method || "pix";
    let installments = params.installments || 1;
    let subtotalCents = 0;
    let shippingCents = 0;
    let discountCents = 0;
    let couponCode: string | null = null;
    let totalCents = 0;
    let parsedAddress: any = {};
    let formattedItems: Array<any> = [];

    if (details?.order) {
      const ord = details.order;
      orderNumber = ord.order_number || ord.$id;

      if (
        !params.forceResend &&
        (inFlightOrderConfirmationSet.has(orderNumber) || sentOrderConfirmationSet.has(orderNumber)) &&
        orderNumber !== rawKey
      ) {
        return {
          ok: true,
          skippedDuplicate: true,
          instanceUsed: COMMERCIAL_WHATSAPP_INSTANCE_NAME,
          orderNumber,
        };
      }
      if (orderNumber !== rawKey) {
        inFlightOrderConfirmationSet.add(orderNumber);
        lockedOrderNumber = orderNumber;
      }

      try {
        if (ord.delivery_address_json) {
          parsedAddress = JSON.parse(ord.delivery_address_json);
        }
      } catch {
        parsedAddress = {};
      }

      // Verifica idempotência persistida no banco Appwrite
      if (!params.forceResend && parsedAddress?.customerPaidConfirmationSentAt) {
        sentOrderConfirmationSet.add(orderNumber);
        sentOrderConfirmationSet.add(ord.$id);
        return {
          ok: true,
          skippedDuplicate: true,
          instanceUsed: COMMERCIAL_WHATSAPP_INSTANCE_NAME,
          orderNumber,
        };
      }

      let parsedSheets: any[] = [];
      try {
        if (ord.manufacturing_sheet_json) {
          const rawSheets = JSON.parse(ord.manufacturing_sheet_json);
          parsedSheets = Array.isArray(rawSheets) ? rawSheets : rawSheets ? [rawSheets] : [];
        }
      } catch {
        parsedSheets = [];
      }

      customerName = ord.customer_name || "Cliente";
      customerDocument = ord.customer_document || "";
      customerEmail = ord.customer_email || "";
      customerWhatsapp = ord.customer_whatsapp || "";
      method =
        params.method ||
        details.payment?.payment_method ||
        parsedAddress?.paymentMethod ||
        "pix";
      installments =
        params.installments ||
        Number(parsedAddress?.lastGatewayDiag?.installments) ||
        1;
      subtotalCents = Number(ord.subtotal_cents) || 0;
      shippingCents = Number(ord.shipping_cents) || 0;
      discountCents = Number(ord.discount_cents || parsedAddress?.discountCents || 0);
      couponCode = ord.coupon_code || parsedAddress?.couponCode || null;
      totalCents = Number(ord.total_cents) || 0;

      formattedItems = (details.items || []).map((it: any, idx: number) => {
        const sheet = parsedSheets[idx] || parsedSheets[0] || null;
        return {
          cabinetName: it.cabinet_name || sheet?.cabinetModelName || "Gabinete Totem Pro",
          colorName: it.color_name || sheet?.colorName || "Padrão",
          monitorName: it.monitor_name,
          printerName: it.printer_name,
          readerName: it.reader_name,
          quantity: Number(it.quantity) || 1,
          subtotalCents: Number(it.subtotal_cents) || 0,
          kitItemsSnapshot: it.kit_items_snapshot || sheet?.kitItemsSnapshot || null,
          includeAssemblyService: Boolean(sheet?.includeAssemblyService),
          customizationNotes: sheet?.customizationNotes || "",
          customDimensions: sheet?.customMonitorDimensions || null,
        };
      });
    } else {
      // Fallback para pedido local caso Appwrite esteja indisponível
      const localOrd = findOrderByNumber(rawKey);
      if (!localOrd) {
        return { ok: false, error: `Pedido ${rawKey} não localizado.` };
      }
      orderNumber = localOrd.orderNumber;
      customerName = localOrd.customer?.name || "Cliente";
      customerDocument = localOrd.customer?.document || "";
      customerEmail = localOrd.customer?.email || "";
      customerWhatsapp = localOrd.customer?.whatsapp || "";
      method = params.method || localOrd.payment?.method || "pix";
      subtotalCents = localOrd.subtotalCents || 0;
      shippingCents = localOrd.shippingCents || 0;
      totalCents = localOrd.totalCents || 0;
      parsedAddress = {
        ...(localOrd.deliveryAddress || {}),
        shippingMethod: localOrd.shippingMethod || null,
      };
      formattedItems = (localOrd.items || []).map((it: any) => ({
        cabinetName: it.configuration?.model?.name || "Gabinete Totem Pro",
        colorName: it.configuration?.color?.name || "Padrão",
        monitorName: it.configuration?.monitor?.displayName,
        printerName: it.configuration?.printer?.displayName,
        readerName: it.configuration?.barcodeReader?.displayName,
        quantity: it.quantity || 1,
        subtotalCents: it.subtotalCents || 0,
        includeAssemblyService: Boolean(it.configuration?.includeAssemblyService),
        customizationNotes: it.configuration?.customizationNotes || "",
        customDimensions: it.configuration?.monitor?.customDimensions || null,
      }));
    }

    if (!customerWhatsapp || sanitizePhoneNumber(customerWhatsapp).length < 10) {
      return {
        ok: false,
        error: `Pedido #${orderNumber} não possui WhatsApp válido cadastrado para o cliente.`,
        orderNumber,
      };
    }

    const confirmationMessage = buildCustomerOrderConfirmedWhatsAppMessage({
      orderNumber,
      customerName,
      customerDocument,
      customerEmail,
      method,
      installments,
      subtotalCents,
      shippingCents,
      discountCents,
      couponCode,
      totalCents,
      deliveryAddress: parsedAddress,
      items: formattedItems,
    });

    // Caso tenha havido notificação recente nos últimos 60s para esse mesmo número (ex: remarketing),
    // limpamos a trava de 60s para que a confirmação oficial de pagamento nunca seja barrada.
    const digits = sanitizePhoneNumber(customerWhatsapp);
    const fullE164 = digits.startsWith("55") ? digits : `55${digits}`;
    recentCustomerDispatchCache.delete(fullE164);

    const sendRes = await sendDirectWhatsAppToCustomer({
      customerName,
      customerWhatsapp,
      message: confirmationMessage,
      contextLabel: `Confirmação de Pedido Pago #${orderNumber}`,
      actor: params.actor || "Automação Pós-Pagamento (Comercial X-Point)",
    });

    if (sendRes.ok) {
      const sentIso = new Date().toISOString();
      sentOrderConfirmationSet.add(orderNumber);
      if (appwriteOrderDoc?.$id) {
        sentOrderConfirmationSet.add(appwriteOrderDoc.$id);
      }

      // Persiste a confirmação no documento do pedido no Appwrite para idempotência permanente e exibição no Admin
      if (appwriteOrderDoc?.$id) {
        try {
          const updatedAddr = {
            ...parsedAddress,
            customerPaidConfirmationSentAt: sentIso,
            customerPaidConfirmationInstance: COMMERCIAL_WHATSAPP_INSTANCE_NAME,
            customerPaidConfirmationPhone: sendRes.phoneE164 || fullE164,
            remarketing: {
              ...(parsedAddress?.remarketing || {}),
              stage: "recovered",
              updatedAt: sentIso,
            },
          };
          const serialized = JSON.stringify(updatedAddr);
          if (serialized.length < 9500) {
            await getServerDatabases().updateDocument(
              APPWRITE_CONFIG.databaseId,
              APPWRITE_CONFIG.collections.orders,
              appwriteOrderDoc.$id,
              { delivery_address_json: serialized }
            );
          }
        } catch (persistErr) {
          console.warn("Aviso ao persistir timestamp de confirmação enviada ao cliente:", persistErr);
        }
      }
    }

    return {
      ok: sendRes.ok,
      error: sendRes.error,
      instanceUsed: sendRes.instanceUsed || COMMERCIAL_WHATSAPP_INSTANCE_NAME,
      phoneE164: sendRes.phoneE164 || fullE164,
      orderNumber,
    };
  } catch (err: any) {
    console.warn("Erro em sendCustomerOrderConfirmedWhatsApp:", err);
    return {
      ok: false,
      error: err?.message || "Erro ao enviar confirmação de pagamento para o cliente.",
    };
  } finally {
    inFlightOrderConfirmationSet.delete(rawKey);
    if (lockedOrderNumber) {
      inFlightOrderConfirmationSet.delete(lockedOrderNumber);
    }
  }
}

/**
 * Envia notificação quando o pagamento de um pedido é confirmado (PIX ou Cartão):
 * 1. Alerta interno para Ronaldo e Daniela (via FoodNext)
 * 2. Mensagem comercial organizada e detalhada para o WhatsApp do cliente (via Comercial X-Point)
 */
export async function notifyPaymentConfirmedOnWhatsApp(params: {
  orderId?: string;
  orderNumber: string;
  customerName: string;
  customerWhatsapp?: string;
  totalCents: number;
  method: string;
  installments?: number;
}) {
  try {
    const methodLabel = params.method === "credit_card" ? "Cartão de Crédito" : "PIX à Vista";
    const message =
      `✅ *PAGAMENTO CONFIRMADO — TOTEM PRO* 💰\n\n` +
      `📦 *Pedido:* #${params.orderNumber}\n` +
      `👤 *Cliente:* ${params.customerName}\n` +
      (params.customerWhatsapp ? `📱 *WhatsApp:* ${params.customerWhatsapp}\n` : "") +
      `💳 *Forma de Pagamento:* ${methodLabel}\n` +
      `💵 *Valor Liquidado:* *${formatBRL(params.totalCents)}*\n` +
      `⚙️ *Status:* Liberado para Produção / Corte CNC\n\n` +
      `🔗 *Ver Ordem de Execução no Admin:*\nhttps://totem.xpointsolucoes.com.br/admin`;

    const [adminBroadcastRes, customerConfirmRes] = await Promise.allSettled([
      broadcastAdminWhatsAppNotification(message, `Pagamento Confirmado #${params.orderNumber}`),
      sendCustomerOrderConfirmedWhatsApp({
        orderIdOrNumber: params.orderId || params.orderNumber,
        method: params.method,
        installments: params.installments,
        actor: "Automação Pós-Pagamento (Comercial X-Point)",
      }),
    ]);

    const adminResult =
      adminBroadcastRes.status === "fulfilled"
        ? adminBroadcastRes.value
        : { sentCount: 0, results: [] };

    const customerResult =
      customerConfirmRes.status === "fulfilled"
        ? customerConfirmRes.value
        : { ok: false, error: "Exceção no disparo ao cliente" };

    return {
      ...adminResult,
      customerConfirmation: customerResult,
    };
  } catch (err) {
    console.warn("Aviso ao enviar notificação de pagamento confirmado via WhatsApp:", err);
    return { sentCount: 0, results: [] };
  }
}

/**
 * Envia uma mensagem direta via WhatsApp API para o número do cliente
 * utilizando OBRIGATORIAMENTE a instância "Comercial X-Point" (5511991649959)
 * com travas anti-duplicidade e validação de telefone.
 */
export async function sendDirectWhatsAppToCustomer(params: {
  customerName: string;
  customerWhatsapp: string;
  message: string;
  contextLabel?: string;
  actor?: string;
}): Promise<{ ok: boolean; error?: string; instanceUsed?: string; phoneE164?: string }> {
  const cfg = getWhatsAppConfig();
  const digits = sanitizePhoneNumber(params.customerWhatsapp);
  if (digits.length < 10 || digits.length > 13) {
    return { ok: false, error: "Número de WhatsApp do cliente inválido (deve conter DDD + 8 ou 9 dígitos)." };
  }
  const fullNumber = digits.startsWith("55") ? digits : `55${digits}`;
  const localDigits = fullNumber.slice(2);
  if (localDigits.length < 10 || localDigits.length > 11) {
    return { ok: false, error: `Formato de telefone inválido após DDI 55 (${fullNumber}).` };
  }
  const ddd = Number(localDigits.slice(0, 2));
  if (!Number.isInteger(ddd) || ddd < 11 || ddd > 99) {
    return { ok: false, error: `DDD brasileiro inválido (${ddd}).` };
  }
  // Bloqueia sequências repetidas como 999999999 ou 000000000
  if (/^(\d)\1{7,}$/.test(localDigits.slice(2))) {
    return { ok: false, error: "Número de telefone com dígitos repetidos inválidos." };
  }
  // Bloqueia envio acidental para números das próprias instâncias da empresa
  const blockedInternalNumbers = new Set([
    "5511991649959", // Comercial X-Point
    "5511947758860", // FoodNext
  ]);
  if (blockedInternalNumbers.has(fullNumber)) {
    return { ok: false, error: "Envio bloqueado: o número pertence a uma instância interna da empresa." };
  }

  const cleanMsg = String(params.message || "").trim();
  if (cleanMsg.length < 15) {
    return { ok: false, error: "Mensagem muito curta ou vazia." };
  }

  // Trava anti-loop / anti-clique duplo em memória (60 segundos para o mesmo número)
  const now = Date.now();
  const lastSentAt = recentCustomerDispatchCache.get(fullNumber) || 0;
  if (now - lastSentAt < 60_000) {
    const waitSec = Math.ceil((60_000 - (now - lastSentAt)) / 1000);
    return {
      ok: false,
      error: `Trava anti-loop ativa: uma mensagem já foi enviada para ${fullNumber} há poucos segundos. Aguarde ${waitSec}s.`,
      instanceUsed: cfg.commercialInstance,
      phoneE164: fullNumber,
    };
  }

  recentCustomerDispatchCache.set(fullNumber, now);

  const res = await sendWhatsAppTextMessage(fullNumber, cleanMsg, 3, {
    instance: cfg.commercialInstance,
    apiKey: cfg.commercialApiKey,
    baseUrl: cfg.commercialBaseUrl,
  });

  if (!res.ok) {
    // Libera a trava se houve falha de rede para permitir nova tentativa
    recentCustomerDispatchCache.delete(fullNumber);
  }

  try {
    logEcosystemEvent({
      category: "orders",
      level: res.ok ? "info" : "warn",
      action: res.ok
        ? `Mensagem Enviada ao Cliente (${cfg.commercialInstance})`
        : `Falha no Envio ao Cliente (${cfg.commercialInstance})`,
      target: params.contextLabel || params.customerName,
      details: res.ok
        ? `Mensagem enviada via instância "${cfg.commercialInstance}" para ${params.customerName} (${fullNumber}).`
        : `Falha ao enviar via "${cfg.commercialInstance}" para ${fullNumber}: ${res.error}`,
      actor: params.actor || "Comercial X-Point / Remarketing",
    });
  } catch {}

  return {
    ...res,
    instanceUsed: cfg.commercialInstance,
    phoneE164: fullNumber,
  };
}
