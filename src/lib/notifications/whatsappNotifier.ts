import { formatBRL } from "@/modules/pricing/pricingEngine";
import { OrderDetails } from "@/types/order";
import { logEcosystemEvent } from "@/lib/logging/ecosystemLogger";

const DEFAULT_WHATSAPP_API_URL = "https://wh1ss8sy848ufj6zh8t492y7.69.62.92.212.sslip.io";
const DEFAULT_WHATSAPP_INSTANCE = "cc4efe36-f391-4b3d-a24c-ddcd8a293cf6";
const DEFAULT_WHATSAPP_API_KEY = "sk_inst_c79464fa9eea45b0860033430a3cf30d";

export interface NotificationRecipient {
  name: string;
  number: string;
}

export const DEFAULT_ORDER_NOTIFICATION_RECIPIENTS: NotificationRecipient[] = [
  { name: "Ronaldo", number: "5511975960999" },
  { name: "Daniela", number: "5511947020103" },
];

function sanitizePhoneNumber(raw: string): string {
  return String(raw || "").replace(/\D/g, "");
}

function getWhatsAppConfig() {
  const baseUrl = (process.env.WHATSAPP_API_URL || DEFAULT_WHATSAPP_API_URL).replace(/\/+$/, "");
  const instance = (process.env.WHATSAPP_INSTANCE_ID || DEFAULT_WHATSAPP_INSTANCE).trim();
  const apiKey = (process.env.WHATSAPP_API_KEY || DEFAULT_WHATSAPP_API_KEY).trim();

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

  return { baseUrl, instance, apiKey, recipients };
}

/**
 * Envia uma mensagem de texto via API FooodNext WhatsApp com até 3 tentativas automáticas.
 */
export async function sendWhatsAppTextMessage(
  number: string,
  text: string,
  maxAttempts = 3
): Promise<{ ok: boolean; status?: number; error?: string }> {
  const { baseUrl, instance, apiKey } = getWhatsAppConfig();
  const cleanNumber = sanitizePhoneNumber(number);

  if (!cleanNumber) {
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
        return { ok: true, status: response.status };
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

  return { ok: false, error: lastError };
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
        const monitorLabel = cfg.monitor?.displayName || "Sem monitor";
        const printerLabel = cfg.printer?.displayName || "Sem impressora";
        const readerLabel = cfg.barcodeReader?.displayName || "Sem leitor";
        const assemblyLabel = cfg.includeAssemblyService ? "\n   🔧 *Montagem de Fábrica:* Sim (+ R$ 999,00)" : "";

        const customDims = cfg.monitor?.customDimensions;
        const customDimsLabel = customDims
          ? `\n   📐 *Medidas Monitor Sob Medida:* Inteiro ${customDims.outerWidthCm}x${customDims.outerHeightCm}cm | Tela ${customDims.screenWidthCm}x${customDims.screenHeightCm}cm`
          : "";

        const notesLabel =
          cfg.customizationNotes && cfg.customizationNotes.trim().length > 0
            ? `\n   ⚠️ *Obs. do Item:* ${cfg.customizationNotes.trim()}`
            : "";

        return (
          `*${idx + 1}. ${item.quantity}x ${cfg.model.name}*\n` +
          `   • Cor: ${cfg.color.name}\n` +
          `   • Monitor: ${monitorLabel}\n` +
          `   • Impressora: ${printerLabel}\n` +
          `   • Leitor: ${readerLabel}` +
          assemblyLabel +
          customDimsLabel +
          notesLabel +
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
