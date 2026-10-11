export type VoucherPayoutStatus = "pending" | "approved" | "paid" | "cancelled";

export interface CampaignTrackingData {
  hasTracking: boolean;
  landingUrl?: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  refCode?: string;
  device?: "mobile" | "desktop" | "tablet";
  capturedAt: string;
}

export interface VoucherUsageCustomer {
  name: string;
  email: string;
  whatsapp: string;
  document?: string;
  city: string;
  state: string;
}

export interface VoucherUsageInfluencer {
  sellerId: string;
  name: string;
  email: string;
  pixKey?: string;
  phone?: string;
  commissionPercent: number;
}

export interface VoucherUsageFinancials {
  grossItemsTotalCents: number;
  eligibleCabinetBaseCents: number;
  discountPercent: number;
  discountCents: number;
  shippingCents: number;
  finalOrderTotalCents: number;
  influencerCommissionCents: number;
  payoutStatus: VoucherPayoutStatus;
  paidAt?: string;
  payoutProof?: string;
  payoutNotes?: string;
}

export interface VoucherUsageRecord {
  id: string;
  voucherCode: string;
  orderId: string;
  orderNumber: string;
  usedAt: string;
  orderStatus: string;
  customer: VoucherUsageCustomer;
  influencer: VoucherUsageInfluencer;
  financials: VoucherUsageFinancials;
  campaignTracking: CampaignTrackingData;
}

export interface VoucherSummaryMetrics {
  totalUsages: number;
  totalDiscountCents: number;
  totalCabinetSalesCents: number;
  totalOrderRevenueCents: number;
  totalCommissionCents: number;
  pendingCommissionCents: number;
  approvedCommissionCents: number;
  paidCommissionCents: number;
  topInfluencers: Array<{
    name: string;
    couponCode: string;
    salesCount: number;
    commissionCents: number;
    pixKey?: string;
  }>;
  topSources: Array<{
    source: string;
    count: number;
    revenueCents: number;
  }>;
}

export interface VoucherFilterOptions {
  voucherCode?: string;
  sellerId?: string;
  payoutStatus?: VoucherPayoutStatus | "all";
  source?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}
