import { NextRequest, NextResponse } from "next/server";
import { googleAdsAnalyticsStore } from "@/lib/analytics/googleAdsStore";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateFilter = searchParams.get("date") || "ALL";
    const campaignId = searchParams.get("campaignId") || "ALL";
    const adGroupFilter = searchParams.get("adGroup") || "ALL";
    const matchTypeFilter = searchParams.get("matchType") || "ALL";
    const onlyConversions = searchParams.get("onlyConversions") === "true";
    const onlyClicks = searchParams.get("onlyClicks") === "true";
    const search = searchParams.get("search") || "";
    const autoSync = searchParams.get("sync") === "true";

    if (autoSync) {
      await googleAdsAnalyticsStore.syncWithLiveGoogleAdsApi();
    }

    const data = googleAdsAnalyticsStore.getFilteredDashboardData({
      dateFilter,
      campaignId,
      adGroupFilter,
      matchTypeFilter,
      onlyConversions,
      onlyClicks,
      search,
    });

    return NextResponse.json({
      success: true,
      ...data,
    });
  } catch (err: any) {
    console.error("[API /api/analytics/google-ads GET]", err);
    return NextResponse.json(
      { error: "Falha ao carregar inteligência do Google Ads.", details: err?.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === "sync_live_api") {
      const result = await googleAdsAnalyticsStore.syncWithLiveGoogleAdsApi({
        startDate: body.startDate,
        endDate: body.endDate,
        campaignId: body.campaignId,
      });
      const data = googleAdsAnalyticsStore.getFilteredDashboardData(body.filters);
      return NextResponse.json({
        success: true,
        synced: result.synced,
        syncMessage: result.message,
        ...data,
      });
    }

    if (action === "save_optimization") {
      const saved = googleAdsAnalyticsStore.saveOptimization(body.optimization);
      const data = googleAdsAnalyticsStore.getFilteredDashboardData(body.filters);
      return NextResponse.json({
        success: true,
        optimization: saved,
        ...data,
      });
    }

    if (action === "delete_optimization") {
      const deleted = googleAdsAnalyticsStore.deleteOptimization(body.id);
      const data = googleAdsAnalyticsStore.getFilteredDashboardData(body.filters);
      return NextResponse.json({
        success: deleted,
        ...data,
      });
    }

    if (action === "save_conversion_detail") {
      const saved = googleAdsAnalyticsStore.saveConversionDetail(body.conversion);
      const data = googleAdsAnalyticsStore.getFilteredDashboardData(body.filters);
      return NextResponse.json({
        success: true,
        conversion: saved,
        ...data,
      });
    }

    if (action === "import_report") {
      if (!body.rawText || typeof body.rawText !== "string") {
        return NextResponse.json({ error: "Texto do relatório é obrigatório." }, { status: 400 });
      }
      const saved = googleAdsAnalyticsStore.importRawReportText(body.rawText, body.reportDate);
      const data = googleAdsAnalyticsStore.getFilteredDashboardData(body.filters);
      return NextResponse.json({
        success: true,
        optimization: saved,
        ...data,
      });
    }

    return NextResponse.json({ error: "Ação desconhecida." }, { status: 400 });
  } catch (err: any) {
    console.error("[API /api/analytics/google-ads POST]", err);
    return NextResponse.json(
      { error: "Falha ao processar comando do Google Ads.", details: err?.message },
      { status: 500 }
    );
  }
}
