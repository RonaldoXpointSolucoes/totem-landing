import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { listAllOrdersAdmin } from "@/lib/appwrite/server";
import { getAuthSession, LEGACY_ADMIN_COOKIE, LEGACY_SECRET } from "@/lib/auth/session";
import { getAllLocalOrders } from "@/lib/orders/orderStore";

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

    // 3. Consolidação unificada por orderNumber
    const orderMap = new Map<string, any>();

    appwriteOrders.forEach((o) => {
      orderMap.set(o.order_number, o);
    });

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
          payment: o.payment,
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
