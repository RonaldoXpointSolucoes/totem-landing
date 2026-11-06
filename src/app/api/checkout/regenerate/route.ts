import { NextResponse } from "next/server";
import { checkoutStatusToken, verifyCheckoutStatusToken } from "@/lib/payments/mercadoPago";
import { regenerateOrderPayment } from "@/lib/payments/mercadoPagoStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const orderId = String(body?.orderId || "").trim();
    const token = String(body?.token || "").trim();
    const targetMethod =
      body?.method === "credit_card"
        ? "credit_card"
        : body?.method === "pix"
        ? "pix"
        : undefined;

    if (!orderId || !token) {
      return NextResponse.json(
        { ok: false, error: "Identificação do pedido obrigatória." },
        { status: 400 }
      );
    }

    if (!verifyCheckoutStatusToken(orderId, token)) {
      return NextResponse.json(
        { ok: false, error: "Token de segurança do pedido inválido." },
        { status: 403 }
      );
    }

    const regenerated = await regenerateOrderPayment({
      orderId,
      targetMethod,
      actor: "Cliente (Checkout)",
    });

    return NextResponse.json({
      ok: true,
      ...regenerated,
      payment: {
        ...regenerated.payment,
        statusToken: checkoutStatusToken(orderId),
      },
    });
  } catch (error: any) {
    console.error("Erro ao regenerar pagamento no checkout:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "Não foi possível gerar uma nova cobrança no Mercado Pago.",
      },
      { status: 500 }
    );
  }
}
