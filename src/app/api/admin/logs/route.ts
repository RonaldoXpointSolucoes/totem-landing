import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAuthSession, LEGACY_ADMIN_COOKIE, LEGACY_SECRET } from "@/lib/auth/session";
import { listAllOrdersAdmin } from "@/lib/appwrite/server";
import { translateMercadoPagoStatusDetail } from "@/lib/payments/mercadoPago";
import {
  queryEcosystemLogs,
  logEcosystemEvent,
  clearAllEcosystemLogs,
  LogCategory,
  LogLevel,
  LogEvent,
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

    const baseResult = queryEcosystemLogs({
      limit: 500,
      offset: 0,
    });

    const mergedMap = new Map<string, LogEvent>();
    for (const l of baseResult.logs) {
      if (
        !l.id.startsWith("log_seed_") &&
        !String(l.target || "").includes("TOT-TEST-ONLY") &&
        !String(l.details || "").includes("Unexpected network request blocked in test")
      ) {
        mergedMap.set(l.id, l);
      }
    }

    // Hidrata com eventos reais dos pedidos e pagamentos do Appwrite para persistência 100% imune a redeploy
    try {
      const orders = await listAllOrdersAdmin("all");
      for (const o of orders) {
        let parsedAddr: any = {};
        try {
          parsedAddr = o.delivery_address_json ? JSON.parse(o.delivery_address_json) : {};
        } catch {}

        const payMethod =
          o.payment?.payment_method ||
          parsedAddr?.paymentMethod ||
          (o.payment?.gateway_preference_id ? "credit_card" : "pix");

        const orderCreatedLogId = `appwrite_order_${o.$id}`;
        if (!mergedMap.has(orderCreatedLogId)) {
          mergedMap.set(orderCreatedLogId, {
            id: orderCreatedLogId,
            timestamp: o.$createdAt,
            category: "orders",
            level: "info",
            action: "Pedido Registrado no Checkout",
            target: `Pedido #${o.order_number}`,
            details: `Cliente: ${o.customer_name} (${o.customer_document || "S/ Doc"}) • Total: R$ ${((o.total_cents || 0) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} • Método: ${payMethod === "credit_card" ? "Cartão de Crédito" : "Pix à Vista"}.`,
            actor: o.customer_name || "Cliente",
            metadata: {
              orderId: o.$id,
              orderNumber: o.order_number,
              customerName: o.customer_name,
              customerEmail: o.customer_email,
              customerWhatsapp: o.customer_whatsapp,
              totalCents: o.total_cents,
              paymentMethod: payMethod,
              status: o.status,
            },
          });
        }

        if (o.payment) {
          const isPaid = ["paid", "in_production", "ready", "shipped", "delivered"].includes(o.status);
          const isExpired =
            !isPaid &&
            Boolean(o.payment.expires_at) &&
            Date.parse(o.payment.expires_at) < Date.now();
          const diag = translateMercadoPagoStatusDetail(
            isPaid ? "approved" : isExpired && o.payment.status === "pending" ? "cancelled" : o.payment.status,
            isPaid ? "accredited" : isExpired && o.payment.status === "pending" ? "expired" : o.payment.gateway_status,
            payMethod
          );

          const payLogId = `appwrite_pay_${o.payment.$id}_${o.payment.gateway_status || o.payment.status}`;
          if (!mergedMap.has(payLogId)) {
            mergedMap.set(payLogId, {
              id: payLogId,
              timestamp: o.payment.$updatedAt || o.payment.$createdAt || o.$updatedAt,
              category: "payments",
              level:
                diag.severity === "error"
                  ? "error"
                  : diag.severity === "warn"
                  ? "warn"
                  : diag.severity === "success"
                  ? "success"
                  : "info",
              action: `Mercado Pago: ${diag.label}`,
              target: `Pedido #${o.order_number}`,
              details: `${diag.description} (Cliente: ${o.customer_name} • Valor: R$ ${((o.total_cents || 0) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} • Gateway ID: ${o.payment.gateway_payment_id || o.payment.gateway_preference_id || "N/A"}).`,
              actor: "Gateway Mercado Pago",
              metadata: {
                orderId: o.$id,
                orderNumber: o.order_number,
                gatewayPaymentId: o.payment.gateway_payment_id || null,
                gatewayPreferenceId: o.payment.gateway_preference_id || null,
                gatewayStatus: o.payment.gateway_status || o.payment.status,
                statusCode: diag.code,
                paymentMethod: payMethod,
                expiresAt: o.payment.expires_at,
                paidAt: o.payment.paid_at,
              },
            });
          }
        }

        const history = Array.isArray(parsedAddr?.paymentHistory) ? parsedAddr.paymentHistory : [];
        history.forEach((h: any, idx: number) => {
          const histId = `appwrite_hist_${o.$id}_${idx}_${h.at}`;
          if (!mergedMap.has(histId)) {
            mergedMap.set(histId, {
              id: histId,
              timestamp: h.at || o.$updatedAt,
              category: "payments",
              level:
                h.severity === "error"
                  ? "error"
                  : h.severity === "warn"
                  ? "warn"
                  : h.severity === "success"
                  ? "success"
                  : "info",
              action: `${h.action} — ${h.statusLabel}`,
              target: `Pedido #${o.order_number}`,
              details: `${h.statusDescription} (Ator: ${h.actor || "Mercado Pago"}).`,
              actor: h.actor || "Gateway Mercado Pago",
              metadata: h,
            });
          }
        });
      }
    } catch {}

    let list = Array.from(mergedMap.values()).sort(
      (a, b) => Date.parse(b.timestamp || "") - Date.parse(a.timestamp || "")
    );

    if (category && category !== "all") {
      list = list.filter((l) => l.category === category);
    }
    if (level && level !== "all") {
      list = list.filter((l) => l.level === level);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (l) =>
          l.action.toLowerCase().includes(q) ||
          l.target.toLowerCase().includes(q) ||
          l.details.toLowerCase().includes(q) ||
          l.actor.toLowerCase().includes(q) ||
          (l.metadata && JSON.stringify(l.metadata).toLowerCase().includes(q))
      );
    }

    const total = list.length;
    return NextResponse.json({
      ok: true,
      total,
      logs: list.slice(offset, offset + limit),
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
      action: "Limpeza de Logs Locais",
      target: "Auditoria & Logs",
      details: "Registros locais em memória foram limpos pelo administrador.",
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
