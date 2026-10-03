import { NextResponse } from "next/server";
import { analyticsServerStore } from "@/lib/analytics/serverStore";

export async function GET() {
  try {
    const funnelMetrics = analyticsServerStore.calculateFunnelMetrics();
    const eventCounts = analyticsServerStore.getCounts();
    const recentEvents = analyticsServerStore.getRecentEvents(30);

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      funnel: funnelMetrics,
      counts: eventCounts,
      recentEvents,
    });
  } catch (error: any) {
    console.error("[Analytics API Funnel Error]:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Erro ao processar métricas do funil" },
      { status: 500 }
    );
  }
}
