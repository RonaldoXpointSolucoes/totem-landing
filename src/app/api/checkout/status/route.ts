import { NextResponse } from "next/server";
import { getOrderWithDetails } from "@/lib/appwrite/server";
import { translateMercadoPagoStatusDetail, verifyCheckoutStatusToken } from "@/lib/payments/mercadoPago";
import { refreshMercadoPagoOrder } from "@/lib/payments/mercadoPagoStore";
import { resolveKitEquipmentSummary, buildOrderDeliveryChecklist } from "@/modules/catalog/kitDefaults";

export const dynamic = "force-dynamic";
const lastRefresh = new Map<string, number>();

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("orderId");
    const forceSync = searchParams.get("forceSync") === "1";

    if (!orderId) {
      return NextResponse.json({ ok: false, error: "Parâmetro orderId obrigatório." }, { status: 400 });
    }
    if (!verifyCheckoutStatusToken(orderId, searchParams.get("token") || "")) {
      return NextResponse.json({ ok: false, error: "Acesso ao pedido inválido." }, { status: 403 });
    }

    let orderDetails = await getOrderWithDetails(orderId);
    if (!orderDetails) {
      return NextResponse.json({ ok: false, error: "Pedido não localizado." }, { status: 404 });
    }

    let syncPending = false;
    const minIntervalMs = forceSync ? 2000 : 12000;
    if (
      orderDetails.payment?.provider === "mercadopago" &&
      (orderDetails.order.status === "awaiting_payment" || orderDetails.order.status === "cancelled") &&
      Date.now() - (lastRefresh.get(orderId) || 0) >= minIntervalMs
    ) {
      if (lastRefresh.size > 5000) lastRefresh.clear();
      lastRefresh.set(orderId, Date.now());
      try {
        await refreshMercadoPagoOrder(
          orderId,
          orderDetails.payment.gateway_payment_id || undefined,
          forceSync ? "Retorno Checkout Cliente" : "Polling Checkout Cliente"
        );
        orderDetails = (await getOrderWithDetails(orderId)) || orderDetails;
      } catch {
        syncPending = true;
      }
    }

    const method = orderDetails.payment?.payment_method === "credit_card" ? "credit_card" : "pix";
    const paymentStatus = orderDetails.payment?.status || "pending";
    const gatewayStatus = orderDetails.payment?.gateway_status || paymentStatus;
    const isPaid =
      ["paid", "partially_refunded"].includes(paymentStatus) &&
      ["paid", "in_production", "ready", "shipped", "delivered"].includes(orderDetails.order.status);
    const expired = !isPaid && Date.parse(orderDetails.payment?.expires_at || "") < Date.now();

    const statusTranslation = translateMercadoPagoStatusDetail(
      expired && paymentStatus === "pending" ? "cancelled" : paymentStatus,
      expired && paymentStatus === "pending" ? "expired" : gatewayStatus,
      method
    );

    let parsedAddress: any = {};
    try {
      parsedAddress = orderDetails.order.delivery_address_json
        ? JSON.parse(orderDetails.order.delivery_address_json)
        : {};
    } catch {}

    let parsedSheets: any[] = [];
    try {
      if (orderDetails.order.manufacturing_sheet_json) {
        const raw = JSON.parse(orderDetails.order.manufacturing_sheet_json);
        parsedSheets = Array.isArray(raw) ? raw : raw ? [raw] : [];
      }
    } catch {}

    return NextResponse.json(
      {
        ok: true,
        status: orderDetails.order.status,
        isPaid,
        paymentStatus,
        gatewayStatus,
        statusTranslation,
        expired,
        syncPending,
        method,
        orderNumber: orderDetails.order.order_number,
        customerName: orderDetails.order.customer_name || "",
        customerEmail: orderDetails.order.customer_email || "",
        customerWhatsapp: orderDetails.order.customer_whatsapp || "",
        customerDocument: orderDetails.order.customer_document || "",
        customerAddress: {
          cep: parsedAddress.cep || "",
          street: parsedAddress.street || "",
          number: parsedAddress.number || "",
          city: parsedAddress.city || "",
          state: parsedAddress.state || "",
        },
        paidAt: orderDetails.payment?.paid_at || null,
        expiresAt: orderDetails.payment?.expires_at || null,
        pixCode: orderDetails.payment?.pix_code || "",
        checkoutUrl: orderDetails.payment?.checkout_url || "",
        subtotalCents: orderDetails.order.subtotal_cents || 0,
        shippingCents: orderDetails.order.shipping_cents || 0,
        discountCents: Number(orderDetails.order.discount_cents || parsedAddress.discountCents || 0),
        totalCents: orderDetails.order.total_cents,
        items: (orderDetails.items || []).map((it: any, idx: number) => {
          const sheet = parsedSheets[idx] || parsedSheets[0] || null;
          const kitSnapshot = Array.isArray(sheet?.kitItemsSnapshot) ? sheet.kitItemsSnapshot : null;
          const kitEq = resolveKitEquipmentSummary({
            kitItemsSnapshot: kitSnapshot,
            monitorName: it.monitor_name,
            printerName: it.printer_name,
            readerName: it.reader_name,
          });
          const deliveryChecklist =
            Array.isArray(sheet?.deliveryChecklist) && sheet.deliveryChecklist.length > 0
              ? sheet.deliveryChecklist
              : buildOrderDeliveryChecklist({
                  cabinetName: it.cabinet_name,
                  colorName: it.color_name,
                  quantity: it.quantity || 1,
                  kitItemsSnapshot: kitSnapshot,
                  monitorName: it.monitor_name,
                  printerName: it.printer_name,
                  readerName: it.reader_name,
                });
          return {
            id: it.$id,
            cabinetName: it.cabinet_name,
            colorName: it.color_name,
            monitorName: kitEq.monitorDisplay,
            printerName: kitEq.printerDisplay,
            readerName: kitEq.hasReader ? kitEq.readerDisplay : "",
            quantity: it.quantity || 1,
            unitPriceCents: it.unit_price_cents || 0,
            subtotalCents: it.subtotal_cents || 0,
            deliveryChecklist,
          };
        }),
        additionalCharges: Array.isArray(parsedAddress.additionalCharges)
          ? parsedAddress.additionalCharges
          : [],
        lastGatewayDiag: parsedAddress.lastGatewayDiag || null,
      },
      { headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } }
    );
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: "Não foi possível consultar o pagamento." },
      { status: 500 }
    );
  }
}
