import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAuthSession, LEGACY_ADMIN_COOKIE, LEGACY_SECRET } from "@/lib/auth/session";
import {
  recordTelemetryError,
  queryTelemetryErrors,
  resolveTelemetryError,
  resolveAllTelemetryErrors,
  clearAllTelemetryErrors,
} from "@/lib/telemetry/telemetryStore";
import { TelemetryErrorType, TelemetryErrorSeverity } from "@/lib/telemetry/types";

/**
 * Validação de autorização para ações administrativas
 */
async function verifyAdminAuth(req: Request): Promise<boolean> {
  // 1. Chave de acesso direto para diagnóstico da IA / Antigravity via header ou query
  const url = new URL(req.url);
  const diagKey = url.searchParams.get("key") || req.headers.get("x-diagnostics-key");
  if (diagKey === LEGACY_SECRET || diagKey === "totem_telemetry_diag_live_2026") {
    return true;
  }

  // 2. Sessão oficial de usuário admin
  const session = await getAuthSession();
  if (session && session.role === "admin") return true;

  // 3. Cookie de admin legado
  const cookieStore = await cookies();
  const token = cookieStore.get(LEGACY_ADMIN_COOKIE)?.value;
  return token === LEGACY_SECRET;
}

/**
 * GET /api/telemetry/errors
 * Consulta de erros de navegação, runtime e estatísticas de telemetria
 */
export async function GET(req: Request) {
  const isAuth = await verifyAdminAuth(req);
  if (!isAuth) {
    return NextResponse.json(
      { ok: false, error: "Acesso não autorizado para consulta de telemetria." },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || undefined;
    const severity = searchParams.get("severity") || undefined;
    const pathname = searchParams.get("pathname") || undefined;
    const search = searchParams.get("search") || undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 100;
    const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!, 10) : 0;
    
    let resolved: boolean | undefined = undefined;
    if (searchParams.has("resolved")) {
      resolved = searchParams.get("resolved") === "true";
    }

    const data = queryTelemetryErrors({
      type,
      severity,
      pathname,
      search,
      limit,
      offset,
      resolved,
    });

    return NextResponse.json({
      ok: true,
      total: data.total,
      unresolvedCount: data.unresolvedCount,
      errors: data.errors,
      stats: data.stats,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: "Erro ao consultar telemetria: " + error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/telemetry/errors
 * Endpoint de recepção pública de erros de navegação e runtime disparados pelo cliente
 */
export async function POST(req: Request) {
  try {
    let body: any;
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      body = await req.json();
    } else {
      // Suporte para navigator.sendBeacon com text/plain ou Blob
      const rawText = await req.text();
      body = JSON.parse(rawText);
    }

    if (!body || !body.message) {
      return NextResponse.json(
        { ok: false, error: "Payload inválido: mensagem de erro é obrigatória." },
        { status: 400 }
      );
    }

    const recorded = recordTelemetryError({
      type: (body.type as TelemetryErrorType) || "js_runtime_error",
      severity: (body.severity as TelemetryErrorSeverity) || "error",
      message: String(body.message).substring(0, 1000),
      stack: body.stack ? String(body.stack).substring(0, 5000) : undefined,
      pathname: body.pathname ? String(body.pathname).substring(0, 200) : "/",
      url: body.url ? String(body.url).substring(0, 500) : "https://totem.xpointsolucoes.com.br/",
      referrer: body.referrer ? String(body.referrer).substring(0, 500) : undefined,
      componentName: body.componentName ? String(body.componentName).substring(0, 100) : undefined,
      breadcrumbs: Array.isArray(body.breadcrumbs) ? body.breadcrumbs.slice(0, 10) : [],
      device: body.device || {
        type: "desktop",
        screen: "unknown",
        viewport: "unknown",
        userAgent: req.headers.get("user-agent") || "unknown",
      },
      network: body.network,
      user: body.user,
    });

    return NextResponse.json({
      ok: true,
      errorId: recorded.id,
      occurrences: recorded.occurrences,
    });
  } catch (error: any) {
    // Resposta defensiva: nunca falha de forma que quebre o cliente
    return NextResponse.json(
      { ok: false, error: "Falha ao processar telemetria: " + error.message },
      { status: 200 } // Retorna 200 para evitar loops no cliente
    );
  }
}

/**
 * PATCH /api/telemetry/errors
 * Marca erro(s) como resolvidos
 */
export async function PATCH(req: Request) {
  const isAuth = await verifyAdminAuth(req);
  if (!isAuth) {
    return NextResponse.json(
      { ok: false, error: "Acesso não autorizado." },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();

    if (body.resolveAll) {
      const count = resolveAllTelemetryErrors(body.notes);
      return NextResponse.json({
        ok: true,
        message: `${count} erros marcados como resolvidos com sucesso.`,
      });
    }

    if (!body.id) {
      return NextResponse.json(
        { ok: false, error: "ID do erro é obrigatório." },
        { status: 400 }
      );
    }

    const updated = resolveTelemetryError(body.id, body.notes);
    if (!updated) {
      return NextResponse.json(
        { ok: false, error: "Erro não encontrado." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      error: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: "Erro ao atualizar telemetria: " + error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/telemetry/errors
 * Limpa todo o histórico de telemetria
 */
export async function DELETE(req: Request) {
  const isAuth = await verifyAdminAuth(req);
  if (!isAuth) {
    return NextResponse.json(
      { ok: false, error: "Acesso não autorizado." },
      { status: 401 }
    );
  }

  try {
    clearAllTelemetryErrors();
    return NextResponse.json({
      ok: true,
      message: "Histórico de telemetria limpo com sucesso.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: "Erro ao limpar telemetria: " + error.message },
      { status: 500 }
    );
  }
}
