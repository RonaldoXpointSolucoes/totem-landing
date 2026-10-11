import { NextResponse } from "next/server";
import { findUserByEmail, updateWhitelistUser } from "@/lib/auth/whitelistStore";
import { setAuthSession } from "@/lib/auth/session";

function decodeJwtPayload(token: string): { email?: string; name?: string; picture?: string } | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payloadJson = Buffer.from(parts[1], "base64url").toString("utf-8");
    return JSON.parse(payloadJson);
  } catch (err) {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    let email: string | undefined = body.email;
    let name: string | undefined = body.name;
    let avatarUrl: string | undefined = body.avatarUrl;

    // Se vier com o token JWT oficial do Google Identity (credential)
    if (body.credential) {
      const decoded = decodeJwtPayload(body.credential);
      if (decoded && decoded.email) {
        email = decoded.email;
        name = decoded.name || name;
        avatarUrl = decoded.picture || avatarUrl;
      }
    }

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { ok: false, error: "E-mail do Google inválido ou não informado." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await findUserByEmail(normalizedEmail);

    if (!user) {
      return NextResponse.json(
        {
          ok: false,
          error: `A conta Google (${normalizedEmail}) não possui autorização. Solicite ao administrador a inclusão do seu e-mail na Whitelist de acessos.`,
        },
        { status: 403 }
      );
    }

    if (user.status !== "active") {
      return NextResponse.json(
        {
          ok: false,
          error: `O acesso para a conta (${normalizedEmail}) está inativo ou suspenso.`,
        },
        { status: 403 }
      );
    }

    // Atualiza nome ou avatar se disponíveis
    if ((name && name !== user.name) || (avatarUrl && avatarUrl !== user.avatarUrl)) {
      await updateWhitelistUser(user.id, {
        name: name || user.name,
        avatarUrl: avatarUrl || user.avatarUrl,
      });
    }

    // Grava cookie de sessão HTTP-Only
    await setAuthSession(user);

    return NextResponse.json({
      ok: true,
      message: "Autenticação com Google bem-sucedida!",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        role: user.role,
        couponCode: user.couponCode,
        discountPercent: user.discountPercent,
        commissionPercent: user.commissionPercent,
      },
      redirectTo: user.role === "seller" ? "/vendedor" : "/admin",
    });
  } catch (error: any) {
    console.error("Erro na autenticação com Google:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Erro interno ao processar login com Google." },
      { status: 500 }
    );
  }
}
