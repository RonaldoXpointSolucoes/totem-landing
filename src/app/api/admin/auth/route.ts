import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "totem2026@admin";
const COOKIE_NAME = "totem_admin_token";
const SESSION_SECRET = "xpt_totem_admin_session_auth_token_99";

export async function POST(req: Request) {
  try {
    const { password } = await req.json();

    if (!password || password !== ADMIN_PASSWORD) {
      return NextResponse.json(
        { ok: false, error: "Senha de acesso administrativo inválida." },
        { status: 401 }
      );
    }

    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, SESSION_SECRET, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 dias
      path: "/",
    });

    return NextResponse.json({
      ok: true,
      message: "Autenticação administrativa bem-sucedida.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Erro de autenticação." },
      { status: 500 }
    );
  }
}

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (token === SESSION_SECRET) {
    return NextResponse.json({ ok: true, authenticated: true });
  }

  return NextResponse.json({ ok: false, authenticated: false }, { status: 401 });
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  return NextResponse.json({ ok: true, message: "Sessão encerrada com sucesso." });
}
