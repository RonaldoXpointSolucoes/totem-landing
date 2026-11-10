import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAuthSession, LEGACY_ADMIN_COOKIE, LEGACY_SECRET } from "@/lib/auth/session";
import {
  checkCommercialWhatsAppStatus,
  dispatchRemarketingMessage,
  evaluateOrdersAndCartsForRemarketing,
  runSafeAutoRemarketingSweep,
  updateRemarketingConfig,
  updateTargetCommercialState,
} from "@/lib/remarketing/remarketingEngine";

async function verifyAdminAuth(): Promise<boolean> {
  const session = await getAuthSession();
  if (session && (session.role === "admin" || session.role === "seller")) return true;

  const cookieStore = await cookies();
  const token = cookieStore.get(LEGACY_ADMIN_COOKIE)?.value;
  return token === LEGACY_SECRET;
}

export async function GET(req: Request) {
  const isAuth = await verifyAdminAuth();
  if (!isAuth) {
    return NextResponse.json(
      { ok: false, error: "Acesso administrativo não autorizado." },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const shouldAutoSweep = searchParams.get("autoSweep") === "true";

    let autoSweepResult: any = null;
    if (shouldAutoSweep) {
      autoSweepResult = await runSafeAutoRemarketingSweep();
    }

    const [evaluation, commercialInstanceStatus] = await Promise.all([
      evaluateOrdersAndCartsForRemarketing(),
      checkCommercialWhatsAppStatus(),
    ]);

    return NextResponse.json({
      ok: true,
      commercialInstanceStatus,
      config: evaluation.config,
      kpis: evaluation.kpis,
      targets: evaluation.targets,
      history: evaluation.history,
      autoSweepResult,
    });
  } catch (err: any) {
    console.error("Erro em GET /api/admin/remarketing:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Falha ao avaliar fila de remarketing e gestão comercial.",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const isAuth = await verifyAdminAuth();
  if (!isAuth) {
    return NextResponse.json(
      { ok: false, error: "Acesso administrativo não autorizado." },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const action = String(body?.action || "");

    if (action === "send_manual") {
      const targetId = String(body?.targetId || "");
      if (!targetId) {
        return NextResponse.json(
          { ok: false, error: "targetId é obrigatório para o envio." },
          { status: 400 }
        );
      }

      const dispatchRes = await dispatchRemarketingMessage({
        targetId,
        mode: "manual",
        templateId: body?.templateId || "soft_support",
        customMessage: body?.customMessage || undefined,
        actor: body?.actor || "Gestor Comercial (Painel Admin)",
      });

      const refreshed = await evaluateOrdersAndCartsForRemarketing();

      return NextResponse.json({
        ok: dispatchRes.ok,
        error: dispatchRes.error,
        instanceUsed: dispatchRes.instanceUsed,
        historyEntry: dispatchRes.historyEntry,
        config: refreshed.config,
        kpis: refreshed.kpis,
        targets: refreshed.targets,
        history: refreshed.history,
      });
    }

    if (action === "run_auto_sweep") {
      const sweepRes = await runSafeAutoRemarketingSweep();
      const refreshed = await evaluateOrdersAndCartsForRemarketing();
      return NextResponse.json({
        ok: true,
        sweepRes,
        config: refreshed.config,
        kpis: refreshed.kpis,
        targets: refreshed.targets,
        history: refreshed.history,
      });
    }

    if (action === "update_config") {
      const updatedConfig = updateRemarketingConfig(body?.config || {});
      const refreshed = await evaluateOrdersAndCartsForRemarketing();
      return NextResponse.json({
        ok: true,
        config: updatedConfig,
        kpis: refreshed.kpis,
        targets: refreshed.targets,
        history: refreshed.history,
      });
    }

    if (action === "update_target") {
      const targetId = String(body?.targetId || "");
      if (!targetId) {
        return NextResponse.json(
          { ok: false, error: "targetId é obrigatório." },
          { status: 400 }
        );
      }

      await updateTargetCommercialState({
        targetId,
        appwriteDocId: body?.appwriteDocId,
        phoneCoreKey: body?.phoneCoreKey,
        stage: body?.stage,
        doNotDisturb: body?.doNotDisturb,
        commercialNotes: body?.commercialNotes,
      });

      const refreshed = await evaluateOrdersAndCartsForRemarketing();
      return NextResponse.json({
        ok: true,
        config: refreshed.config,
        kpis: refreshed.kpis,
        targets: refreshed.targets,
        history: refreshed.history,
      });
    }

    return NextResponse.json(
      { ok: false, error: `Ação desconhecida: ${action}` },
      { status: 400 }
    );
  } catch (err: any) {
    console.error("Erro em POST /api/admin/remarketing:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Erro interno na operação de remarketing." },
      { status: 500 }
    );
  }
}
