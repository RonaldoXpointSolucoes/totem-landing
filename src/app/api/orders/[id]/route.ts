import { NextResponse } from "next/server";
import { getOrderWithDetails } from "@/lib/appwrite/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "ID do pedido não informado." }, { status: 400 });
    }

    const orderDetails = await getOrderWithDetails(id);
    if (!orderDetails) {
      return NextResponse.json({ error: "Pedido não encontrado no Appwrite." }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      data: orderDetails,
    });
  } catch (error: any) {
    console.error("Erro na busca de pedido:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor ao consultar pedido: " + (error?.message || "Desconhecido") },
      { status: 500 }
    );
  }
}
