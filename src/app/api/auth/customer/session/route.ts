import { NextResponse } from "next/server";
import { getCustomerSession } from "@/lib/customers/customerSession";

export async function GET() {
  try {
    const customer = await getCustomerSession();
    if (!customer) {
      return NextResponse.json(
        { ok: true, authenticated: false, customer: null },
        { status: 200 }
      );
    }

    return NextResponse.json({
      ok: true,
      authenticated: true,
      customer,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: "Erro ao verificar sessão: " + error.message },
      { status: 500 }
    );
  }
}
