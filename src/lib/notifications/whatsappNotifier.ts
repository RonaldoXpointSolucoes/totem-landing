import { formatBRL } from "@/modules/pricing/pricingEngine";
import { resolveKitEquipmentSummary } from "@/modules/catalog/kitDefaults";
import { OrderDetails } from "@/types/order";
import { logEcosystemEvent } from "@/lib/logging/ecosystemLogger";

const DEFAULT_WHATSAPP_API_URL = "https://wh1ss8sy848ufj6zh8t492y7.69.62.92.212.sslip.io";
// Instância Interna de Alertas Administrativos (FoodNext -> Ronaldo / Daniela)
const DEFAULT_WHATSAPP_INSTANCE = "cc4efe36-f391-4b3d-a24c-ddcd8a293cf6";
const DEFAULT_WHATSAPP_API_KEY = "sk_inst_c79464fa9eea45b0860033430a3cf30d";

// Instância Oficial Exclusiva para Comunicação com Clientes e Remarketing ("Comercial X-Point")
export const COMMERCIAL_WHATSAPP_INSTANCE_NAME = "Comercial X-Point";
export const COMMERCIAL_WHATSAPP_INSTANCE_ID = "f695a096-cb11-48aa-b603-27f0d41ae97d";
export const COMMERCIAL_WHATSAPP_PHONE = "5511991649959";
export const COMMERCIAL_WHATSAPP_NUMBER = "5511991649959";
export const COMMERCIAL_WHATSAPP_API_KEY = "sk_f069b525379f002b983225c0f4e0cdac";

// Trava anti-duplicidade em memória para envios a clientes (evita duplo clique ou loop acidental)
const recentCustomerDispatchCache = new Map<string, number>();
const CUSTOMER_MIN_REPEAT_INTERVAL_MS = 60 * 1000; // 60 segundos entre disparos idênticos para o mesmo número

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

  return { baseUrl, instance, apiKey, commercialInstance, commercialApiKey, recipients };
}

/**
 * Consulta o status ao vivo da instância "Comercial X-Point" no servidor WhatsApp.
 */
export async function checkCommercialWhatsAppStatus(): Promise<{
  ok: boolean;
  instanceName: string;
  instanceId: string;
  phone: string;
  state: string;
  error?: string;
}> {
  const { baseUrl, commercialInstance, commercialApiKey } = getWhatsAppConfig();
  try {
    const res = await fetch(
      `${baseUrl}/instance/${encodeURIComponent(commercialInstance)}/status`,
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
  customInstanceConfig?: { instance: string; apiKey: string }
): Promise<{ ok: boolean; status?: number; error?: string; instanceUsed?: string }> {
  const cfg = getWhatsAppConfig();
  const baseUrl = cfg.baseUrl;
  const instance = customInstanceConfig?.instance || cfg.instance;
  const apiKey = customInstanceConfig?.apiKey || cfg.apiKey;
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
 * Envia notificação quando o pagamento de um pedido é confirmado (PIX ou Cartão).
 */
export async function notifyPaymentConfirmedOnWhatsApp(params: {
  orderNumber: string;
  customerName: string;
  customerWhatsapp?: string;
  totalCents: number;
  method: string;
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

    return await broadcastAdminWhatsAppNotification(message, `Pagamento Confirmado #${params.orderNumber}`);
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
