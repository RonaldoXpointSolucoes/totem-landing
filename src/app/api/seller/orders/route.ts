import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/session";
import { findUserByEmail } from "@/lib/auth/whitelistStore";
import { getVoucherUsagesBySeller } from "@/lib/vouchers/voucherStore";

export interface SellerOrderRecord {
  id: string;
  orderNumber: string;
  createdAt: string;
  customerName: string;
  cabinetName: string;
  cabinetQuantity: number;
  cabinetSubtotalCents: number;
  discountCents: number;
  sellerCommissionCents: number;
  status: string;
  isPaid: boolean;
  payoutStatus: "pending" | "approved" | "paid" | "cancelled";
  payoutProof?: string;
  paidAt?: string;
  campaignChannel?: string;
  campaignMedium?: string;
  campaignName?: string;
}

export async function GET() {
  const session = await getAuthSession();

  if (!session) {
    return NextResponse.json({ ok: false, error: "Acesso não autorizado." }, { status: 401 });
  }

  // Busca dados mais recentes do vendedor
  const user = await findUserByEmail(session.email);
  if (!user || user.status !== "active") {
    return NextResponse.json({ ok: false, error: "Usuário inativo ou não encontrado." }, { status: 403 });
  }

  const couponCode = user.couponCode?.toUpperCase();

  // Consulta histórico auditado real de utilização do cupom deste influenciador/vendedor
  const voucherUsages = couponCode ? await getVoucherUsagesBySeller(couponCode) : [];

  const ordersList: SellerOrderRecord[] = voucherUsages.map((usage) => {
    const isPaid =
      usage.orderStatus === "paid" ||
      usage.orderStatus === "in_production" ||
      usage.orderStatus === "ready" ||
      usage.orderStatus === "shipped" ||
      usage.orderStatus === "delivered";

    // Mascara o nome do cliente para conformidade e privacidade comercial
    const parts = (usage.customer?.name || "Cliente").trim().split(" ");
    const maskedName = parts.length > 1 ? `${parts[0]} ${parts[1].charAt(0)}.` : parts[0];

    return {
      id: usage.id,
      orderNumber: usage.orderNumber,
      createdAt: usage.usedAt,
      customerName: maskedName,
      cabinetName: "Gabinete CNC Homologado",
      cabinetQuantity: 1,
      cabinetSubtotalCents: usage.financials.eligibleCabinetBaseCents,
      discountCents: usage.financials.discountCents,
      sellerCommissionCents: usage.financials.influencerCommissionCents,
      status: usage.orderStatus,
      isPaid,
      payoutStatus: usage.financials.payoutStatus,
      payoutProof: usage.financials.payoutProof,
      paidAt: usage.financials.paidAt,
      campaignChannel: usage.campaignTracking.utmSource || "Direto",
      campaignMedium: usage.campaignTracking.utmMedium,
      campaignName: usage.campaignTracking.utmCampaign,
    };
  });

  // Métricas financeiras soberanas
  const totalSalesCents = ordersList.reduce((acc, curr) => acc + curr.cabinetSubtotalCents, 0);
  const totalCommissionCents = ordersList.reduce((acc, curr) => acc + curr.sellerCommissionCents, 0);
  const paidCommissionCents = ordersList
    .filter((o) => o.payoutStatus === "paid")
    .reduce((acc, curr) => acc + curr.sellerCommissionCents, 0);
  const approvedCommissionCents = ordersList
    .filter((o) => o.payoutStatus === "approved")
    .reduce((acc, curr) => acc + curr.sellerCommissionCents, 0);
  const pendingCommissionCents = ordersList
    .filter((o) => o.payoutStatus === "pending")
    .reduce((acc, curr) => acc + curr.sellerCommissionCents, 0);

  return NextResponse.json({
    ok: true,
    seller: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      couponCode: user.couponCode,
      discountPercent: user.discountPercent || 10,
      commissionPercent: user.commissionPercent || 8,
      pixKey: user.pixKey,
      phone: user.phone,
    },
    metrics: {
      totalCabinetsSold: ordersList.length,
      totalSalesCents: totalSalesCents || user.totalSalesCents || 0,
      totalCommissionCents: totalCommissionCents || user.totalCommissionCents || 0,
      confirmedCommissionCents: paidCommissionCents,
      approvedCommissionCents,
      pendingCommissionCents,
    },
    orders: ordersList,
  });
}
