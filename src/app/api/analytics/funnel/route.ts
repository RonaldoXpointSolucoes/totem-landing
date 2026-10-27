import { NextRequest, NextResponse } from "next/server";
import { analyticsServerStore, FunnelFilterOptions } from "@/lib/analytics/serverStore";
import { getServerDatabases } from "@/lib/appwrite/server";
import { APPWRITE_CONFIG } from "@/lib/appwrite/config";
import { Query } from "node-appwrite";

async function fetchRealOrdersSummary() {
  try {
    const db = getServerDatabases();
    const res = await db.listDocuments(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.collections.orders,
      [Query.orderDesc("$createdAt"), Query.limit(100)]
    );

    const docs = res.documents || [];
    let totalOrders = 0;
    let paidOrders = 0;
    let awaitingPaymentOrders = 0;
    let totalGmvCents = 0;
    let paidRevenueCents = 0;

    for (const doc of docs) {
      if (doc.status === "cancelled") continue;
      totalOrders += 1;
      const amount = Number(doc.total_cents || 0);
      totalGmvCents += amount;

      if (
        doc.status === "paid" ||
        doc.status === "in_production" ||
        doc.status === "ready" ||
        doc.status === "shipped" ||
        doc.status === "delivered"
      ) {
        paidOrders += 1;
        paidRevenueCents += amount;
      } else if (doc.status === "awaiting_payment" || doc.status === "custom_approved") {
        awaitingPaymentOrders += 1;
      }
    }

    const averageTicketCents = totalOrders > 0 ? Math.round(totalGmvCents / totalOrders) : 0;

    return {
      totalOrders,
      paidOrders,
      awaitingPaymentOrders,
      totalGmvCents,
      paidRevenueCents,
      averageTicketCents,
    };
  } catch {
    return {
      totalOrders: 0,
      paidOrders: 0,
      awaitingPaymentOrders: 0,
      totalGmvCents: 0,
      paidRevenueCents: 0,
      averageTicketCents: 0,
    };
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const period = (searchParams.get("period") as FunnelFilterOptions["period"]) || "all";
    const device = (searchParams.get("device") as FunnelFilterOptions["device"]) || "all";
    const search = searchParams.get("search") || undefined;

    const filterOpts: FunnelFilterOptions = { period, device, search };

    const [funnelMetrics, eventCounts, recentEvents, snapshots, improvements, commercial] =
      await Promise.all([
        Promise.resolve(analyticsServerStore.calculateFunnelMetrics(filterOpts)),
        Promise.resolve(analyticsServerStore.getCounts(filterOpts)),
        Promise.resolve(analyticsServerStore.getRecentEvents(60, filterOpts)),
        Promise.resolve(analyticsServerStore.getSnapshots()),
        Promise.resolve(analyticsServerStore.getImprovements()),
        fetchRealOrdersSummary(),
      ]);

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      filters: { period, device, search: search || "" },
      funnel: funnelMetrics,
      counts: eventCounts,
      recentEvents,
      snapshots,
      improvements,
      commercial,
    });
  } catch (error: any) {
    console.error("[Analytics API Funnel GET Error]:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Erro ao processar métricas do funil" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "save_snapshot") {
      const commercial = await fetchRealOrdersSummary();
      const snapshot = analyticsServerStore.createSnapshot({
        title: body.title || "Análise Salva pelo Administrador",
        periodLabel: body.periodLabel || "Período Atual",
        siteVersion: body.siteVersion,
        notes: body.notes || "",
        appliedImprovements: body.appliedImprovements || "",
        futureGoals: body.futureGoals || "",
        tags: Array.isArray(body.tags)
          ? body.tags
          : typeof body.tags === "string"
          ? body.tags
              .split(",")
              .map((t: string) => t.trim())
              .filter(Boolean)
          : [],
        webVitals: body.webVitals,
        realOrdersCount: commercial.totalOrders,
        realRevenueCents: commercial.totalGmvCents,
        periodFilter: body.periodFilter || "all",
      });

      return NextResponse.json({
        ok: true,
        snapshot,
        snapshots: analyticsServerStore.getSnapshots(),
      });
    }

    if (action === "delete_snapshot") {
      if (!body.id) {
        return NextResponse.json({ ok: false, error: "ID do snapshot é obrigatório" }, { status: 400 });
      }
      analyticsServerStore.deleteSnapshot(body.id);
      return NextResponse.json({
        ok: true,
        snapshots: analyticsServerStore.getSnapshots(),
      });
    }

    if (action === "save_improvement") {
      if (!body.title || !String(body.title).trim()) {
        return NextResponse.json(
          { ok: false, error: "O título da melhoria é obrigatório" },
          { status: 400 }
        );
      }
      const improvement = analyticsServerStore.saveImprovement({
        id: body.id,
        title: body.title,
        targetStageId: body.targetStageId,
        targetStageLabel: body.targetStageLabel,
        problemIdentified: body.problemIdentified,
        proposedAction: body.proposedAction,
        expectedImpact: body.expectedImpact,
        measuredResult: body.measuredResult,
        priority: body.priority,
        status: body.status,
        owner: body.owner,
        versionTag: body.versionTag,
      });

      return NextResponse.json({
        ok: true,
        improvement,
        improvements: analyticsServerStore.getImprovements(),
      });
    }

    if (action === "delete_improvement") {
      if (!body.id) {
        return NextResponse.json({ ok: false, error: "ID da melhoria é obrigatório" }, { status: 400 });
      }
      analyticsServerStore.deleteImprovement(body.id);
      return NextResponse.json({
        ok: true,
        improvements: analyticsServerStore.getImprovements(),
      });
    }

    if (action === "reset_events") {
      const backupSnapshot = analyticsServerStore.resetEventsWithAutoBackup();
      return NextResponse.json({
        ok: true,
        backupSnapshot,
        snapshots: analyticsServerStore.getSnapshots(),
      });
    }

    return NextResponse.json({ ok: false, error: "Ação não reconhecida" }, { status: 400 });
  } catch (error: any) {
    console.error("[Analytics API Funnel POST Error]:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Erro ao salvar dados de analytics" },
      { status: 500 }
    );
  }
}
