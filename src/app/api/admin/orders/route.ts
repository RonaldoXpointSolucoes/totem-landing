import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { listAllOrdersAdmin } from "@/lib/appwrite/server";

const COOKIE_NAME = "totem_admin_token";
const SESSION_SECRET = "xpt_totem_admin_session_auth_token_99";

async function verifyAuth(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  return token === SESSION_SECRET;
}

export async function GET(req: Request) {
  const isAuth = await verifyAuth();
  if (!isAuth) {
    return NextResponse.json({ ok: false, error: "Acesso não autorizado." }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;

    const orders = await listAllOrdersAdmin(status);

    return NextResponse.json({
      ok: true,
      total: orders.length,
      data: orders,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: "Erro ao listar pedidos: " + error?.message },
      { status: 500 }
    );
  }
}
