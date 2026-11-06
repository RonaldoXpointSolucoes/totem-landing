import { NextResponse } from "next/server";
import { verifyMercadoPagoSignature } from "@/lib/payments/mercadoPago";
import {
  reconcileMercadoPagoMerchantOrder,
  reconcileMercadoPagoPayment,
} from "@/lib/payments/mercadoPagoStore";
import { logEcosystemEvent } from "@/lib/logging/ecosystemLogger";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const url = new URL(req.url);
  const rawDataIdParam = url.searchParams.get("data.id") || "";
  const rawTopicParam = url.searchParams.get("topic") || "";
  const queryDataId = rawDataIdParam || url.searchParams.get("id") || "";
  const queryTopic = url.searchParams.get("type") || rawTopicParam || "";

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const resourceMatch = String(body?.resource || "").match(/\/(\d+)(?:\?.*)?$/);
  const bodyDataId = String(body?.data?.id || body?.id || (resourceMatch ? resourceMatch[1] : "") || "").trim();
  const dataId = (queryDataId || bodyDataId).trim();
  const eventType = String(body?.type || body?.topic || queryTopic || "").toLowerCase();
  const action = String(body?.action || eventType || "webhook").toLowerCase();

  if (rawDataIdParam && body?.data?.id && String(body.data.id) !== rawDataIdParam) {
    return NextResponse.json({ ok: false, error: "ID divergente" }, { status: 400 });
  }

  const signatureValid = dataId ? verifyMercadoPagoSignature(req.headers, dataId) : false;

  // Para webhooks padrão (?data.id= ou payload JSON sem ?topic=), exige assinatura HMAC válida
  if (!rawTopicParam && !signatureValid) {
    return NextResponse.json({ ok: false, error: "Assinatura inválida" }, { status: 401 });
  }

  if (!dataId) {
    return NextResponse.json({ ok: true, ignored: true, reason: "no_id" });
  }

  try {
    if (eventType.includes("merchant_order") || String(body?.resource || "").includes("merchant_orders")) {
      const result = await reconcileMercadoPagoMerchantOrder(
        dataId,
        signatureValid ? "Webhook MP (Assinado)" : "IPN Checkout Pro MP"
      );
      return NextResponse.json({ ok: true, type: "merchant_order", result });
    }

    if (
      eventType === "payment" ||
      action.startsWith("payment.") ||
      /^\d+$/.test(dataId)
    ) {
      const result = await reconcileMercadoPagoPayment(
        dataId,
        signatureValid ? "Webhook MP (Assinado)" : "Notificação MP (Verificada via API)"
      );
      return NextResponse.json({ ok: true, type: "payment", result });
    }

    return NextResponse.json({ ok: true, ignored: true, type: eventType });
  } catch (err: any) {
    console.error("Falha ao reconciliar notificação Mercado Pago", {
      dataId,
      eventType,
      action,
      error: err?.message,
    });
    try {
      logEcosystemEvent({
        category: "payments",
        level: "error",
        action: "Erro ao Processar Webhook Mercado Pago",
        target: `MP ID #${dataId}`,
        details: `Falha ao reconciliar evento '${action}' para ID ${dataId}: ${err?.message || "Erro desconhecido"}`,
        actor: "Webhook Mercado Pago",
        metadata: { dataId, eventType, action, signatureValid, error: err?.message },
      });
    } catch {}
    return NextResponse.json({ ok: false, error: " Falha temporária de conciliação" }, { status: 503 });
  }
}
