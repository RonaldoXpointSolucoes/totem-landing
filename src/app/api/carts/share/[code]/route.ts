import { NextResponse } from "next/server";
import { getSharedCartByCode } from "@/lib/cart/sharedCartStore";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const result = await getSharedCartByCode(code, { incrementViews: true });

    if (!result) {
      return NextResponse.json(
        { ok: false, error: "Montagem compartilhada não encontrada ou indisponível." },
        { status: 404, headers: { "Cache-Control": "no-store" } }
      );
    }

    return NextResponse.json(
      { ok: true, assembly: result.assembly },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (err: any) {
    console.error("[GET /api/carts/share/[code]] Erro:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Erro interno ao consultar montagem compartilhada." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
