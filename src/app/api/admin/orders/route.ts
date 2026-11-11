import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { listAllOrdersAdmin } from "@/lib/appwrite/server";
import { getAuthSession, LEGACY_ADMIN_COOKIE, LEGACY_SECRET } from "@/lib/auth/session";
import { getAllLocalOrders } from "@/lib/orders/orderStore";
import { calculateShippingQuotes } from "@/modules/shipping";
import { checkoutStatusToken, translateMercadoPagoStatusDetail } from "@/lib/payments/mercadoPago";
import { resolveKitEquipmentSummary, buildOrderDeliveryChecklist } from "@/modules/catalog/kitDefaults";

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
    return NextResponse.json({ ok: false, error: "Acesso administrativo não autorizado." }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;
    const site = (process.env.NEXT_PUBLIC_SITE_URL || "https://totem.xpointsolucoes.com.br").replace(/\/$/, "");

    // 1. Carrega todos os pedidos do Appwrite para computar contadores por status
    let appwriteOrders: any[] = [];
    try {
      appwriteOrders = await listAllOrdersAdmin();
    } catch {
      // Silencioso se Appwrite estiver offline
    }

    // 2. Carrega do Armazenamento Local
    const localOrders = getAllLocalOrders();
    const localByNumber = new Map<string, any>();
    localOrders.forEach((lo) => {
      localByNumber.set(lo.orderNumber, lo);
    });

    // 3. Consolidação unificada por orderNumber
    const orderMap = new Map<string, any>();

    for (const o of appwriteOrders) {
      let parsedAddress: any = null;
      try {
        if (o.delivery_address_json) {
          parsedAddress = JSON.parse(o.delivery_address_json);
        }
      } catch {}

      let parsedSheets: any[] = [];
      try {
        if (o.manufacturing_sheet_json) {
          const rawParsed = JSON.parse(o.manufacturing_sheet_json);
          parsedSheets = Array.isArray(rawParsed) ? rawParsed : rawParsed ? [rawParsed] : [];
        }
      } catch {}

      const localMatch = localByNumber.get(o.order_number);
      let shippingMethod = parsedAddress?.shippingMethod || localMatch?.shippingMethod || null;

      if (!shippingMethod && o.shipping_cents > 0) {
        shippingMethod = {
          id: "correios_contrato",
          name: "Frete Contratado (Correios / Transportadora)",
          carrier: "Correios / Transportadora",
          priceCents: o.shipping_cents,
          deliveryDaysMin: 2,
          deliveryDaysMax: 6,
        };
      } else if (!shippingMethod && (o.shipping_cents === 0 || !o.shipping_cents)) {
        shippingMethod = {
          id: "retirada_fabrica",
          name: "Retirada na Fábrica / Frete Isento",
          carrier: "X-Point Engenharia (SP)",
          priceCents: 0,
          deliveryDaysMin: 5,
          deliveryDaysMax: 8,
        };
      }

      const payMethod =
        o.payment?.payment_method ||
        parsedAddress?.paymentMethod ||
        (o.payment?.gateway_preference_id ? "credit_card" : "pix");
      const isPaid = ["paid", "in_production", "ready", "shipped", "delivered"].includes(o.status);
      const isExpired =
        !isPaid &&
        Boolean(o.payment?.expires_at) &&
        Date.parse(o.payment.expires_at) < Date.now();
      const gatewayDiag = translateMercadoPagoStatusDetail(
        isPaid ? "approved" : isExpired && o.payment?.status === "pending" ? "cancelled" : o.payment?.status,
        isPaid ? "accredited" : isExpired && o.payment?.status === "pending" ? "expired" : o.payment?.gateway_status,
        payMethod
      );

      let customerPaymentUrl = "";
      try {
        customerPaymentUrl = `${site}/checkout/retorno?orderId=${encodeURIComponent(o.$id)}&token=${checkoutStatusToken(o.$id)}`;
      } catch {}

      const normalizedItems = (o.items || []).map((it: any, idx: number) => {
        const sheet = parsedSheets[idx] || parsedSheets[0] || null;
        const kitSnapshot = Array.isArray(sheet?.kitItemsSnapshot) ? sheet.kitItemsSnapshot : null;
        const resolved = resolveKitEquipmentSummary({
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
          ...it,
          monitor_name: resolved.monitorDisplay,
          printer_name: resolved.printerDisplay,
          reader_name: resolved.isKit
            ? resolved.hasReader
              ? resolved.readerDisplay
              : resolved.accessoriesSummary || "Kit Completo (Coolers + Régua + Cabos)"
            : resolved.readerDisplay,
          is_kit: resolved.isKit,
          has_monitor_in_kit: resolved.hasMonitorInKit,
          has_printer_in_kit: resolved.hasPrinterInKit,
          kit_items_snapshot: kitSnapshot || resolved.includedSubItems.concat(resolved.removedSubItems),
          delivery_checklist: deliveryChecklist,
        };
      });

      orderMap.set(o.order_number, {
        ...o,
        items: normalizedItems,
        delivery_address: parsedAddress || localMatch?.deliveryAddress || null,
        shipping_method: shippingMethod,
        manufacturing_sheets: parsedSheets.length ? parsedSheets : localMatch?.manufacturingSheets || [],
        coupon_code: parsedAddress?.couponCode || null,
        discount_cents: parsedAddress?.discountCents || 0,
        customer_payment_url: customerPaymentUrl,
        gateway_diagnosis: gatewayDiag,
        payment_history: Array.isArray(parsedAddress?.paymentHistory) ? parsedAddress.paymentHistory : [],
        last_gateway_diag: parsedAddress?.lastGatewayDiag || null,
      });
    }

    localOrders.forEach((o) => {
      const existing = orderMap.get(o.orderNumber);
      if (!existing) {
        orderMap.set(o.orderNumber, {
          $id: o.id,
          order_number: o.orderNumber,
          status: o.status,
          customer_name: o.customer.name,
          customer_document: o.customer.document,
          customer_email: o.customer.email,
          customer_whatsapp: o.customer.whatsapp,
          delivery_address_json: JSON.stringify(o.deliveryAddress || {}),
          delivery_address: o.deliveryAddress || null,
          shipping_method: o.shippingMethod || null,
          manufacturing_sheets: o.manufacturingSheets || [],
          subtotal_cents: o.subtotalCents,
          shipping_cents: o.shippingCents,
          total_cents: o.totalCents,
          $createdAt: o.createdAt,
          items: o.items.map((it) => {
            const resolved = resolveKitEquipmentSummary({
              monitor: it.configuration.monitor,
              monitorName: it.configuration.monitor?.displayName,
              printerName: it.configuration.printer?.displayName,
              readerName: it.configuration.barcodeReader?.displayName,
            });
            const deliveryChecklist = buildOrderDeliveryChecklist({
              cabinetName: it.configuration.model.name,
              colorName: it.configuration.color.name,
              quantity: it.quantity || 1,
              monitor: it.configuration.monitor,
              monitorName: it.configuration.monitor?.displayName,
              printerName: it.configuration.printer?.displayName,
              readerName: it.configuration.barcodeReader?.displayName,
              includeAssemblyService: it.configuration.includeAssemblyService,
            });
            return {
              cabinet_name: it.configuration.model.name,
              color_name: it.configuration.color.name,
              monitor_name: resolved.monitorDisplay,
              printer_name: resolved.printerDisplay,
              reader_name: resolved.isKit
                ? resolved.hasReader
                  ? resolved.readerDisplay
                  : resolved.accessoriesSummary || "Kit Completo (Coolers + Régua + Cabos)"
                : resolved.readerDisplay,
              is_kit: resolved.isKit,
              has_monitor_in_kit: resolved.hasMonitorInKit,
              has_printer_in_kit: resolved.hasPrinterInKit,
              delivery_checklist: deliveryChecklist,
              quantity: it.quantity,
              unit_price_cents: it.unitPriceCents,
              subtotal_cents: it.subtotalCents,
            };
          }),
          payment: {
            provider: o.payment?.provider || "mercadopago",
            amount_cents: o.totalCents,
            status: o.payment?.status || (o.status === "paid" ? "paid" : "pending"),
            pix_code: o.payment?.pixCode || "",
            payment_method: o.payment?.method || "pix",
          },
        });
      }
    });

    const allConsolidated = Array.from(orderMap.values()).sort(
      (a, b) => new Date(b.$createdAt).getTime() - new Date(a.$createdAt).getTime()
    );

    const statusCounts: Record<string, number> = {
      awaiting_custom_analysis: 0,
      custom_approved: 0,
      awaiting_payment: 0,
      paid: 0,
      in_production: 0,
      ready: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
    };

    for (const item of allConsolidated) {
      const st = item.status || "awaiting_payment";
      statusCounts[st] = (statusCounts[st] || 0) + 1;
    }

    const consolidated =
      status && status !== "all"
        ? allConsolidated.filter((o) => o.status === status)
        : allConsolidated;

    return NextResponse.json({
      ok: true,
      total: consolidated.length,
      totalAll: allConsolidated.length,
      statusCounts,
      data: consolidated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: "Erro ao listar pedidos consolidados: " + error?.message },
      { status: 500 }
    );
  }
}
