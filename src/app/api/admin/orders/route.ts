import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { listAllOrdersAdmin } from "@/lib/appwrite/server";
import { getAuthSession, LEGACY_ADMIN_COOKIE, LEGACY_SECRET } from "@/lib/auth/session";
import { getAllLocalOrders } from "@/lib/orders/orderStore";
import { calculateShippingQuotes } from "@/modules/shipping";

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

    // 1. Carrega do Appwrite
    let appwriteOrders: any[] = [];
    try {
      appwriteOrders = await listAllOrdersAdmin(status);
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
          parsedSheets = JSON.parse(o.manufacturing_sheet_json);
        }
      } catch {}

      const localMatch = localByNumber.get(o.order_number);
      let shippingMethod = parsedAddress?.shippingMethod || localMatch?.shippingMethod || null;

      // Caso o pedido antigo tenha frete cobrado (> 0) mas sem o objeto shippingMethod salvo,
      // deduzimos automaticamente cotando o CEP de destino com os itens do pedido
      if (!shippingMethod && o.shipping_cents > 0 && parsedAddress?.cep) {
        try {
          const quoteRes = await calculateShippingQuotes({
            destinationCep: parsedAddress.cep,
            items: (o.items || []).map((it: any) => {
              const nameLower = (it.cabinet_name || "").toLowerCase();
              const modelId = nameLower.includes("parede")
                ? "cabinet-wall"
                : nameLower.includes("balc") || nameLower.includes("mesa")
                ? "cabinet-counter"
                : "cabinet-floor";
              return { modelId, quantity: it.quantity || 1 };
            }),
          });
          if (quoteRes.ok && quoteRes.quotes.length > 0) {
            const exact = quoteRes.quotes.find((q) => q.priceCents === o.shipping_cents);
            const fallback = quoteRes.quotes.find((q) => q.isAvailable && q.priceCents > 0);
            const chosen = exact || fallback;
            if (chosen) {
              shippingMethod = {
                id: chosen.id,
                name: chosen.name,
                carrier: chosen.carrier,
                priceCents: o.shipping_cents,
                deliveryDaysMin: chosen.deliveryDaysMin,
                deliveryDaysMax: chosen.deliveryDaysMax,
              };
            }
          }
        } catch {}
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

      orderMap.set(o.order_number, {
        ...o,
        delivery_address: parsedAddress || localMatch?.deliveryAddress || null,
        shipping_method: shippingMethod,
        manufacturing_sheets: parsedSheets.length ? parsedSheets : localMatch?.manufacturingSheets || [],
        coupon_code: parsedAddress?.couponCode || null,
        discount_cents: parsedAddress?.discountCents || 0,
      });
    }

    localOrders.forEach((o) => {
      if (status && status !== "all" && o.status !== status) return;

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
          items: o.items.map((it) => ({
            cabinet_name: it.configuration.model.name,
            color_name: it.configuration.color.name,
            monitor_name: it.configuration.monitor?.displayName || "Nenhum",
            printer_name: it.configuration.printer?.displayName || "Nenhum",
            reader_name: it.configuration.barcodeReader?.displayName || "Nenhum",
            quantity: it.quantity,
            unit_price_cents: it.unitPriceCents,
            subtotal_cents: it.subtotalCents,
          })),
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

    const consolidated = Array.from(orderMap.values()).sort(
      (a, b) => new Date(b.$createdAt).getTime() - new Date(a.$createdAt).getTime()
    );

    return NextResponse.json({
      ok: true,
      total: consolidated.length,
      data: consolidated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: "Erro ao listar pedidos consolidados: " + error?.message },
      { status: 500 }
    );
  }
}
