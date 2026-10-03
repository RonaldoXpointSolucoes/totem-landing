import { NextResponse } from "next/server";
import { getOrderWithDetails } from "@/lib/appwrite/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("orderId");

    if (!orderId) {
      return NextResponse.json({ ok: false, error: "Parâmetro orderId obrigatório." }, { status: 400 });
    }

    const orderDetails = await getOrderWithDetails(orderId);
    if (!orderDetails) {
      return NextResponse.json({ ok: false, error: "Pedido não localizado." }, { status: 404 });
    }

    const isPaid = orderDetails.order.status === "paid" || orderDetails.order.status === "in_production";

    return NextResponse.json({
      ok: true,
      status: orderDetails.order.status,
      isPaid,
      orderNumber: orderDetails.order.order_number,
      paidAt: orderDetails.payment?.paid_at || null,
      totalCents: orderDetails.order.total_cents,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: "Erro ao consultar status: " + error?.message },
      { status: 500 }
    );
  }
}
