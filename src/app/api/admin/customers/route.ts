import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAuthSession, LEGACY_ADMIN_COOKIE, LEGACY_SECRET } from "@/lib/auth/session";
import {
  getAllCustomers,
  updateCustomer,
  deleteCustomer,
  syncCustomersFromOrders,
  findCustomerById,
} from "@/lib/customers/customerStore";
import {
  getAllLocalOrders,
  updateLocalOrderAdmin,
  getOrdersByCustomer,
  deleteLocalOrder,
} from "@/lib/orders/orderStore";
import { listAllOrdersAdmin, updateOrderStatusAdmin } from "@/lib/appwrite/server";
import { logEcosystemEvent } from "@/lib/logging/ecosystemLogger";

async function verifyAdminAuth(): Promise<boolean> {
  const session = await getAuthSession();
  if (session && session.role === "admin") return true;

  const cookieStore = await cookies();
  const token = cookieStore.get(LEGACY_ADMIN_COOKIE)?.value;
  return token === LEGACY_SECRET;
}

export async function GET() {
  const isAuth = await verifyAdminAuth();
  if (!isAuth) {
    return NextResponse.json({ ok: false, error: "Acesso administrativo não autorizado." }, { status: 401 });
  }

  try {
    // 1. Carrega todos os pedidos do Appwrite e locais para consolidação
    let appwriteOrders: any[] = [];
    try {
      appwriteOrders = await listAllOrdersAdmin();
    } catch {
      // Continua se Appwrite offline
    }

    const localOrders = getAllLocalOrders();

    // Consolida pedidos unificados
    const ordersMap = new Map<string, any>();
    for (const o of appwriteOrders) {
      ordersMap.set(o.order_number, o);
    }
    for (const lo of localOrders) {
      if (!ordersMap.has(lo.orderNumber)) {
        ordersMap.set(lo.orderNumber, lo);
      }
    }
    const consolidatedOrders = Array.from(ordersMap.values());

    // 2. Executa a sincronização bidirecional garantindo que todo pedido tenha cliente
    const customers = syncCustomersFromOrders(consolidatedOrders);

    return NextResponse.json({
      ok: true,
      total: customers.length,
      customers,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: "Erro ao listar clientes: " + error.message },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  const isAuth = await verifyAdminAuth();
  if (!isAuth) {
    return NextResponse.json({ ok: false, error: "Acesso administrativo não autorizado." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, name, email, whatsapp, document, personType, notes, defaultAddress } = body;

    if (!id) {
      return NextResponse.json({ ok: false, error: "ID do cliente é obrigatório." }, { status: 400 });
    }

    const existing = findCustomerById(id);
    if (!existing) {
      return NextResponse.json({ ok: false, error: "Cliente não encontrado." }, { status: 404 });
    }

    const updated = updateCustomer(id, {
      ...(name !== undefined ? { name: name.trim() } : {}),
      ...(email !== undefined ? { email: email.trim().toLowerCase() } : {}),
      ...(whatsapp !== undefined ? { whatsapp } : {}),
      ...(document !== undefined ? { document: document.trim() } : {}),
      ...(personType !== undefined ? { personType } : {}),
      ...(notes !== undefined ? { notes } : {}),
      ...(defaultAddress !== undefined ? { defaultAddress } : {}),
    });

    // Se o nome foi alterado, propaga para os pedidos vinculados
    if (name && name.trim() !== existing.name) {
      const localOrders = getAllLocalOrders();
      for (const lo of localOrders) {
        if (
          (existing.email && lo.customer?.email?.toLowerCase() === existing.email.toLowerCase()) ||
          (existing.whatsapp && lo.customer?.whatsapp?.replace(/\D/g, "") === existing.whatsapp.replace(/\D/g, ""))
        ) {
          updateLocalOrderAdmin(lo.orderNumber, {
            customer: { ...lo.customer, name: name.trim() },
          });
        }
      }
    }

    // Registra no log de auditoria
    logEcosystemEvent({
      category: "customers",
      level: "info",
      action: "Cliente Atualizado",
      target: `Cliente ${updated?.name || id}`,
      details: `Dados cadastrais atualizados pelo administrador. E-mail: ${updated?.email}, Telefone: ${updated?.whatsappFormatted || updated?.whatsapp}.`,
      actor: "Admin",
      metadata: {
        customerId: id,
        previousName: existing.name,
        newName: updated?.name,
      },
    });

    return NextResponse.json({
      ok: true,
      customer: updated,
      message: "Cliente atualizado com sucesso.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: "Erro ao atualizar cliente: " + error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  const isAuth = await verifyAdminAuth();
  if (!isAuth) {
    return NextResponse.json({ ok: false, error: "Acesso administrativo não autorizado." }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ ok: false, error: "ID do cliente é obrigatório." }, { status: 400 });
    }

    const existing = findCustomerById(id);
    if (!existing) {
      return NextResponse.json({ ok: false, error: "Cliente não encontrado." }, { status: 404 });
    }

    const deleted = deleteCustomer(id);
    if (!deleted) {
      return NextResponse.json({ ok: false, error: "Não foi possível remover o cliente." }, { status: 500 });
    }

    // Remove também eventuais pedidos locais órfãos vinculados a este cliente
    try {
      const customerLocalOrders = getOrdersByCustomer(existing.email, existing.whatsapp);
      for (const lo of customerLocalOrders) {
        deleteLocalOrder(lo.id, lo.orderNumber);
      }
      if (existing.lastOrderNumber) {
        deleteLocalOrder(existing.lastOrderNumber);
      }
    } catch {}

    // Registra no log de auditoria
    logEcosystemEvent({
      category: "customers",
      level: "warn",
      action: "Cliente Excluído",
      target: `Cliente ${existing.name} (${existing.email || existing.whatsapp})`,
      details: `Cadastro removido pelo administrador. Histórico de pedidos mantido para fins fiscais.`,
      actor: "Admin",
      metadata: {
        customerId: id,
        deletedName: existing.name,
        ordersCount: existing.totalOrdersCount,
      },
    });

    return NextResponse.json({
      ok: true,
      message: `Cliente ${existing.name} excluído com sucesso.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: "Erro ao excluir cliente: " + error.message },
      { status: 500 }
    );
  }
}
