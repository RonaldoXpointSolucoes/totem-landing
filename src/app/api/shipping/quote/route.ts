import { NextResponse } from "next/server";
import { calculateShippingQuotes } from "@/modules/shipping";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const destinationCep = body.destinationCep || body.cep;
    const items = body.items;

    if (!destinationCep) {
      return NextResponse.json(
        { ok: false, error: "O CEP de destino é obrigatório." },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Informe ao menos um produto no carrinho para cotar o frete." },
        { status: 400 }
      );
    }

    const calculation = await calculateShippingQuotes({
      destinationCep: String(destinationCep),
      items: items.map((item) => ({
        modelId: String(item.modelId),
        quantity: Math.max(1, Number(item.quantity) || 1),
      })),
    });

    if (!calculation.ok) {
      return NextResponse.json(
        { ok: false, error: calculation.error },
        { status: 400 }
      );
    }

    return NextResponse.json(calculation, { status: 200 });
  } catch (error: any) {
    console.error("Erro ao calcular cotação de frete:", error);
    return NextResponse.json(
      {
        ok: false,
        error: "Erro interno no servidor ao calcular frete: " + (error?.message || "Desconhecido"),
      },
      { status: 500 }
    );
  }
}
