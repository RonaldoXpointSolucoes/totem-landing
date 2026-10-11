import fs from "fs";
import path from "path";
import {
  VoucherUsageRecord,
  VoucherFilterOptions,
  VoucherSummaryMetrics,
  VoucherPayoutStatus,
} from "@/types/voucher";

const DATA_DIR = path.join(process.cwd(), "src", "data");
const VOUCHER_STORAGE_FILE = path.join(DATA_DIR, "voucher_usages.json");

// Registro inicial de referência alinhado aos dados de whitelist
const INITIAL_VOUCHER_USAGES: VoucherUsageRecord[] = [
  {
    id: "vch_1791750000000_carl",
    voucherCode: "CARLOS10",
    orderId: "ord_1791750000000_demo",
    orderNumber: "TOT-2026-CARL01",
    usedAt: "2026-10-11T16:20:00.000Z",
    orderStatus: "paid",
    customer: {
      name: "Mariana Costa Alvarenga",
      email: "mariana.alvarenga@techfood.com.br",
      whatsapp: "(11) 97123-4567",
      document: "38.291.849/0001-02",
      city: "São Paulo",
      state: "SP",
    },
    influencer: {
      sellerId: "user-seller-demo",
      name: "Carlos Vendedor",
      email: "vendedor@totempro.com.br",
      pixKey: "11988887777",
      phone: "(11) 98888-7777",
      commissionPercent: 8,
    },
    financials: {
      grossItemsTotalCents: 460200,
      eligibleCabinetBaseCents: 99000,
      discountPercent: 10,
      discountCents: 9900,
      shippingCents: 0,
      finalOrderTotalCents: 450300,
      influencerCommissionCents: 7920,
      payoutStatus: "approved",
      payoutNotes: "Pedido pago via Pix. Comissão liberada para transferência.",
    },
    campaignTracking: {
      hasTracking: true,
      landingUrl:
        "https://totempro.com.br/monte-seu-totem?cupom=CARLOS10&utm_source=instagram&utm_medium=stories&utm_campaign=stories_carlos10",
      referrer: "https://l.instagram.com/",
      utmSource: "instagram",
      utmMedium: "stories",
      utmCampaign: "stories_carlos10",
      refCode: "CARLOS10",
      device: "mobile",
      capturedAt: "2026-10-11T16:15:30.000Z",
    },
  },
];

function ensureStorage(): VoucherUsageRecord[] {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (!fs.existsSync(VOUCHER_STORAGE_FILE)) {
      fs.writeFileSync(
        VOUCHER_STORAGE_FILE,
        JSON.stringify(INITIAL_VOUCHER_USAGES, null, 2),
        "utf-8"
      );
      return INITIAL_VOUCHER_USAGES;
    }

    const content = fs.readFileSync(VOUCHER_STORAGE_FILE, "utf-8");
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return INITIAL_VOUCHER_USAGES;
  } catch (err) {
    console.error("Erro ao ler voucher_usages.json:", err);
    return INITIAL_VOUCHER_USAGES;
  }
}

function saveStorage(records: VoucherUsageRecord[]): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(VOUCHER_STORAGE_FILE, JSON.stringify(records, null, 2), "utf-8");
  } catch (err) {
    console.error("Erro ao salvar voucher_usages.json:", err);
  }
}

/**
 * Registra formalmente uma nova utilização soberana de voucher no pedido
 */
export async function recordVoucherUsage(
  data: Omit<VoucherUsageRecord, "id" | "usedAt">
): Promise<VoucherUsageRecord> {
  const records = ensureStorage();

  const newRecord: VoucherUsageRecord = {
    ...data,
    id: `vch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    usedAt: new Date().toISOString(),
  };

  records.unshift(newRecord);
  saveStorage(records);
  return newRecord;
}

/**
 * Retorna todos os registros de utilização com suporte a filtros avançados
 */
export async function getAllVoucherUsages(
  filters?: VoucherFilterOptions
): Promise<VoucherUsageRecord[]> {
  const records = ensureStorage();

  if (!filters) return records;

  return records.filter((r) => {
    if (filters.voucherCode && r.voucherCode.toUpperCase() !== filters.voucherCode.toUpperCase()) {
      return false;
    }
    if (filters.sellerId && r.influencer.sellerId !== filters.sellerId) {
      return false;
    }
    if (filters.payoutStatus && filters.payoutStatus !== "all" && r.financials.payoutStatus !== filters.payoutStatus) {
      return false;
    }
    if (filters.source && r.campaignTracking.utmSource?.toLowerCase() !== filters.source.toLowerCase()) {
      return false;
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const matchesSearch =
        r.voucherCode.toLowerCase().includes(q) ||
        r.orderNumber.toLowerCase().includes(q) ||
        r.customer.name.toLowerCase().includes(q) ||
        r.customer.email.toLowerCase().includes(q) ||
        r.influencer.name.toLowerCase().includes(q) ||
        (r.campaignTracking.utmCampaign && r.campaignTracking.utmCampaign.toLowerCase().includes(q)) ||
        (r.campaignTracking.utmSource && r.campaignTracking.utmSource.toLowerCase().includes(q));

      if (!matchesSearch) return false;
    }
    return true;
  });
}

/**
 * Retorna as utilizações de voucher de um influenciador/vendedor específico
 */
export async function getVoucherUsagesBySeller(
  sellerEmailOrCoupon: string
): Promise<VoucherUsageRecord[]> {
  const records = ensureStorage();
  const normalized = sellerEmailOrCoupon.trim().toUpperCase();

  return records.filter(
    (r) =>
      r.voucherCode.toUpperCase() === normalized ||
      r.influencer.email.toUpperCase() === normalized ||
      r.influencer.sellerId.toUpperCase() === normalized
  );
}

/**
 * Atualiza o status financeiro de repasse de uma comissão de influenciador
 */
export async function updateVoucherPayout(
  usageId: string,
  update: {
    payoutStatus: VoucherPayoutStatus;
    payoutProof?: string;
    payoutNotes?: string;
    paidAt?: string;
  }
): Promise<VoucherUsageRecord | null> {
  const records = ensureStorage();
  const index = records.findIndex((r) => r.id === usageId);

  if (index === -1) return null;

  const current = records[index];
  const paidAt =
    update.payoutStatus === "paid"
      ? update.paidAt || new Date().toISOString()
      : current.financials.paidAt;

  records[index] = {
    ...current,
    financials: {
      ...current.financials,
      payoutStatus: update.payoutStatus,
      paidAt,
      payoutProof: update.payoutProof ?? current.financials.payoutProof,
      payoutNotes: update.payoutNotes ?? current.financials.payoutNotes,
    },
  };

  saveStorage(records);
  return records[index];
}

/**
 * Sincroniza o status do pedido com o status do voucher (ex: quando pedido for pago via Pix)
 */
export async function syncOrderStatusToVoucherUsage(
  orderNumberOrId: string,
  newOrderStatus: string
): Promise<void> {
  const records = ensureStorage();
  let changed = false;

  for (let i = 0; i < records.length; i++) {
    if (
      records[i].orderNumber === orderNumberOrId ||
      records[i].orderId === orderNumberOrId
    ) {
      records[i].orderStatus = newOrderStatus;
      changed = true;

      // Se o pedido foi liquidado / aprovado, a comissão que estava pendente é liberada para pagamento
      if (
        (newOrderStatus === "paid" ||
          newOrderStatus === "in_production" ||
          newOrderStatus === "ready" ||
          newOrderStatus === "shipped" ||
          newOrderStatus === "delivered") &&
        records[i].financials.payoutStatus === "pending"
      ) {
        records[i].financials.payoutStatus = "approved";
        records[i].financials.payoutNotes = `Comissão aprovada após confirmação do pedido (${newOrderStatus}). Pronto para pagamento via Pix.`;
      } else if (newOrderStatus === "cancelled") {
        records[i].financials.payoutStatus = "cancelled";
        records[i].financials.payoutNotes = "Pedido cancelado pelo cliente ou estornado.";
      }
    }
  }

  if (changed) {
    saveStorage(records);
  }
}

/**
 * Calcula métricas resumidas financeiras e de tracking de vouchers
 */
export async function getVoucherSummaryMetrics(): Promise<VoucherSummaryMetrics> {
  const records = ensureStorage();

  let totalUsages = 0;
  let totalDiscountCents = 0;
  let totalCabinetSalesCents = 0;
  let totalOrderRevenueCents = 0;
  let totalCommissionCents = 0;
  let pendingCommissionCents = 0;
  let approvedCommissionCents = 0;
  let paidCommissionCents = 0;

  const influencerMap = new Map<
    string,
    {
      name: string;
      couponCode: string;
      salesCount: number;
      commissionCents: number;
      pixKey?: string;
    }
  >();

  const sourceMap = new Map<string, { count: number; revenueCents: number }>();

  for (const r of records) {
    totalUsages++;
    totalDiscountCents += r.financials.discountCents || 0;
    totalCabinetSalesCents += r.financials.eligibleCabinetBaseCents || 0;
    totalOrderRevenueCents += r.financials.finalOrderTotalCents || 0;
    totalCommissionCents += r.financials.influencerCommissionCents || 0;

    switch (r.financials.payoutStatus) {
      case "pending":
        pendingCommissionCents += r.financials.influencerCommissionCents || 0;
        break;
      case "approved":
        approvedCommissionCents += r.financials.influencerCommissionCents || 0;
        break;
      case "paid":
        paidCommissionCents += r.financials.influencerCommissionCents || 0;
        break;
    }

    // Agrupamento por Influencer
    const infKey = r.influencer.sellerId || r.voucherCode;
    const existingInf = influencerMap.get(infKey) || {
      name: r.influencer.name,
      couponCode: r.voucherCode,
      salesCount: 0,
      commissionCents: 0,
      pixKey: r.influencer.pixKey,
    };
    existingInf.salesCount++;
    existingInf.commissionCents += r.financials.influencerCommissionCents || 0;
    influencerMap.set(infKey, existingInf);

    // Agrupamento por Canal / UTM Source
    const sourceKey = r.campaignTracking.utmSource || "Direto / Orgânico";
    const existingSrc = sourceMap.get(sourceKey) || { count: 0, revenueCents: 0 };
    existingSrc.count++;
    existingSrc.revenueCents += r.financials.finalOrderTotalCents || 0;
    sourceMap.set(sourceKey, existingSrc);
  }

  const topInfluencers = Array.from(influencerMap.values()).sort(
    (a, b) => b.commissionCents - a.commissionCents
  );

  const topSources = Array.from(sourceMap.entries()).map(([source, val]) => ({
    source,
    count: val.count,
    revenueCents: val.revenueCents,
  }));

  return {
    totalUsages,
    totalDiscountCents,
    totalCabinetSalesCents,
    totalOrderRevenueCents,
    totalCommissionCents,
    pendingCommissionCents,
    approvedCommissionCents,
    paidCommissionCents,
    topInfluencers,
    topSources,
  };
}
