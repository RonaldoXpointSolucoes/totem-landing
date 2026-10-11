import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAuthSession, LEGACY_ADMIN_COOKIE, LEGACY_SECRET } from "@/lib/auth/session";
import { getAllCustomers } from "@/lib/customers/customerStore";
import { getAllLocalOrders } from "@/lib/orders/orderStore";

async function verifyAdminAuth(): Promise<boolean> {
  const session = await getAuthSession();
  if (session && session.role === "admin") return true;

  const cookieStore = await cookies();
  const token = cookieStore.get(LEGACY_ADMIN_COOKIE)?.value;
  return token === LEGACY_SECRET;
}

export async function GET() {
  const isAuth = await verifyAdminAuth();
  if (!isAuth) {
    return NextResponse.json({ ok: false, error: "Acesso administrativo não autorizado." }, { status: 401 });
  }

  try {
    const customers = getAllCustomers();
    const orders = getAllLocalOrders();

    // Vincula contagem e métricas de pedidos a cada cliente
    const enriched = customers.map((c) => {
      const customerOrders = orders.filter(
        (o) =>
          (c.email && o.customer?.email?.toLowerCase() === c.email.toLowerCase()) ||
          (c.whatsapp && o.customer?.whatsapp?.replace(/\D/g, "") === c.whatsapp.replace(/\D/g, ""))
      );

      const totalSpent = customerOrders
        .filter((o) => o.status !== "cancelled")
        .reduce((acc, o) => acc + (o.totalCents || 0), 0);

      return {
        ...c,
        totalOrdersCount: Math.max(c.totalOrdersCount || 0, customerOrders.length),
        totalSpentCents: Math.max(c.totalSpentCents || 0, totalSpent),
        recentOrders: customerOrders.slice(0, 3).map((o) => ({
          orderNumber: o.orderNumber,
          totalCents: o.totalCents,
          status: o.status,
          createdAt: o.createdAt,
        })),
      };
    });

    return NextResponse.json({
      ok: true,
      total: enriched.length,
      customers: enriched,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: "Erro ao listar clientes: " + error.message },
      { status: 500 }
    );
  }
}
