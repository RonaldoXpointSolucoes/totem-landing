import fs from "node:fs";
import path from "node:path";
import { Query } from "node-appwrite";
import { APPWRITE_CONFIG } from "@/lib/appwrite/config";
import { getServerDatabases, listAllOrdersAdmin } from "@/lib/appwrite/server";
import { getAllLocalOrders } from "@/lib/orders/orderStore";
import { checkoutStatusToken } from "@/lib/payments/mercadoPago";
import {
  COMMERCIAL_WHATSAPP_INSTANCE_ID,
  COMMERCIAL_WHATSAPP_INSTANCE_NAME,
  COMMERCIAL_WHATSAPP_NUMBER,
  checkCommercialWhatsAppStatus,
  sendDirectWhatsAppToCustomer,
} from "@/lib/notifications/whatsappNotifier";
import { logEcosystemEvent } from "@/lib/logging/ecosystemLogger";

export type CommercialRecoveryStage =
  | "awaiting_contact"
  | "auto_contacted"
  | "manual_contacted"
  | "in_negotiation"
  | "recovered"
  | "do_not_disturb";

export type RemarketingTemplateId =
  | "soft_support"
  | "payment_flex"
  | "cart_concierge";

export interface RemarketingConfig {
  /** Se o envio automático para novos pedidos parados está ativo */
  autoEnabled: boolean;
  /** Timestamp ISO de quando o piloto automático foi ativado (evita disparo retroativo em pedidos antigos) */
  autoEnabledSinceIso: string;
  /** Tempo mínimo (em minutos) que o pedido/carrinho precisa ficar parado antes do 1º contato automático */
  minIdleMinutesBeforeAuto: number;
  /** Idade máxima (em horas) para elegibilidade de disparo automático (evita incomodar pedidos antigos) */
  maxOrderAgeHoursForAuto: number;
  /** Limite estrito de mensagens automáticas por pedido/carrinho (SEMPRE 1 para não incomodar) */
  maxAutoMessagesPerTarget: number;
  /** Cooldown mínimo em horas para o mesmo telefone receber outra mensagem automática */
  phoneCooldownHours: number;
  /** Horário comercial de início (08h BRT) */
  businessHoursStart: number;
  /** Horário comercial de término (20h BRT) */
  businessHoursEnd: number;
  /** Instância fixa exigida para comunicação com clientes */
  instanceName: string;
  instanceId: string;
  instancePhone: string;
}

export interface RemarketingHistoryEntry {
  id: string;
  targetId: string;
  targetType: "order" | "cart_lead";
  orderNumber?: string;
  customerName: string;
  customerFirstName: string;
  phoneE164: string;
  phoneCoreKey: string;
  mode: "auto" | "manual";
  templateId: RemarketingTemplateId;
  messagePreview: string;
  instanceUsed: string;
  sentAt: string;
  actor: string;
  ok: boolean;
  error?: string;
}

export interface TargetRemarketingState {
  targetId: string;
  stage: CommercialRecoveryStage;
  doNotDisturb: boolean;
  commercialNotes: string;
  autoSentCount: number;
  manualSentCount: number;
  lastSentAt?: string;
  lastTemplateId?: RemarketingTemplateId;
  lastMode?: "auto" | "manual";
  updatedAt: string;
}

interface PersistentRemarketingLedger {
  config: RemarketingConfig;
  targets: Record<string, TargetRemarketingState>;
  phoneLastSentAt: Record<string, string>;
  phoneDoNotDisturb: Record<string, boolean>;
  history: RemarketingHistoryEntry[];
}

export interface SafetyGuardItem {
  code: string;
  label: string;
  passed: boolean;
  blockingMode: "both" | "auto_only" | "info";
  detail: string;
}

export interface EvaluatedRemarketingTarget {
  targetId: string;
  targetType: "order" | "cart_lead";
  appwriteDocId?: string;
  orderNumber: string;
  createdAt: string;
  idleMinutes: number;
  idleLabel: string;
  customerName: string;
  customerFirstName: string;
  customerDocument: string;
  customerEmail: string;
  customerWhatsappRaw: string;
  phoneE164: string;
  phoneCoreKey: string;
  phoneValid: boolean;
  phoneValidationReason?: string;
  cityState: string;
  totalCents: number;
  paymentMethod: "pix" | "credit_card";
  productSummary: string;
  checkoutUrl: string;
  stage: CommercialRecoveryStage;
  doNotDisturb: boolean;
  commercialNotes: string;
  autoSentCount: number;
  manualSentCount: number;
  lastSentAt?: string;
  lastMode?: "auto" | "manual";
  /** Se o cliente já pagou em outro pedido mais recente */
  alreadyPaidInOtherOrder?: {
    orderNumber: string;
    paidAt: string;
    totalCents: number;
  } | null;
  /** Se existe outro pedido em aberto mais recente do mesmo telefone/CPF */
  supersededByNewerOrder?: {
    orderNumber: string;
    createdAt: string;
  } | null;
  /** Resultado consolidado das travas de segurança */
  canSendManual: boolean;
  canSendAutoNow: boolean;
  primaryStatusBadge: {
    code:
      | "ELIGIBLE_AUTO_NOW"
      | "ELIGIBLE_ASSISTED"
      | "WAITING_IDLE_TIME"
      | "WAITING_BUSINESS_HOURS"
      | "ALREADY_CONTACTED"
      | "RECOVERED_IN_OTHER_ORDER"
      | "SUPERSEDED_DUPLICATE"
      | "DO_NOT_DISTURB"
      | "PHONE_COOLDOWN"
      | "INVALID_DATA";
    label: string;
    tone: "emerald" | "indigo" | "amber" | "sky" | "rose" | "slate";
    explanation: string;
  };
  safetyGuards: SafetyGuardItem[];
  templates: Record<RemarketingTemplateId, string>;
}

const LEDGER_FILE_PATH = path.join(process.cwd(), "src", "data", "remarketing_ledger.json");

// Trava em memória contra execuções concorrentes (evita race conditions)
const inFlightTargetLocks = new Set<string>();
const inFlightPhoneLocks = new Set<string>();
let isAutoSweepRunning = false;

const DEFAULT_CONFIG: RemarketingConfig = {
  autoEnabled: true,
  autoEnabledSinceIso: new Date().toISOString(),
  minIdleMinutesBeforeAuto: 45,
  maxOrderAgeHoursForAuto: 24,
  maxAutoMessagesPerTarget: 1,
  phoneCooldownHours: 72,
  businessHoursStart: 8,
  businessHoursEnd: 20,
  instanceName: COMMERCIAL_WHATSAPP_INSTANCE_NAME,
  instanceId: COMMERCIAL_WHATSAPP_INSTANCE_ID,
  instancePhone: COMMERCIAL_WHATSAPP_NUMBER,
};

function readLedger(): PersistentRemarketingLedger {
  try {
    if (fs.existsSync(LEDGER_FILE_PATH)) {
      const raw = fs.readFileSync(LEDGER_FILE_PATH, "utf-8");
      const parsed = JSON.parse(raw);
      return {
        config: {
          ...DEFAULT_CONFIG,
          ...(parsed.config || {}),
          // Garante sempre 1 mensagem automática máxima e instância Comercial X-Point
          maxAutoMessagesPerTarget: 1,
          instanceName: COMMERCIAL_WHATSAPP_INSTANCE_NAME,
          instanceId: COMMERCIAL_WHATSAPP_INSTANCE_ID,
          instancePhone: COMMERCIAL_WHATSAPP_NUMBER,
        },
        targets: parsed.targets || {},
        phoneLastSentAt: parsed.phoneLastSentAt || {},
        phoneDoNotDisturb: parsed.phoneDoNotDisturb || {},
        history: Array.isArray(parsed.history) ? parsed.history.slice(0, 250) : [],
      };
    }
  } catch (err) {
    console.warn("Aviso ao ler remarketing_ledger.json:", err);
  }

  return {
    config: { ...DEFAULT_CONFIG },
    targets: {},
    phoneLastSentAt: {},
    phoneDoNotDisturb: {},
    history: [],
  };
}

function writeLedger(ledger: PersistentRemarketingLedger) {
  try {
    const dir = path.dirname(LEDGER_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(LEDGER_FILE_PATH, JSON.stringify(ledger, null, 2), "utf-8");
  } catch (err) {
    console.warn("Aviso ao salvar remarketing_ledger.json:", err);
  }
}

/**
 * Extrai um primeiro nome limpo e humano para saudação no WhatsApp,
 * removendo prefixos de CNPJ/CPF (ex: "59.942.855 Luis Fernando..." -> "Luis")
 * e termos jurídicos (LTDA, ME, EIRELI).
 */
export function extractSafeCustomerFirstName(rawName: string): string {
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

/**
 * Normaliza e valida um número de telefone brasileiro para WhatsApp,
 * gerando uma chave canônica (DDD + últimos 8 dígitos) para cruzar pedidos com ou sem 9º dígito.
 */
export function normalizeCustomerPhone(rawPhone: string): {
  valid: boolean;
  e164: string;
  ddd: string;
  coreKey: string;
  reason?: string;
} {
  const digits = String(rawPhone || "").replace(/\D/g, "");
  if (!digits) {
    return { valid: false, e164: "", ddd: "", coreKey: "", reason: "Telefone ausente." };
  }

  const withoutCountry = digits.startsWith("55") && digits.length >= 12 ? digits.slice(2) : digits;
  if (withoutCountry.length < 10 || withoutCountry.length > 11) {
    return {
      valid: false,
      e164: digits.startsWith("55") ? digits : `55${digits}`,
      ddd: withoutCountry.slice(0, 2),
      coreKey: "",
      reason: `Quantidade inválida de dígitos (${withoutCountry.length}). Esperado DDD + 8 ou 9 números.`,
    };
  }

  const dddNum = Number(withoutCountry.slice(0, 2));
  if (!Number.isInteger(dddNum) || dddNum < 11 || dddNum > 99) {
    return {
      valid: false,
      e164: `55${withoutCountry}`,
      ddd: withoutCountry.slice(0, 2),
      coreKey: "",
      reason: `DDD brasileiro inválido (${withoutCountry.slice(0, 2)}).`,
    };
  }

  const subscriber = withoutCountry.slice(2);
  if (
    /^(\d)\1{6,}$/.test(subscriber) ||
    /(\d)\1{3}(\d)\2{3}/.test(subscriber) ||
    subscriber.includes("1234567") ||
    subscriber.includes("000000")
  ) {
    return {
      valid: false,
      e164: `55${withoutCountry}`,
      ddd: withoutCountry.slice(0, 2),
      coreKey: "",
      reason: "Número de teste ou sequência numérica repetida inválida.",
    };
  }

  const e164 = `55${withoutCountry}`;
  const blockedInternal = new Set([
    "5511991649959", // Comercial X-Point
    "5511947758860", // FoodNext
    "5511975960999", // Admin Ronaldo
    "5511947020103", // Admin Daniela
  ]);
  if (blockedInternal.has(e164)) {
    return {
      valid: false,
      e164,
      ddd: withoutCountry.slice(0, 2),
      coreKey: `${withoutCountry.slice(0, 2)}:${subscriber.slice(-8)}`,
      reason: "Número pertence à equipe interna / instância da empresa.",
    };
  }

  const coreKey = `${withoutCountry.slice(0, 2)}:${subscriber.slice(-8)}`;
  return {
    valid: true,
    e164,
    ddd: withoutCountry.slice(0, 2),
    coreKey,
  };
}

function normalizeDocumentDigits(doc: string): string {
  const d = String(doc || "").replace(/\D/g, "");
  return d.length >= 11 ? d : "";
}

function normalizeEmail(email: string): string {
  const e = String(email || "").trim().toLowerCase();
  if (!e || !e.includes("@") || e.includes("nao-informado") || e.includes("totem.local")) {
    return "";
  }
  return e;
}

function formatBRL(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format((cents || 0) / 100);
}

function formatIdleDuration(minutes: number): string {
  if (minutes < 60) return `${Math.max(1, Math.round(minutes))} min`;
  const hours = Math.floor(minutes / 60);
  const remMin = Math.round(minutes % 60);
  if (hours < 24) return remMin > 0 ? `${hours}h ${remMin}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours > 0 ? `${days}d ${remHours}h` : `${days}d`;
}

function getSaoPauloHour(date = new Date()): number {
  try {
    const formatted = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Sao_Paulo",
      hour: "numeric",
      hour12: false,
    }).format(date);
    const h = Number(formatted);
    return Number.isFinite(h) ? h % 24 : date.getHours();
  } catch {
    return date.getHours();
  }
}

export function buildRemarketingTemplates(params: {
  customerFirstName: string;
  orderNumber: string;
  productSummary: string;
  totalCents: number;
  paymentMethod: "pix" | "credit_card";
  checkoutUrl: string;
  isCartLead?: boolean;
}): Record<RemarketingTemplateId, string> {
  const greeting =
    params.customerFirstName && params.customerFirstName !== "Cliente"
      ? `Olá, *${params.customerFirstName}*! Tudo bem?`
      : `Olá! Tudo bem?`;

  const totalFormatted = formatBRL(params.totalCents);
  const methodText =
    params.paymentMethod === "credit_card" ? "Cartão de Crédito (até 10x)" : "PIX à Vista";

  const softSupport =
    `${greeting}\n\n` +
    `Aqui é do setor *Comercial da X-Point (Totem Pro)*.\n\n` +
    `Vimos que o seu pedido *#${params.orderNumber}* (${params.productSummary}) ficou aguardando a conclusão do pagamento e gostaríamos de saber se você teve alguma dúvida técnica sobre o equipamento, prazo de fabricação ou se houve alguma dificuldade na tela de pagamento.\n\n` +
    `📋 *Resumo reservado para você:*\n` +
    `• *Configuração:* ${params.productSummary}\n` +
    `• *Modalidade:* ${methodText}\n` +
    `• *Valor Total:* *${totalFormatted}*\n\n` +
    (params.checkoutUrl
      ? `🔗 *Link direto do seu pedido (PIX ou Cartão em até 10x):*\n${params.checkoutUrl}\n\n`
      : "") +
    `Se precisar de qualquer ajuste na configuração ou preferir auxílio por aqui, estamos à disposição! 😊`;

  const paymentFlex =
    `${greeting}\n\n` +
    `Aqui é da equipe *Comercial X-Point (Totem Pro)*.\n\n` +
    `Notamos que o pagamento do pedido *#${params.orderNumber}* (*${params.productSummary}* — *${totalFormatted}*) ainda não foi finalizado.\n\n` +
    `Caso prefira alternar a forma de pagamento entre *PIX Imediato* e *Cartão de Crédito em até 10x*, você pode escolher diretamente na página do seu pedido:\n` +
    (params.checkoutUrl ? `👉 ${params.checkoutUrl}\n\n` : "\n") +
    `Ou, se desejar que nossa equipe gere uma condição personalizada para aprovação imediata na produção CNC, basta responder esta mensagem!`;

  const cartConcierge =
    `${greeting}\n\n` +
    `Aqui é da consultoria *Comercial X-Point (Totem Pro)*.\n\n` +
    `Vimos que você estava montando o seu *${params.productSummary}* em nosso configurador. Ficou alguma dúvida sobre a compatibilidade com o seu monitor, impressora térmica ou sobre o frete para a sua região?\n\n` +
    (params.checkoutUrl
      ? `Você pode retomar seu pedido a qualquer momento pelo link:\n${params.checkoutUrl}\n\n`
      : "") +
    `Se quiser, posso te ajudar por aqui a fechar a melhor configuração para a sua operação!`;

  return {
    soft_support: softSupport,
    payment_flex: paymentFlex,
    cart_concierge: cartConcierge,
  };
}

/**
 * Carrega e consolida todos os pedidos e leads de carrinho abandonado,
 * aplicando as 10 travas de segurança anti-loop e anti-mensagem errada.
 */
export async function evaluateOrdersAndCartsForRemarketing(): Promise<{
  config: RemarketingConfig;
  targets: EvaluatedRemarketingTarget[];
  history: RemarketingHistoryEntry[];
  kpis: {
    totalUnpaidOrders: number;
    eligibleAssistedCount: number;
    eligibleAutoNowCount: number;
    recoverableRevenueCents: number;
    alreadyRecoveredCount: number;
    alreadyRecoveredCents: number;
    blockedDuplicateOrPaidCount: number;
    autoSentTotalCount: number;
    manualSentTotalCount: number;
  };
}> {
  const ledger = readLedger();
  const config = ledger.config;
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://totem.xpointsolucoes.com.br").replace(/\/$/, "");

  // 1. Carrega todos os pedidos do Appwrite + fallback local
  let appwriteOrders: any[] = [];
  try {
    appwriteOrders = await listAllOrdersAdmin("all");
  } catch (err) {
    console.warn("Aviso ao listar pedidos no Appwrite para remarketing:", err);
  }

  const localOrders = getAllLocalOrders();
  const unifiedOrdersMap = new Map<string, any>();

  for (const o of appwriteOrders) {
    let parsedAddr: any = {};
    try {
      if (o.delivery_address_json) parsedAddr = JSON.parse(o.delivery_address_json);
    } catch {}
    unifiedOrdersMap.set(o.order_number, {
      appwriteDocId: o.$id,
      orderNumber: o.order_number,
      status: o.status || "awaiting_payment",
      createdAt: o.$createdAt || new Date().toISOString(),
      customerName: o.customer_name || "Cliente",
      customerDocument: o.customer_document || "",
      customerEmail: o.customer_email || "",
      customerWhatsapp: o.customer_whatsapp || "",
      cityState:
        parsedAddr?.city && parsedAddr?.state
          ? `${parsedAddr.city}/${parsedAddr.state}`
          : parsedAddr?.city || "Brasil",
      totalCents: Number(o.total_cents) || 0,
      paymentMethod:
        o.payment?.payment_method === "credit_card" || parsedAddr?.paymentMethod === "credit_card"
          ? "credit_card"
          : "pix",
      items: Array.isArray(o.items) ? o.items : [],
      parsedAddress: parsedAddr,
    });
  }

  for (const lo of localOrders) {
    if (!unifiedOrdersMap.has(lo.orderNumber)) {
      unifiedOrdersMap.set(lo.orderNumber, {
        appwriteDocId: undefined,
        orderNumber: lo.orderNumber,
        status: lo.status || "awaiting_payment",
        createdAt: lo.createdAt || new Date().toISOString(),
        customerName: lo.customer?.name || "Cliente",
        customerDocument: lo.customer?.document || "",
        customerEmail: lo.customer?.email || "",
        customerWhatsapp: lo.customer?.whatsapp || "",
        cityState:
          lo.deliveryAddress?.city && lo.deliveryAddress?.state
            ? `${lo.deliveryAddress.city}/${lo.deliveryAddress.state}`
            : "Brasil",
        totalCents: Number(lo.totalCents) || 0,
        paymentMethod: lo.payment?.method === "credit_card" ? "credit_card" : "pix",
        items: (lo.items || []).map((it: any) => ({
          cabinet_name: it.cabinetName,
          color_name: it.colorName,
          monitor_name: it.monitorName,
          quantity: it.quantity || 1,
        })),
        parsedAddress: lo.deliveryAddress || {},
      });
    }
  }

  const allOrders = Array.from(unifiedOrdersMap.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // 2. Constrói índices de clientes que JÁ PAGARAM em qualquer pedido (Trava 1)
  const paidStatuses = new Set(["paid", "in_production", "ready", "shipped", "delivered"]);
  const paidByPhoneCore = new Map<string, { orderNumber: string; paidAt: string; totalCents: number }>();
  const paidByDocument = new Map<string, { orderNumber: string; paidAt: string; totalCents: number }>();
  const paidByEmail = new Map<string, { orderNumber: string; paidAt: string; totalCents: number }>();

  for (const ord of allOrders) {
    if (paidStatuses.has(ord.status)) {
      const phoneNorm = normalizeCustomerPhone(ord.customerWhatsapp);
      const docNorm = normalizeDocumentDigits(ord.customerDocument);
      const emailNorm = normalizeEmail(ord.customerEmail);
      const paidInfo = {
        orderNumber: ord.orderNumber,
        paidAt: ord.createdAt,
        totalCents: ord.totalCents,
      };
      if (phoneNorm.coreKey && !paidByPhoneCore.has(phoneNorm.coreKey)) {
        paidByPhoneCore.set(phoneNorm.coreKey, paidInfo);
      }
      if (docNorm && !paidByDocument.has(docNorm)) {
        paidByDocument.set(docNorm, paidInfo);
      }
      if (emailNorm && !paidByEmail.has(emailNorm)) {
        paidByEmail.set(emailNorm, paidInfo);
      }
    }
  }

  // 3. Constrói índice do pedido em aberto MAIS RECENTE por telefone/documento (Trava 2)
  const newestUnpaidByPhoneCore = new Map<string, { orderNumber: string; createdAt: string }>();
  const newestUnpaidByDoc = new Map<string, { orderNumber: string; createdAt: string }>();

  const unpaidOrders = allOrders.filter((o) => o.status === "awaiting_payment");
  for (const ord of unpaidOrders) {
    const phoneNorm = normalizeCustomerPhone(ord.customerWhatsapp);
    const docNorm = normalizeDocumentDigits(ord.customerDocument);
    if (phoneNorm.coreKey && !newestUnpaidByPhoneCore.has(phoneNorm.coreKey)) {
      newestUnpaidByPhoneCore.set(phoneNorm.coreKey, {
        orderNumber: ord.orderNumber,
        createdAt: ord.createdAt,
      });
    }
    if (docNorm && !newestUnpaidByDoc.has(docNorm)) {
      newestUnpaidByDoc.set(docNorm, {
        orderNumber: ord.orderNumber,
        createdAt: ord.createdAt,
      });
    }
  }

  // 4. Também busca carrinhos/leads abandonados no Appwrite (ads_leads_carts) que tenham WhatsApp válido
  let abandonedCartLeads: any[] = [];
  try {
    const db = getServerDatabases();
    const res = await db.listDocuments(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.collections.adsLeadsCarts,
      [Query.orderDesc("$createdAt"), Query.limit(40)]
    );
    abandonedCartLeads = res.documents.filter((doc: any) => {
      const phone = String(doc.customer_whatsapp || "").replace(/\D/g, "");
      return phone.length >= 10 && doc.event_type !== "purchase";
    });
  } catch {}

  const nowMs = Date.now();
  const currentBrtHour = getSaoPauloHour(new Date(nowMs));
  const isWithinBusinessHours =
    currentBrtHour >= config.businessHoursStart && currentBrtHour < config.businessHoursEnd;

  const evaluatedTargets: EvaluatedRemarketingTarget[] = [];
  const seenCartPhones = new Set<string>();

  // 5. Avalia cada pedido sem pagamento (awaiting_payment)
  for (const ord of unpaidOrders) {
    const targetId = `order:${ord.orderNumber}`;
    const phoneNorm = normalizeCustomerPhone(ord.customerWhatsapp);
    const docNorm = normalizeDocumentDigits(ord.customerDocument);
    const emailNorm = normalizeEmail(ord.customerEmail);
    const firstName = extractSafeCustomerFirstName(ord.customerName);

    if (phoneNorm.coreKey) {
      seenCartPhones.add(phoneNorm.coreKey);
    }

    // Mescla estado salvo no Appwrite (delivery_address_json.remarketing) com o ledger local
    const addrRemarketing = ord.parsedAddress?.remarketing || {};
    const ledgerTarget = ledger.targets[targetId];

    const autoSentCount = Math.max(
      Number(addrRemarketing.autoSentCount) || 0,
      Number(ledgerTarget?.autoSentCount) || 0
    );
    const manualSentCount = Math.max(
      Number(addrRemarketing.manualSentCount) || 0,
      Number(ledgerTarget?.manualSentCount) || 0
    );
    const lastSentAt = ledgerTarget?.lastSentAt || addrRemarketing.lastSentAt || undefined;
    const lastMode = ledgerTarget?.lastMode || addrRemarketing.lastMode || undefined;

    // Verifica se o cliente já pagou em outro pedido
    const paidMatch =
      (phoneNorm.coreKey && paidByPhoneCore.get(phoneNorm.coreKey)) ||
      (docNorm && paidByDocument.get(docNorm)) ||
      (emailNorm && paidByEmail.get(emailNorm)) ||
      null;

    // Verifica se este pedido foi substituído por outro mais recente do mesmo cliente
    const newestByPhone = phoneNorm.coreKey ? newestUnpaidByPhoneCore.get(phoneNorm.coreKey) : null;
    const newestByDoc = docNorm ? newestUnpaidByDoc.get(docNorm) : null;
    let supersededMatch: { orderNumber: string; createdAt: string } | null = null;
    if (newestByPhone && newestByPhone.orderNumber !== ord.orderNumber) {
      supersededMatch = newestByPhone;
    } else if (newestByDoc && newestByDoc.orderNumber !== ord.orderNumber) {
      supersededMatch = newestByDoc;
    }

    const doNotDisturb = Boolean(
      ledgerTarget?.doNotDisturb ||
        addrRemarketing.doNotDisturb ||
        (phoneNorm.coreKey && ledger.phoneDoNotDisturb[phoneNorm.coreKey])
    );

    let stage: CommercialRecoveryStage =
      ledgerTarget?.stage || addrRemarketing.stage || "awaiting_contact";
    if (paidMatch) {
      stage = "recovered";
    } else if (doNotDisturb) {
      stage = "do_not_disturb";
    } else if (stage === "awaiting_contact" && (autoSentCount > 0 || manualSentCount > 0)) {
      stage = manualSentCount > 0 ? "manual_contacted" : "auto_contacted";
    }

    const createdMs = new Date(ord.createdAt).getTime();
    const idleMinutes = Math.max(0, (nowMs - createdMs) / 60_000);
    const orderAgeHours = idleMinutes / 60;

    // Cooldown por telefone (último envio para este número em qualquer pedido)
    const phoneLastSentIso =
      (phoneNorm.coreKey && ledger.phoneLastSentAt[phoneNorm.coreKey]) || lastSentAt;
    const hoursSincePhoneLastSent = phoneLastSentIso
      ? (nowMs - new Date(phoneLastSentIso).getTime()) / 3_600_000
      : 9999;
    const isPhoneInCooldownForAuto = hoursSincePhoneLastSent < config.phoneCooldownHours;

    // Corte retroativo para piloto automático
    const createdAfterAutoEnabled =
      createdMs >= new Date(config.autoEnabledSinceIso).getTime() - 60 * 60 * 1000;
    const withinMaxAutoAge = orderAgeHours <= config.maxOrderAgeHoursForAuto;

    // Resumo de itens do pedido
    const itemsSummary =
      ord.items && ord.items.length > 0
        ? ord.items
            .map(
              (it: any) =>
                `${it.quantity || 1}x ${it.cabinet_name || "Gabinete Totem"}${
                  it.color_name ? ` (${it.color_name})` : ""
                }`
            )
            .join(" + ")
        : "Gabinete de Autoatendimento Totem Pro";

    let checkoutUrl = `${siteUrl}/checkout/${encodeURIComponent(ord.orderNumber)}`;
    try {
      const token = checkoutStatusToken(ord.orderNumber);
      checkoutUrl = `${siteUrl}/checkout/${encodeURIComponent(ord.orderNumber)}?t=${token}`;
    } catch {}

    // Constrói as 10 travas auditáveis
    const safetyGuards: SafetyGuardItem[] = [
      {
        code: "CROSS_ORDER_PAID_CHECK",
        label: "Verificação Cruzada de Pagamento (CPF/WhatsApp/E-mail)",
        passed: !paidMatch,
        blockingMode: "both",
        detail: paidMatch
          ? `Bloqueado: Cliente já pagou no pedido #${paidMatch.orderNumber} (${formatBRL(paidMatch.totalCents)}).`
          : "Nenhum pagamento aprovado encontrado em outros pedidos deste cliente.",
      },
      {
        code: "DUPLICATE_ORDER_DEDUP",
        label: "Deduplicação de Pedidos do Mesmo Telefone/CPF",
        passed: !supersededMatch,
        blockingMode: "both",
        detail: supersededMatch
          ? `Bloqueado: Existe um pedido mais recente (#${supersededMatch.orderNumber}) com o mesmo telefone/CPF.`
          : "Este é o pedido em aberto mais recente deste contato.",
      },
      {
        code: "VALID_WHATSAPP_NUMBER",
        label: "Validação de WhatsApp Brasileiro e Bloqueio Interno",
        passed: phoneNorm.valid,
        blockingMode: "both",
        detail: phoneNorm.valid
          ? `Número válido (${phoneNorm.e164}) • Chave: ${phoneNorm.coreKey}`
          : `Número inválido: ${phoneNorm.reason}`,
      },
      {
        code: "DO_NOT_DISTURB_OPT_OUT",
        label: "Respeito ao Modo Não Perturbar / Opt-Out",
        passed: !doNotDisturb,
        blockingMode: "both",
        detail: doNotDisturb
          ? "Envio pausado manualmente (Não Perturbar ativo para este cliente)."
          : "Cliente apto a receber atendimento consultivo.",
      },
      {
        code: "VALID_PRODUCT_AND_TOTAL",
        label: "Integridade de Produto e Valor do Pedido",
        passed: ord.totalCents > 0 && Boolean(itemsSummary),
        blockingMode: "both",
        detail:
          ord.totalCents > 0
            ? `${itemsSummary} • Total ${formatBRL(ord.totalCents)}`
            : "Valor do pedido zerado ou sem itens válidos.",
      },
      {
        code: "SINGLE_AUTO_DISPATCH_LIMIT",
        label: "Limite Estrito de 1 Envio Automático por Pedido (Anti-Loop)",
        passed: autoSentCount < config.maxAutoMessagesPerTarget && manualSentCount === 0,
        blockingMode: "auto_only",
        detail:
          autoSentCount > 0 || manualSentCount > 0
            ? `Já recebeu contato (${autoSentCount} auto / ${manualSentCount} manual). Automático travado.`
            : "Nenhuma mensagem enviada ainda para este pedido.",
      },
      {
        code: "PHONE_COOLDOWN_72H",
        label: `Cooldown de ${config.phoneCooldownHours}h por Número de Telefone`,
        passed: !isPhoneInCooldownForAuto,
        blockingMode: "auto_only",
        detail: isPhoneInCooldownForAuto
          ? `Telefone recebeu mensagem há ${hoursSincePhoneLastSent.toFixed(1)}h (aguardando janela de ${config.phoneCooldownHours}h).`
          : `Telefone livre de envios nas últimas ${config.phoneCooldownHours}h.`,
      },
      {
        code: "MIN_IDLE_WAIT_TIME",
        label: `Tempo Mínimo de Espera (${config.minIdleMinutesBeforeAuto} min parado)`,
        passed: idleMinutes >= config.minIdleMinutesBeforeAuto,
        blockingMode: "auto_only",
        detail:
          idleMinutes >= config.minIdleMinutesBeforeAuto
            ? `Pedido parado há ${formatIdleDuration(idleMinutes)} (>= ${config.minIdleMinutesBeforeAuto} min).`
            : `Aguardando cliente finalizar pagamento (${Math.round(idleMinutes)}/${config.minIdleMinutesBeforeAuto} min).`,
      },
      {
        code: "RETROACTIVE_ORDER_CUTOFF",
        label: `Proteção Anti-Disparo Retroativo (Máx ${config.maxOrderAgeHoursForAuto}h no Auto)`,
        passed: withinMaxAutoAge && createdAfterAutoEnabled,
        blockingMode: "auto_only",
        detail:
          withinMaxAutoAge && createdAfterAutoEnabled
            ? "Pedido recente dentro da janela segura de automação."
            : `Pedido histórico (${formatIdleDuration(idleMinutes)} atrás) — disponível apenas para envio assistido com 1 clique.`,
      },
      {
        code: "BUSINESS_HOURS_WINDOW",
        label: `Janela de Horário Comercial (${String(config.businessHoursStart).padStart(2, "0")}h às ${String(
          config.businessHoursEnd
        ).padStart(2, "0")}h BRT)`,
        passed: isWithinBusinessHours,
        blockingMode: "auto_only",
        detail: isWithinBusinessHours
          ? `Dentro do horário comercial (${currentBrtHour}h BRT).`
          : `Fora do horário comercial (${currentBrtHour}h BRT) — disparo automático aguarda as ${String(
              config.businessHoursStart
            ).padStart(2, "0")}h.`,
      },
    ];

    const canSendManual = safetyGuards
      .filter((g) => g.blockingMode === "both")
      .every((g) => g.passed);

    const canSendAutoNow =
      config.autoEnabled && safetyGuards.every((g) => g.passed);

    let primaryStatusBadge: EvaluatedRemarketingTarget["primaryStatusBadge"];
    if (paidMatch) {
      primaryStatusBadge = {
        code: "RECOVERED_IN_OTHER_ORDER",
        label: `Já Pago no Pedido #${paidMatch.orderNumber}`,
        tone: "emerald",
        explanation: `Trava anti-erro ativa: Este cliente já concluiu o pagamento no pedido #${paidMatch.orderNumber}. Nenhuma cobrança será enviada.`,
      };
    } else if (supersededMatch) {
      primaryStatusBadge = {
        code: "SUPERSEDED_DUPLICATE",
        label: `Substituído pelo #${supersededMatch.orderNumber}`,
        tone: "slate",
        explanation: `Trava anti-duplicidade: Este telefone/CPF gerou um pedido mais recente (#${supersededMatch.orderNumber}). O envio foi bloqueado neste registro antigo para não enviar duas mensagens.`,
      };
    } else if (!phoneNorm.valid || ord.totalCents <= 0) {
      primaryStatusBadge = {
        code: "INVALID_DATA",
        label: "Telefone Inválido / Bloqueado",
        tone: "rose",
        explanation: phoneNorm.reason || "Dados insuficientes para envio seguro.",
      };
    } else if (doNotDisturb) {
      primaryStatusBadge = {
        code: "DO_NOT_DISTURB",
        label: "Não Perturbar Ativo",
        tone: "rose",
        explanation: "Contato pausado manualmente pela equipe comercial.",
      };
    } else if (autoSentCount > 0 || manualSentCount > 0) {
      primaryStatusBadge = {
        code: "ALREADY_CONTACTED",
        label:
          lastMode === "auto"
            ? "1º Contato Automático Enviado"
            : "Contato Comercial Realizado",
        tone: "sky",
        explanation: `Mensagem já enviada via Comercial X-Point${
          lastSentAt ? ` em ${new Date(lastSentAt).toLocaleString("pt-BR")}` : ""
        }. Automático encerrado para este pedido (sem risco de loop).`,
      };
    } else if (canSendAutoNow) {
      primaryStatusBadge = {
        code: "ELIGIBLE_AUTO_NOW",
        label: "Elegível p/ Auto-Envio Agora",
        tone: "emerald",
        explanation: "Passou nas 10 validações de segurança. Pronto para disparo consultivo único.",
      };
    } else if (idleMinutes < config.minIdleMinutesBeforeAuto) {
      primaryStatusBadge = {
        code: "WAITING_IDLE_TIME",
        label: `Aguardando (${Math.round(idleMinutes)}/${config.minIdleMinutesBeforeAuto} min)`,
        tone: "amber",
        explanation: `Pedido criado recentemente. Aguardando completar ${config.minIdleMinutesBeforeAuto} min sem pagamento antes de abordar o cliente.`,
      };
    } else if (isPhoneInCooldownForAuto) {
      primaryStatusBadge = {
        code: "PHONE_COOLDOWN",
        label: `Cooldown Telefone (${config.phoneCooldownHours}h)`,
        tone: "amber",
        explanation: `Este número já recebeu contato recente há ${hoursSincePhoneLastSent.toFixed(1)}h.`,
      };
    } else {
      primaryStatusBadge = {
        code: "ELIGIBLE_ASSISTED",
        label: "Pronto p/ Recuperação (1 Clique)",
        tone: "indigo",
        explanation:
          "Validado contra duplicidade e pagamentos anteriores. Pronto para envio consultivo via Comercial X-Point.",
      };
    }

    const templates = buildRemarketingTemplates({
      customerFirstName: firstName,
      orderNumber: ord.orderNumber,
      productSummary: itemsSummary,
      totalCents: ord.totalCents,
      paymentMethod: ord.paymentMethod,
      checkoutUrl,
    });

    evaluatedTargets.push({
      targetId,
      targetType: "order",
      appwriteDocId: ord.appwriteDocId,
      orderNumber: ord.orderNumber,
      createdAt: ord.createdAt,
      idleMinutes,
      idleLabel: formatIdleDuration(idleMinutes),
      customerName: ord.customerName,
      customerFirstName: firstName,
      customerDocument: ord.customerDocument,
      customerEmail: ord.customerEmail,
      customerWhatsappRaw: ord.customerWhatsapp,
      phoneE164: phoneNorm.e164,
      phoneCoreKey: phoneNorm.coreKey,
      phoneValid: phoneNorm.valid,
      phoneValidationReason: phoneNorm.reason,
      cityState: ord.cityState,
      totalCents: ord.totalCents,
      paymentMethod: ord.paymentMethod,
      productSummary: itemsSummary,
      checkoutUrl,
      stage,
      doNotDisturb,
      commercialNotes: ledgerTarget?.commercialNotes || addrRemarketing.commercialNotes || "",
      autoSentCount,
      manualSentCount,
      lastSentAt,
      lastMode,
      alreadyPaidInOtherOrder: paidMatch,
      supersededByNewerOrder: supersededMatch,
      canSendManual,
      canSendAutoNow,
      primaryStatusBadge,
      safetyGuards,
      templates,
    });
  }

  // 6. Avalia leads de carrinho abandonado (que tenham telefone válido e ainda não tenham gerado pedido)
  for (const lead of abandonedCartLeads) {
    const phoneNorm = normalizeCustomerPhone(lead.customer_whatsapp || "");
    if (!phoneNorm.valid || !phoneNorm.coreKey) continue;
    // Se já está na lista de pedidos (pagos ou em aberto), não duplica como carrinho abandonado
    if (seenCartPhones.has(phoneNorm.coreKey)) continue;
    seenCartPhones.add(phoneNorm.coreKey);

    const targetId = `cart_lead:${lead.$id}`;
    const ledgerTarget = ledger.targets[targetId];
    const firstName = extractSafeCustomerFirstName(lead.customer_name || "Cliente");
    const paidMatch = paidByPhoneCore.get(phoneNorm.coreKey) || null;
    const doNotDisturb = Boolean(
      ledgerTarget?.doNotDisturb || ledger.phoneDoNotDisturb[phoneNorm.coreKey]
    );

    const autoSentCount = Number(ledgerTarget?.autoSentCount) || 0;
    const manualSentCount = Number(ledgerTarget?.manualSentCount) || 0;
    const createdAt = lead.$createdAt || new Date().toISOString();
    const idleMinutes = Math.max(0, (nowMs - new Date(createdAt).getTime()) / 60_000);
    const totalCents = Number(lead.cart_value_cents) || 169300;
    const productSummary = lead.product_summary || "Totem / Gabinete de Autoatendimento";

    let stage: CommercialRecoveryStage = ledgerTarget?.stage || "awaiting_contact";
    if (paidMatch) stage = "recovered";
    else if (doNotDisturb) stage = "do_not_disturb";
    else if (stage === "awaiting_contact" && (autoSentCount > 0 || manualSentCount > 0)) {
      stage = manualSentCount > 0 ? "manual_contacted" : "auto_contacted";
    }

    const canSendManual = !paidMatch && !doNotDisturb && phoneNorm.valid;
    const templates = buildRemarketingTemplates({
      customerFirstName: firstName,
      orderNumber: `CARRINHO-${String(lead.$id).slice(-6).toUpperCase()}`,
      productSummary,
      totalCents,
      paymentMethod: "pix",
      checkoutUrl: `${siteUrl}/#monte-seu-totem`,
      isCartLead: true,
    });

    evaluatedTargets.push({
      targetId,
      targetType: "cart_lead",
      appwriteDocId: lead.$id,
      orderNumber: `LEAD-${String(lead.$id).slice(-6).toUpperCase()}`,
      createdAt,
      idleMinutes,
      idleLabel: formatIdleDuration(idleMinutes),
      customerName: lead.customer_name || "Visitante Configurador",
      customerFirstName: firstName,
      customerDocument: lead.customer_document || "",
      customerEmail: lead.customer_email || "",
      customerWhatsappRaw: lead.customer_whatsapp || "",
      phoneE164: phoneNorm.e164,
      phoneCoreKey: phoneNorm.coreKey,
      phoneValid: phoneNorm.valid,
      cityState: lead.city && lead.region ? `${lead.city}/${lead.region}` : "Brasil",
      totalCents,
      paymentMethod: "pix",
      productSummary,
      checkoutUrl: `${siteUrl}/#monte-seu-totem`,
      stage,
      doNotDisturb,
      commercialNotes: ledgerTarget?.commercialNotes || "",
      autoSentCount,
      manualSentCount,
      lastSentAt: ledgerTarget?.lastSentAt,
      lastMode: ledgerTarget?.lastMode,
      alreadyPaidInOtherOrder: paidMatch,
      supersededByNewerOrder: null,
      canSendManual,
      canSendAutoNow: false,
      primaryStatusBadge: paidMatch
        ? {
            code: "RECOVERED_IN_OTHER_ORDER",
            label: `Já Comprou (#${paidMatch.orderNumber})`,
            tone: "emerald",
            explanation: `Lead já converteu no pedido #${paidMatch.orderNumber}.`,
          }
        : autoSentCount > 0 || manualSentCount > 0
        ? {
            code: "ALREADY_CONTACTED",
            label: "Contato Comercial Realizado",
            tone: "sky",
            explanation: "Lead já abordado via Comercial X-Point.",
          }
        : {
            code: "ELIGIBLE_ASSISTED",
            label: "Carrinho Abandonado • Pronto p/ Contato",
            tone: "indigo",
            explanation: "Lead capturado no configurador/checkout sem pedido finalizado.",
          },
      safetyGuards: [
        {
          code: "CROSS_ORDER_PAID_CHECK",
          label: "Verificação Cruzada de Pagamento",
          passed: !paidMatch,
          blockingMode: "both",
          detail: paidMatch
            ? `Cliente já pagou no pedido #${paidMatch.orderNumber}.`
            : "Sem pedido pago anterior.",
        },
        {
          code: "VALID_WHATSAPP_NUMBER",
          label: "Validação de WhatsApp Brasileiro",
          passed: phoneNorm.valid,
          blockingMode: "both",
          detail: `Número validado (${phoneNorm.e164}).`,
        },
      ],
      templates,
    });
  }

  // 7. Calcula KPIs comerciais
  const eligibleTargets = evaluatedTargets.filter((t) => t.canSendManual);
  const recoverableRevenueCents = eligibleTargets.reduce((acc, t) => acc + t.totalCents, 0);
  const alreadyRecoveredTargets = evaluatedTargets.filter((t) => Boolean(t.alreadyPaidInOtherOrder));
  const alreadyRecoveredCents = alreadyRecoveredTargets.reduce(
    (acc, t) => acc + (t.alreadyPaidInOtherOrder?.totalCents || t.totalCents),
    0
  );
  const blockedDuplicateOrPaidCount = evaluatedTargets.filter(
    (t) => Boolean(t.alreadyPaidInOtherOrder || t.supersededByNewerOrder)
  ).length;

  const autoSentTotalCount = ledger.history.filter((h) => h.mode === "auto" && h.ok).length;
  const manualSentTotalCount = ledger.history.filter((h) => h.mode === "manual" && h.ok).length;

  return {
    config,
    targets: evaluatedTargets,
    history: ledger.history,
    kpis: {
      totalUnpaidOrders: unpaidOrders.length,
      eligibleAssistedCount: eligibleTargets.length,
      eligibleAutoNowCount: evaluatedTargets.filter((t) => t.canSendAutoNow).length,
      recoverableRevenueCents,
      alreadyRecoveredCount: alreadyRecoveredTargets.length,
      alreadyRecoveredCents,
      blockedDuplicateOrPaidCount,
      autoSentTotalCount,
      manualSentTotalCount,
    },
  };
}

/**
 * Persiste metadados de remarketing dentro de delivery_address_json no Appwrite (além do ledger local),
 * garantindo que os dados sobrevivam a qualquer redeploy do container.
 */
async function syncOrderRemarketingToAppwrite(
  appwriteDocId: string | undefined,
  state: Partial<TargetRemarketingState>
) {
  if (!appwriteDocId) return;
  try {
    const db = getServerDatabases();
    const doc = await db.getDocument(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.collections.orders,
      appwriteDocId
    );
    let parsedAddr: any = {};
    try {
      if (doc.delivery_address_json) parsedAddr = JSON.parse(doc.delivery_address_json);
    } catch {}
    parsedAddr.remarketing = {
      ...(parsedAddr.remarketing || {}),
      ...state,
      updatedAt: new Date().toISOString(),
    };
    await db.updateDocument(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.collections.orders,
      appwriteDocId,
      {
        delivery_address_json: JSON.stringify(parsedAddr),
      }
    );
  } catch (err) {
    console.warn("Aviso ao sincronizar estado de remarketing no Appwrite:", err);
  }
}

/**
 * Executa o disparo seguro de uma mensagem de remarketing (Manual ou Automático)
 * SEMPRE pela instância "Comercial X-Point" após revalidar todas as travas.
 */
export async function dispatchRemarketingMessage(params: {
  targetId: string;
  mode: "auto" | "manual";
  templateId?: RemarketingTemplateId;
  customMessage?: string;
  actor?: string;
}): Promise<{
  ok: boolean;
  error?: string;
  instanceUsed: string;
  target?: EvaluatedRemarketingTarget;
  historyEntry?: RemarketingHistoryEntry;
}> {
  const { targetId, mode, templateId = "soft_support", customMessage, actor = "Comercial X-Point" } = params;

  if (inFlightTargetLocks.has(targetId)) {
    return {
      ok: false,
      error: "Envio já em andamento para este pedido. Aguarde a conclusão.",
      instanceUsed: COMMERCIAL_WHATSAPP_INSTANCE_NAME,
    };
  }

  inFlightTargetLocks.add(targetId);

  try {
    const evaluation = await evaluateOrdersAndCartsForRemarketing();
    const target = evaluation.targets.find((t) => t.targetId === targetId);

    if (!target) {
      return {
        ok: false,
        error: "Pedido ou carrinho não encontrado na fila de recuperação.",
        instanceUsed: COMMERCIAL_WHATSAPP_INSTANCE_NAME,
      };
    }

    // Revalidação estrita antes do disparo
    if (target.alreadyPaidInOtherOrder) {
      return {
        ok: false,
        error: `Envio bloqueado: O cliente ${target.customerName} já realizou o pagamento no pedido #${target.alreadyPaidInOtherOrder.orderNumber}.`,
        instanceUsed: COMMERCIAL_WHATSAPP_INSTANCE_NAME,
        target,
      };
    }

    if (target.supersededByNewerOrder) {
      return {
        ok: false,
        error: `Envio bloqueado: Existe um pedido mais recente (#${target.supersededByNewerOrder.orderNumber}) para este mesmo telefone/CPF. Envie apenas pelo pedido mais recente.`,
        instanceUsed: COMMERCIAL_WHATSAPP_INSTANCE_NAME,
        target,
      };
    }

    if (target.doNotDisturb) {
      return {
        ok: false,
        error: "Envio bloqueado: O cliente está marcado como 'Não Perturbar'.",
        instanceUsed: COMMERCIAL_WHATSAPP_INSTANCE_NAME,
        target,
      };
    }

    if (!target.phoneValid || !target.phoneE164) {
      return {
        ok: false,
        error: `Número de WhatsApp inválido (${target.phoneValidationReason || "Verifique o cadastro"}).`,
        instanceUsed: COMMERCIAL_WHATSAPP_INSTANCE_NAME,
        target,
      };
    }

    if (mode === "auto" && !target.canSendAutoNow) {
      return {
        ok: false,
        error: `Alvo não elegível para envio automático neste momento (${target.primaryStatusBadge.label}).`,
        instanceUsed: COMMERCIAL_WHATSAPP_INSTANCE_NAME,
        target,
      };
    }

    if (inFlightPhoneLocks.has(target.phoneCoreKey)) {
      return {
        ok: false,
        error: "Já existe um disparo em andamento para este número de telefone.",
        instanceUsed: COMMERCIAL_WHATSAPP_INSTANCE_NAME,
        target,
      };
    }

    // Trava adicional para envio manual: evita enviar 2 vezes em menos de 10 minutos para o mesmo telefone
    const ledger = readLedger();
    const lastPhoneSentIso = ledger.phoneLastSentAt[target.phoneCoreKey];
    if (lastPhoneSentIso) {
      const minutesSinceLast = (Date.now() - new Date(lastPhoneSentIso).getTime()) / 60_000;
      if (minutesSinceLast < 10) {
        return {
          ok: false,
          error: `Proteção anti-spam: Este número (${target.phoneE164}) já recebeu uma mensagem há ${Math.ceil(
            minutesSinceLast
          )} min. Aguarde pelo menos 10 minutos antes de enviar novamente.`,
          instanceUsed: COMMERCIAL_WHATSAPP_INSTANCE_NAME,
          target,
        };
      }
    }

    inFlightPhoneLocks.add(target.phoneCoreKey);

    try {
      const messageToSend =
        customMessage && customMessage.trim().length >= 15
          ? customMessage.trim()
          : target.templates[templateId] || target.templates.soft_support;

      const sendRes = await sendDirectWhatsAppToCustomer({
        customerName: target.customerName,
        customerWhatsapp: target.phoneE164,
        message: messageToSend,
        contextLabel: `Remarketing #${target.orderNumber} (${mode === "auto" ? "Automático" : "Assistido"})`,
        actor: `${actor} via ${COMMERCIAL_WHATSAPP_INSTANCE_NAME}`,
      });

      const nowIso = new Date().toISOString();
      const currentTargetState = ledger.targets[targetId] || {
        targetId,
        stage: "awaiting_contact",
        doNotDisturb: false,
        commercialNotes: target.commercialNotes || "",
        autoSentCount: target.autoSentCount || 0,
        manualSentCount: target.manualSentCount || 0,
        updatedAt: nowIso,
      };

      if (sendRes.ok) {
        if (mode === "auto") {
          currentTargetState.autoSentCount = (currentTargetState.autoSentCount || 0) + 1;
          if (currentTargetState.stage === "awaiting_contact") {
            currentTargetState.stage = "auto_contacted";
          }
        } else {
          currentTargetState.manualSentCount = (currentTargetState.manualSentCount || 0) + 1;
          if (
            currentTargetState.stage === "awaiting_contact" ||
            currentTargetState.stage === "auto_contacted"
          ) {
            currentTargetState.stage = "manual_contacted";
          }
        }
        currentTargetState.lastSentAt = nowIso;
        currentTargetState.lastTemplateId = templateId;
        currentTargetState.lastMode = mode;
        currentTargetState.updatedAt = nowIso;

        ledger.targets[targetId] = currentTargetState;
        ledger.phoneLastSentAt[target.phoneCoreKey] = nowIso;
      }

      const historyEntry: RemarketingHistoryEntry = {
        id: `rmk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        targetId,
        targetType: target.targetType,
        orderNumber: target.orderNumber,
        customerName: target.customerName,
        customerFirstName: target.customerFirstName,
        phoneE164: target.phoneE164,
        phoneCoreKey: target.phoneCoreKey,
        mode,
        templateId,
        messagePreview: messageToSend.slice(0, 220),
        instanceUsed: COMMERCIAL_WHATSAPP_INSTANCE_NAME,
        sentAt: nowIso,
        actor,
        ok: sendRes.ok,
        error: sendRes.error,
      };

      ledger.history = [historyEntry, ...(ledger.history || [])].slice(0, 250);
      writeLedger(ledger);

      if (sendRes.ok && target.targetType === "order" && target.appwriteDocId) {
        await syncOrderRemarketingToAppwrite(target.appwriteDocId, currentTargetState);
      }

      return {
        ok: sendRes.ok,
        error: sendRes.error,
        instanceUsed: COMMERCIAL_WHATSAPP_INSTANCE_NAME,
        target,
        historyEntry,
      };
    } finally {
      inFlightPhoneLocks.delete(target.phoneCoreKey);
    }
  } finally {
    inFlightTargetLocks.delete(targetId);
  }
}

/**
 * Varredura segura do Piloto Automático:
 * - Respeita horário comercial (08h às 20h BRT)
 * - Respeita limite de 1 mensagem por pedido e cooldown de 72h por telefone
 * - Dispara no máximo 1 mensagem por ciclo para nunca gerar rajadas
 */
export async function runSafeAutoRemarketingSweep(): Promise<{
  executed: boolean;
  sentCount: number;
  results: Array<{ orderNumber: string; phoneE164: string; ok: boolean; error?: string }>;
  reason?: string;
}> {
  if (isAutoSweepRunning) {
    return { executed: false, sentCount: 0, results: [], reason: "Varredura já em execução." };
  }

  isAutoSweepRunning = true;
  try {
    const evaluation = await evaluateOrdersAndCartsForRemarketing();
    if (!evaluation.config.autoEnabled) {
      return { executed: false, sentCount: 0, results: [], reason: "Piloto automático pausado." };
    }

    const eligibleNow = evaluation.targets.filter((t) => t.canSendAutoNow);
    if (eligibleNow.length === 0) {
      return {
        executed: true,
        sentCount: 0,
        results: [],
        reason: "Nenhum pedido novo elegível para disparo automático neste instante.",
      };
    }

    // Dispara no máximo 1 por ciclo de varredura para máxima segurança operacional
    const nextTarget = eligibleNow[0];
    const res = await dispatchRemarketingMessage({
      targetId: nextTarget.targetId,
      mode: "auto",
      templateId: "soft_support",
      actor: "Piloto Automático (Comercial X-Point)",
    });

    return {
      executed: true,
      sentCount: res.ok ? 1 : 0,
      results: [
        {
          orderNumber: nextTarget.orderNumber,
          phoneE164: nextTarget.phoneE164,
          ok: res.ok,
          error: res.error,
        },
      ],
    };
  } finally {
    isAutoSweepRunning = false;
  }
}

/**
 * Atualiza configurações do motor de remarketing.
 */
export function updateRemarketingConfig(patch: Partial<RemarketingConfig>): RemarketingConfig {
  const ledger = readLedger();
  const wasAutoEnabled = ledger.config.autoEnabled;
  const nextAutoEnabled =
    patch.autoEnabled !== undefined ? Boolean(patch.autoEnabled) : wasAutoEnabled;

  // Se acabou de religar o automático, atualiza o timestamp de corte para não disparar em pedidos antigos
  const autoEnabledSinceIso =
    !wasAutoEnabled && nextAutoEnabled
      ? new Date().toISOString()
      : patch.autoEnabledSinceIso || ledger.config.autoEnabledSinceIso;

  ledger.config = {
    ...ledger.config,
    ...patch,
    autoEnabled: nextAutoEnabled,
    autoEnabledSinceIso,
    minIdleMinutesBeforeAuto: Math.max(
      15,
      Math.min(1440, Number(patch.minIdleMinutesBeforeAuto ?? ledger.config.minIdleMinutesBeforeAuto) || 45)
    ),
    maxOrderAgeHoursForAuto: Math.max(
      2,
      Math.min(168, Number(patch.maxOrderAgeHoursForAuto ?? ledger.config.maxOrderAgeHoursForAuto) || 24)
    ),
    phoneCooldownHours: Math.max(
      12,
      Math.min(720, Number(patch.phoneCooldownHours ?? ledger.config.phoneCooldownHours) || 72)
    ),
    businessHoursStart: Math.max(
      6,
      Math.min(20, Number(patch.businessHoursStart ?? ledger.config.businessHoursStart) || 8)
    ),
    businessHoursEnd: Math.max(
      12,
      Math.min(22, Number(patch.businessHoursEnd ?? ledger.config.businessHoursEnd) || 20)
    ),
    maxAutoMessagesPerTarget: 1,
    instanceName: COMMERCIAL_WHATSAPP_INSTANCE_NAME,
    instanceId: COMMERCIAL_WHATSAPP_INSTANCE_ID,
    instancePhone: COMMERCIAL_WHATSAPP_NUMBER,
  };

  writeLedger(ledger);
  return ledger.config;
}

/**
 * Atualiza etapa comercial, notas ou flag Não Perturbar de um pedido/carrinho.
 */
export async function updateTargetCommercialState(params: {
  targetId: string;
  appwriteDocId?: string;
  phoneCoreKey?: string;
  stage?: CommercialRecoveryStage;
  doNotDisturb?: boolean;
  commercialNotes?: string;
}): Promise<TargetRemarketingState> {
  const ledger = readLedger();
  const nowIso = new Date().toISOString();
  const existing = ledger.targets[params.targetId] || {
    targetId: params.targetId,
    stage: "awaiting_contact" as CommercialRecoveryStage,
    doNotDisturb: false,
    commercialNotes: "",
    autoSentCount: 0,
    manualSentCount: 0,
    updatedAt: nowIso,
  };

  if (params.stage !== undefined) existing.stage = params.stage;
  if (params.doNotDisturb !== undefined) {
    existing.doNotDisturb = Boolean(params.doNotDisturb);
    if (existing.doNotDisturb) {
      existing.stage = "do_not_disturb";
    } else if (existing.stage === "do_not_disturb") {
      existing.stage =
        existing.manualSentCount > 0
          ? "manual_contacted"
          : existing.autoSentCount > 0
          ? "auto_contacted"
          : "awaiting_contact";
    }
    if (params.phoneCoreKey) {
      ledger.phoneDoNotDisturb[params.phoneCoreKey] = existing.doNotDisturb;
    }
  }
  if (params.commercialNotes !== undefined) {
    existing.commercialNotes = String(params.commercialNotes).slice(0, 1000);
  }
  existing.updatedAt = nowIso;

  ledger.targets[params.targetId] = existing;
  writeLedger(ledger);

  if (params.targetId.startsWith("order:") && params.appwriteDocId) {
    await syncOrderRemarketingToAppwrite(params.appwriteDocId, existing);
  }

  try {
    logEcosystemEvent({
      category: "orders",
      level: "info",
      action: "Gestão Comercial / Remarketing Atualizada",
      target: params.targetId,
      details: `Etapa: ${existing.stage} | Não Perturbar: ${existing.doNotDisturb} | Notas: ${
        existing.commercialNotes ? "Atualizadas" : "S/ notas"
      }`,
      actor: "Comercial X-Point",
    });
  } catch {}

  return existing;
}

export { checkCommercialWhatsAppStatus };
