import { NextResponse } from "next/server";
import { clearCustomerSession } from "@/lib/customers/customerSession";

export async function POST() {
  try {
    await clearCustomerSession();
    return NextResponse.json({ ok: true, message: "Sessão encerrada com sucesso." });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: "Erro ao sair: " + error.message },
      { status: 500 }
    );
  }
}
