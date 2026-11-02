import { NextRequest, NextResponse } from "next/server";
import { analyticsServerStore } from "@/lib/analytics/serverStore";
import { ANALYTICS_EVENTS, AnalyticsEventType } from "@/lib/analytics/events";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { eventName, sessionId, metadata } = body;

    if (!eventName || !Object.values(ANALYTICS_EVENTS).includes(eventName as AnalyticsEventType)) {
      return NextResponse.json(
        { ok: false, error: "Nome de evento de telemetria inválido ou não suportado" },
        { status: 400 }
      );
    }

    const rawForwarded = req.headers.get("x-forwarded-for") || "";
    const firstForwardedIp = rawForwarded.split(",")[0]?.trim() || "";
    const ip =
      req.headers.get("cf-connecting-ip")?.trim() ||
      req.headers.get("x-real-ip")?.trim() ||
      firstForwardedIp ||
      "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || undefined;
    const cfCity =
      req.headers.get("cf-ipcity") ||
      req.headers.get("x-vercel-ip-city") ||
      undefined;
    const cfRegion =
      req.headers.get("cf-region-code") ||
      req.headers.get("x-vercel-ip-country-region") ||
      undefined;

    const recorded = await analyticsServerStore.recordEvent({
      eventName: eventName as AnalyticsEventType,
      sessionId: sessionId || "unknown-session",
      timestamp: new Date().toISOString(),
      metadata: {
        ...(metadata || {}),
        ...(cfCity && !(metadata as any)?.city ? { geoIpCity: cfCity } : {}),
        ...(cfRegion && !(metadata as any)?.state ? { geoIpState: cfRegion } : {}),
      },
      ip,
      userAgent,
    });

    return NextResponse.json({ ok: true, eventId: recorded.id });
  } catch (error: any) {
    console.error("[Analytics API Track Error]:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Erro ao registrar evento de telemetria" },
      { status: 500 }
    );
  }
}
