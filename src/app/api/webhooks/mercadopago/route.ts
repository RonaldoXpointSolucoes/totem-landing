import { NextResponse } from "next/server";
import { verifyMercadoPagoSignature } from "@/lib/payments/mercadoPago";
import { reconcileMercadoPagoPayment } from "@/lib/payments/mercadoPagoStore";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const dataId = new URL(req.url).searchParams.get("data.id") || "";
  if (!verifyMercadoPagoSignature(req.headers, dataId)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  try {
    const body = await req.json();
    if (body.type !== "payment") return NextResponse.json({ ok: true, ignored: true });
    if (String(body.data?.id) !== dataId) return NextResponse.json({ ok: false }, { status: 400 });
    await reconcileMercadoPagoPayment(dataId);
    return NextResponse.json({ ok: true });
  } catch {
    // Return a failure so Mercado Pago retries when the API or database is unavailable.
    console.error("Falha ao reconciliar notificação Mercado Pago", { paymentId: dataId });
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
