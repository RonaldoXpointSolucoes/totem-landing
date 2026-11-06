import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAuthSession, LEGACY_ADMIN_COOKIE, LEGACY_SECRET } from "@/lib/auth/session";
import { getOrderWithDetails } from "@/lib/appwrite/server";
import { checkoutStatusToken, translateMercadoPagoStatusDetail } from "@/lib/payments/mercadoPago";
import { refreshMercadoPagoOrder, regenerateOrderPayment } from "@/lib/payments/mercadoPagoStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function verifyAdminAuth(): Promise<{ ok: boolean; actor: string }> {
  const session = await getAuthSession();
  if (session && session.role === "admin") {
    return { ok: true, actor: `Admin (${session.name || session.email || "Painel"})` };
  }
  const cookieStore = await cookies();
  const token = cookieStore.get(LEGACY_ADMIN_COOKIE)?.value;
  if (token === LEGACY_SECRET) {
    return { ok: true, actor: "Admin (Painel)" };
  }
  return { ok: false, actor: "" };
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminAuth();
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: "Acesso administrativo não autorizado." },
      { status: 401 }
    );
  }

  try {
    const { id: orderId } = await context.params;
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "sync");
    const site = (process.env.NEXT_PUBLIC_SITE_URL || "https://totem.xpointsolucoes.com.br").replace(/\/$/, "");

    if (action === "regenerate_pix" || action === "regenerate_card") {
      const targetMethod = action === "regenerate_card" ? "credit_card" : "pix";
      const regen = await regenerateOrderPayment({
        orderId,
        targetMethod,
        actor: auth.actor,
      });
      const details = await getOrderWithDetails(orderId);
      let parsedAddr: any = {};
      try {
        parsedAddr = details?.order?.delivery_address_json
          ? JSON.parse(details.order.delivery_address_json)
          : {};
      } catch {}

      return NextResponse.json({
        ok: true,
        action,
        orderId,
        orderNumber: regen.orderNumber,
        status: regen.status,
        payment: {
          ...regen.payment,
          payment_method: regen.payment.method,
          pix_code: regen.payment.pixCode,
          checkout_url: regen.payment.checkoutUrl,
          expires_at: regen.payment.expiresAt,
          gateway_payment_id: regen.payment.gatewayPaymentId,
          gateway_preference_id: regen.payment.gatewayPreferenceId,
          gateway_status: regen.payment.gatewayStatus,
        },
        customerPaymentUrl: `${site}/checkout/retorno?orderId=${encodeURIComponent(orderId)}&token=${checkoutStatusToken(orderId)}`,
        paymentHistory: parsedAddr.paymentHistory || [],
        lastGatewayDiag: parsedAddr.lastGatewayDiag || null,
        message:
          targetMethod === "credit_card"
            ? "Novo link de Cartão (72h) gerado com sucesso no Mercado Pago!"
            : "Novo QR Code Pix (24h) gerado com sucesso no Mercado Pago!",
      });
    }

    // Default action: "sync"
    const currentDetails = await getOrderWithDetails(orderId);
    if (!currentDetails) {
      return NextResponse.json(
        { ok: false, error: "Pedido não encontrado no Appwrite." },
        { status: 404 }
      );
    }

    const syncRes = await refreshMercadoPagoOrder(
      orderId,
      currentDetails.payment?.gateway_payment_id || undefined,
      auth.actor
    );

    const updated = (await getOrderWithDetails(orderId)) || currentDetails;
    const method = updated.payment?.payment_method === "credit_card" ? "credit_card" : "pix";
    const expired =
      updated.order.status !== "paid" &&
      Date.parse(updated.payment?.expires_at || "") < Date.now();
    const diag = translateMercadoPagoStatusDetail(
      expired && updated.payment?.status === "pending" ? "cancelled" : updated.payment?.status,
      expired && updated.payment?.status === "pending" ? "expired" : updated.payment?.gateway_status,
      method
    );

    let parsedAddr: any = {};
    try {
      parsedAddr = updated.order.delivery_address_json
        ? JSON.parse(updated.order.delivery_address_json)
        : {};
    } catch {}

    return NextResponse.json({
      ok: true,
      action: "sync",
      orderId,
      orderNumber: updated.order.order_number,
      status: updated.order.status,
      payment: updated.payment,
      gatewayDiagnosis: diag,
      syncResult: syncRes,
      customerPaymentUrl: `${site}/checkout/retorno?orderId=${encodeURIComponent(orderId)}&token=${checkoutStatusToken(orderId)}`,
      paymentHistory: parsedAddr.paymentHistory || [],
      lastGatewayDiag: parsedAddr.lastGatewayDiag || null,
      message: `Sincronizado com Mercado Pago: ${diag.label}`,
    });
  } catch (error: any) {
    console.error("Erro na ação de pagamento admin:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "Falha ao executar ação no Mercado Pago.",
      },
      { status: 500 }
    );
  }
}
