import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { updateOrderStatusAdmin } from "@/lib/appwrite/server";

const COOKIE_NAME = "totem_admin_token";
const SESSION_SECRET = "xpt_totem_admin_session_auth_token_99";

async function verifyAuth(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  return token === SESSION_SECRET;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAuth = await verifyAuth();
  if (!isAuth) {
    return NextResponse.json({ ok: false, error: "Acesso não autorizado." }, { status: 401 });
  }

  try {
    const { id } = await params;
    const { status } = await req.json();

    const validStatuses = [
      "awaiting_payment",
      "paid",
      "in_production",
      "ready",
      "shipped",
      "delivered",
      "cancelled",
    ];

    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { ok: false, error: `Status inválido. Permitidos: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    const updated = await updateOrderStatusAdmin(id, status);

    return NextResponse.json({
      ok: true,
      message: `Status do pedido atualizado para "${status}".`,
      data: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: "Erro ao atualizar status do pedido: " + error?.message },
      { status: 500 }
    );
  }
}
