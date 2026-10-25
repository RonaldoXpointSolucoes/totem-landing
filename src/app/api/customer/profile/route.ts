import { NextResponse } from "next/server";
import { getCustomerSession, setCustomerSession } from "@/lib/customers/customerSession";
import { updateCustomer, addOrUpdateCustomerAddress, findCustomerById } from "@/lib/customers/customerStore";
import { DeliveryAddress } from "@/types/order";

export async function GET() {
  try {
    const sessionCustomer = await getCustomerSession();
    if (!sessionCustomer) {
      return NextResponse.json(
        { ok: false, authenticated: false, error: "Cliente não autenticado" },
        { status: 401 }
      );
    }
    const customer = findCustomerById(sessionCustomer.id) || sessionCustomer;
    return NextResponse.json({ ok: true, authenticated: true, customer });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const sessionCustomer = await getCustomerSession();
    if (!sessionCustomer) {
      return NextResponse.json(
        { ok: false, authenticated: false, error: "Cliente não autenticado" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { name, document, personType, whatsapp, address, setAsDefaultAddress } = body;

    let updated = findCustomerById(sessionCustomer.id) || sessionCustomer;

    const updates: any = {};
    if (name && typeof name === "string" && name.trim()) {
      updates.name = name.trim();
    }
    if (document !== undefined && typeof document === "string") {
      updates.document = document.trim();
    }
    if (personType === "individual" || personType === "company") {
      updates.personType = personType;
    }
    if (whatsapp && typeof whatsapp === "string") {
      updates.whatsapp = whatsapp.trim();
    }

    if (Object.keys(updates).length > 0) {
      const res = updateCustomer(sessionCustomer.id, updates);
      if (res) updated = res;
    }

    if (address && address.cep && address.street && address.number) {
      const addrRes = addOrUpdateCustomerAddress(
        sessionCustomer.id,
        address as DeliveryAddress,
        setAsDefaultAddress !== false
      );
      if (addrRes) updated = addrRes;
    }

    await setCustomerSession(updated);

    return NextResponse.json({
      ok: true,
      customer: updated,
      message: "Perfil do cliente atualizado com sucesso.",
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
