import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAuthSession, LEGACY_ADMIN_COOKIE, LEGACY_SECRET } from "@/lib/auth/session";
import {
  queryEcosystemLogs,
  logEcosystemEvent,
  clearAllEcosystemLogs,
  LogCategory,
  LogLevel,
} from "@/lib/logging/ecosystemLogger";

async function verifyAdminAuth(): Promise<boolean> {
  const session = await getAuthSession();
  if (session && session.role === "admin") return true;

  const cookieStore = await cookies();
  const token = cookieStore.get(LEGACY_ADMIN_COOKIE)?.value;
  return token === LEGACY_SECRET;
}

export async function GET(req: Request) {
  const isAuth = await verifyAdminAuth();
  if (!isAuth) {
    return NextResponse.json({ ok: false, error: "Acesso não autorizado." }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") || undefined;
    const level = searchParams.get("level") || undefined;
    const search = searchParams.get("search") || undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 100;
    const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!, 10) : 0;

    const result = queryEcosystemLogs({
      category,
      level,
      search,
      limit,
      offset,
    });

    return NextResponse.json({
      ok: true,
      total: result.total,
      logs: result.logs,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: "Erro ao consultar logs: " + error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const isAuth = await verifyAdminAuth();
  if (!isAuth) {
    return NextResponse.json({ ok: false, error: "Acesso não autorizado." }, { status: 401 });
  }

  try {
    const body = await req.json();
    if (!body.category || !body.action || !body.target || !body.details) {
      return NextResponse.json(
        { ok: false, error: "Dados incompletos para registro do log." },
        { status: 400 }
      );
    }

    const log = logEcosystemEvent({
      category: body.category as LogCategory,
      level: (body.level as LogLevel) || "info",
      action: body.action,
      target: body.target,
      details: body.details,
      actor: body.actor || "Admin",
      metadata: body.metadata || {},
    });

    return NextResponse.json({
      ok: true,
      log,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: "Erro ao criar log: " + error.message },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const isAuth = await verifyAdminAuth();
  if (!isAuth) {
    return NextResponse.json({ ok: false, error: "Acesso não autorizado." }, { status: 401 });
  }

  try {
    clearAllEcosystemLogs();
    logEcosystemEvent({
      category: "system",
      level: "warn",
      action: "Limpeza de Logs",
      target: "Auditoria & Logs",
      details: "Todos os registros de auditoria anteriores foram limpos pelo administrador.",
      actor: "Admin",
    });

    return NextResponse.json({
      ok: true,
      message: "Histórico de logs limpo com sucesso.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: "Erro ao limpar logs: " + error.message },
      { status: 500 }
    );
  }
}
