import { NextResponse } from "next/server";
import { adsLeadsCartsStore } from "@/lib/analytics/adsLeadsCartsStore";
import { googleAdsStore } from "@/lib/analytics/googleAdsStore";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const force = searchParams.get("refresh") === "true";

    const records = await adsLeadsCartsStore.listRecords(force);
    const adsSummary = googleAdsStore.getSummary();

    const abandonedCarts = records.filter((r) => r.recordType === "abandoned_cart");
    const checkoutLeads = records.filter((r) => r.recordType === "checkout_lead");
    const whatsappLeads = records.filter((r) => r.recordType === "whatsapp_conversion");
    const purchases = records.filter(
      (r) => r.recordType === "purchase_conversion" || r.status === "converted_order"
    );

    const totalCartValueCents = abandonedCarts.reduce(
      (acc, r) => acc + (r.cart.totalCents || 0),
      0
    );
    const totalFunnelValueCents = records.reduce(
      (acc, r) => acc + (r.cart.totalCents || 0),
      0
    );

    return NextResponse.json({
      success: true,
      records,
      summary: {
        totalRecords: records.length,
        totalConversions: records.reduce((acc, r) => acc + (r.conversionsCount || 1), 0),
        abandonedCartsCount: abandonedCarts.length,
        checkoutLeadsCount: checkoutLeads.length,
        whatsappLeadsCount: whatsappLeads.length,
        purchasesCount: purchases.length,
        totalCartValueCents,
        totalFunnelValueCents,
        campaignCostBrl: adsSummary.totals.cost,
        campaignCpaBrl: adsSummary.totals.cpa,
        campaignClicks: adsSummary.totals.clicks,
        campaignImpressions: adsSummary.totals.impressions,
        lastSyncAt: adsSummary.campaign.lastSyncAt,
      },
    });
  } catch (error: any) {
    console.error("[GET /api/admin/ads-leads] Error:", error);
    return NextResponse.json(
      { error: "Falha ao carregar conversões e carrinhos ADS." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, status, commercialNotes, customer, linkedOrderNumber } = body;

    if (!id) {
      return NextResponse.json({ error: "ID do registro é obrigatório." }, { status: 400 });
    }

    const updated = await adsLeadsCartsStore.updateRecord(id, {
      status,
      commercialNotes,
      customer,
      linkedOrderNumber,
    });

    if (!updated) {
      return NextResponse.json({ error: "Registro não encontrado." }, { status: 404 });
    }

    return NextResponse.json({ success: true, record: updated });
  } catch (error: any) {
    console.error("[PATCH /api/admin/ads-leads] Error:", error);
    return NextResponse.json(
      { error: "Falha ao atualizar registro ADS." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID obrigatório." }, { status: 400 });
    }

    await adsLeadsCartsStore.deleteRecord(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[DELETE /api/admin/ads-leads] Error:", error);
    return NextResponse.json(
      { error: "Falha ao remover registro ADS." },
      { status: 500 }
    );
  }
}
