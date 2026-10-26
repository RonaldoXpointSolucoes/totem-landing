import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  updateOrderStatusAdmin,
  updateOrderAdmin,
  deleteOrderAdmin,
  getOrderWithDetails,
} from "@/lib/appwrite/server";
import { getAuthSession, LEGACY_ADMIN_COOKIE, LEGACY_SECRET } from "@/lib/auth/session";
import {
  updateLocalOrderStatus,
  updateLocalOrderAdmin,
  deleteLocalOrder,
  findOrderByNumber,
} from "@/lib/orders/orderStore";
import { handleOrderDeletedForCustomers } from "@/lib/customers/customerStore";
import { logEcosystemEvent } from "@/lib/logging/ecosystemLogger";

async function verifyAuth(): Promise<boolean> {
  const session = await getAuthSession();
  if (session && session.role === "admin") return true;

  const cookieStore = await cookies();
  const token = cookieStore.get(LEGACY_ADMIN_COOKIE)?.value;
  return token === LEGACY_SECRET;
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
    const body = await req.json();

    const validStatuses = [
      "awaiting_custom_analysis",
      "custom_approved",
      "custom_rejected",
      "awaiting_payment",
      "paid",
      "in_production",
      "ready",
      "shipped",
      "delivered",
      "cancelled",
    ];

    if (body.status && !validStatuses.includes(body.status)) {
      return NextResponse.json(
        { ok: false, error: `Status inválido. Permitidos: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    // Caso seja apenas mudança rápida de status
    const isStatusOnly =
      Object.keys(body).length === 1 && typeof body.status === "string";

    let updated: any = null;
    if (isStatusOnly) {
      try {
        updated = await updateOrderStatusAdmin(id, body.status);
      } catch {
        // Se for apenas local
      }
      updateLocalOrderStatus(id, body.status);
    } else {
      try {
        updated = await updateOrderAdmin(id, {
          status: body.status,
          customer_name: body.customer_name,
          customer_document: body.customer_document,
          customer_email: body.customer_email,
          customer_whatsapp: body.customer_whatsapp,
          subtotal_cents: body.subtotal_cents,
          shipping_cents: body.shipping_cents,
          total_cents: body.total_cents,
          delivery_address_json: body.delivery_address_json,
          manufacturing_sheet_json: body.manufacturing_sheet_json,
          items: body.items,
          payment_method: body.payment_method,
        });
      } catch (err) {
        console.warn("Aviso ao atualizar no Appwrite (pode ser pedido local):", err);
      }

      const orderNumber = body.order_number || updated?.order_number || id;
      let parsedAddr: any = undefined;
      let parsedSheets: any = undefined;
      try {
        if (body.delivery_address_json) parsedAddr = JSON.parse(body.delivery_address_json);
      } catch {}
      try {
        if (body.manufacturing_sheet_json) parsedSheets = JSON.parse(body.manufacturing_sheet_json);
      } catch {}

      updateLocalOrderAdmin(orderNumber, {
        ...(body.status ? { status: body.status } : {}),
        ...(body.subtotal_cents !== undefined ? { subtotalCents: body.subtotal_cents } : {}),
        ...(body.shipping_cents !== undefined ? { shippingCents: body.shipping_cents } : {}),
        ...(body.total_cents !== undefined ? { totalCents: body.total_cents } : {}),
        ...(parsedAddr ? { deliveryAddress: parsedAddr } : {}),
        ...(parsedAddr?.shippingMethod ? { shippingMethod: parsedAddr.shippingMethod } : {}),
        ...(parsedSheets ? { manufacturingSheets: parsedSheets } : {}),
      });
    }

    // Sincroniza status do voucher associado a este pedido (libera comissão se pago)
    if (body.status) {
      try {
        const orderNumber = (updated as any)?.order_number || body.order_number || id;
        const { syncOrderStatusToVoucherUsage } = await import("@/lib/vouchers/voucherStore");
        await syncOrderStatusToVoucherUsage(orderNumber, body.status);
        await syncOrderStatusToVoucherUsage(id, body.status);
      } catch (syncErr) {
        console.warn("Aviso ao sincronizar status de voucher:", syncErr);
      }
    }

    try {
      const orderNumber = (updated as any)?.order_number || body.order_number || id;
      logEcosystemEvent({
        category: "orders",
        level: "info",
        action: isStatusOnly ? "Status Alterado" : "Pedido Atualizado",
        target: `Pedido #${orderNumber}`,
        details: isStatusOnly
          ? `Status do pedido #${orderNumber} atualizado para "${body.status}" no painel administrativo.`
          : `Dados cadastrais e ficha técnica do pedido #${orderNumber} atualizados no painel.`,
        actor: "Admin",
        metadata: {
          orderId: id,
          orderNumber,
          status: body.status,
          isStatusOnly,
          updatedFields: Object.keys(body),
        },
      });
    } catch {}

    return NextResponse.json({
      ok: true,
      message: isStatusOnly
        ? `Status do pedido atualizado para "${body.status}".`
        : "Pedido atualizado com sucesso!",
      data: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: "Erro ao atualizar pedido: " + error?.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAuth = await verifyAuth();
  if (!isAuth) {
    return NextResponse.json({ ok: false, error: "Acesso não autorizado." }, { status: 401 });
  }

  try {
    const { id } = await params;
    let orderNumber: string | undefined;

    try {
      const existing = await getOrderWithDetails(id);
      if (existing?.order?.order_number) {
        orderNumber = existing.order.order_number;
      }
    } catch {}

    if (!orderNumber) {
      const localExisting = findOrderByNumber(id);
      if (localExisting?.orderNumber) {
        orderNumber = localExisting.orderNumber;
      }
    }

    try {
      await deleteOrderAdmin(id);
    } catch (appwriteErr) {
      console.warn("Aviso ao excluir pedido no Appwrite:", appwriteErr);
    }

    deleteLocalOrder(id, orderNumber);
    handleOrderDeletedForCustomers(orderNumber || id, id);

    try {
      logEcosystemEvent({
        category: "orders",
        level: "warn",
        action: "Pedido Excluído",
        target: `Pedido #${orderNumber || id}`,
        details: `Pedido #${orderNumber || id} removido permanentemente do painel administrativo.`,
        actor: "Admin",
        metadata: { orderId: id, orderNumber },
      });
    } catch {}

    return NextResponse.json({
      ok: true,
      message: "Pedido excluído permanentemente com sucesso.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: "Erro ao excluir pedido: " + error?.message },
      { status: 500 }
    );
  }
}
