import { NextResponse } from "next/server";
import { loginOrCreateWithWhatsapp, loginOrCreateWithGoogle } from "@/lib/customers/customerStore";
import { setCustomerSession } from "@/lib/customers/customerSession";

interface LoginBody {
  method: "whatsapp" | "google";
  whatsapp?: string;
  name?: string;
  email?: string;
  avatarUrl?: string;
  credential?: string; // Google ID Token
}

export async function POST(req: Request) {
  try {
    const body: LoginBody = await req.json();

    if (body.method === "whatsapp") {
      if (!body.whatsapp) {
        return NextResponse.json(
          { ok: false, error: "Informe seu número de WhatsApp com DDD." },
          { status: 400 }
        );
      }

      const customer = loginOrCreateWithWhatsapp(body.whatsapp, body.name);
      await setCustomerSession(customer);

      return NextResponse.json({
        ok: true,
        message: "Login realizado com sucesso via WhatsApp.",
        customer,
      });
    }

    if (body.method === "google") {
      let email = body.email;
      let name = body.name || "Cliente Google";
      let avatarUrl = body.avatarUrl;

      // Se passou token JWT do Google Identity
      if (body.credential) {
        try {
          const parts = body.credential.split(".");
          if (parts.length === 3) {
            const payloadJson = Buffer.from(parts[1], "base64url").toString("utf-8");
            const decoded = JSON.parse(payloadJson);
            if (decoded.email) {
              email = decoded.email;
              name = decoded.name || decoded.given_name || name;
              avatarUrl = decoded.picture || avatarUrl;
            }
          }
        } catch (e) {
          console.warn("Falha ao decodificar token Google:", e);
        }
      }

      if (!email || !email.includes("@")) {
        return NextResponse.json(
          { ok: false, error: "E-mail da Conta Google não fornecido ou inválido." },
          { status: 400 }
        );
      }

      const customer = loginOrCreateWithGoogle(email, name, avatarUrl);
      await setCustomerSession(customer);

      return NextResponse.json({
        ok: true,
        message: "Login realizado com sucesso via Google.",
        customer,
      });
    }

    return NextResponse.json(
      { ok: false, error: "Método de login inválido. Use 'whatsapp' ou 'google'." },
      { status: 400 }
    );
  } catch (err: any) {
    console.error("DEBUG CUSTOMER LOGIN ERROR:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Erro no processamento do login." },
      { status: 500 }
    );
  }
}
