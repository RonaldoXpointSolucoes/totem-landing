import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAuthSession, LEGACY_ADMIN_COOKIE, LEGACY_SECRET } from "@/lib/auth/session";
import { getOrderWithDetails, updateOrderAdmin } from "@/lib/appwrite/server";
import { findOrderByNumber, updateLocalOrderAdmin } from "@/lib/orders/orderStore";
import {
  getCorreiosContractConfig,
  saveCorreiosContractConfig,
  authenticateCorreiosCws,
  buildDefaultVolumesFromOrder,
  launchOrderCorreiosPrepostagem,
  sanitizeExistingShipment,
  lookupDneCep,
} from "@/modules/shipping/correiosPrepostagemService";
import { logEcosystemEvent } from "@/lib/logging/ecosystemLogger";

async function verifyAuth(): Promise<boolean> {
  const session = await getAuthSession();
  if (session && session.role === "admin") return true;

  const cookieStore = await cookies();
  const token = cookieStore.get(LEGACY_ADMIN_COOKIE)?.value;
  return token === LEGACY_SECRET;
}

async function resolveOrderData(id: string) {
  let appwriteOrder: any = null;
  let appwriteItems: any[] = [];
  try {
    const res = await getOrderWithDetails(id);
    if (res?.order) {
      appwriteOrder = res.order;
      appwriteItems = res.items || [];
    }
  } catch {}

  const localOrder = findOrderByNumber(appwriteOrder?.order_number || id);
  const orderNumber = appwriteOrder?.order_number || localOrder?.orderNumber || id;

  let parsedAddr: any = {};
  if (appwriteOrder?.delivery_address_json) {
    try {
      parsedAddr = JSON.parse(appwriteOrder.delivery_address_json);
    } catch {}
  } else if (localOrder?.deliveryAddress) {
    parsedAddr = { ...localOrder.deliveryAddress };
  }

  const items =
    appwriteItems.length > 0
      ? appwriteItems
      : (localOrder?.items || []).map((it) => ({
          cabinet_name: it.configuration.model.name,
          color_name: it.configuration.color.name,
          monitor_name: it.configuration.monitor?.displayName || "Nenhum",
          printer_name: it.configuration.printer?.displayName || "Nenhum",
          reader_name: it.configuration.barcodeReader?.displayName || "Nenhum",
          quantity: it.quantity,
          unit_price_cents: it.unitPriceCents,
          subtotal_cents: it.subtotalCents,
        }));

  return {
    id: appwriteOrder?.$id || localOrder?.id || id,
    orderNumber,
    customerName: appwriteOrder?.customer_name || localOrder?.customer?.name || "",
    customerDocument: appwriteOrder?.customer_document || localOrder?.customer?.document || "",
    customerEmail: appwriteOrder?.customer_email || localOrder?.customer?.email || "",
    customerWhatsapp: appwriteOrder?.customer_whatsapp || localOrder?.customer?.whatsapp || "",
    subtotalCents: appwriteOrder?.subtotal_cents ?? localOrder?.subtotalCents ?? 0,
    shippingCents: appwriteOrder?.shipping_cents ?? localOrder?.shippingCents ?? 0,
    totalCents: appwriteOrder?.total_cents ?? localOrder?.totalCents ?? 0,
    deliveryAddress: parsedAddr,
    shippingMethod: parsedAddr?.shippingMethod || localOrder?.shippingMethod || null,
    items,
  };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAuth = await verifyAuth();
  if (!isAuth) {
    return NextResponse.json({ ok: false, error: "Acesso não autorizado." }, { status: 401 });
  }

  try {
    const { id } = await params;
    const orderData = await resolveOrderData(id);
    const config = getCorreiosContractConfig();
    const defaultPlan = buildDefaultVolumesFromOrder({
      items: orderData.items,
      subtotal_cents: orderData.subtotalCents,
      total_cents: orderData.totalCents,
      shipping_method: orderData.shippingMethod,
      delivery_address: orderData.deliveryAddress,
    });

    const rawExistingShipment = orderData.deliveryAddress?.correiosShipment || null;
    const existingShipment = sanitizeExistingShipment(rawExistingShipment);

    if (
      rawExistingShipment &&
      existingShipment &&
      JSON.stringify(rawExistingShipment.volumes) !== JSON.stringify(existingShipment.volumes)
    ) {
      const cleanedAddr = {
        ...(orderData.deliveryAddress || {}),
        correiosShipment: existingShipment,
      };
      try {
        await updateOrderAdmin(orderData.id, {
          delivery_address_json: JSON.stringify(cleanedAddr),
        });
      } catch {}
      updateLocalOrderAdmin(orderData.orderNumber, {
        deliveryAddress: cleanedAddr,
      });
    }

    const baseRecipient = existingShipment?.recipient || {
      name: orderData.customerName,
      document: orderData.customerDocument,
      phone: orderData.customerWhatsapp,
      email: orderData.customerEmail,
      cep: orderData.deliveryAddress?.cep || "",
      street: orderData.deliveryAddress?.street || "",
      number: orderData.deliveryAddress?.number || "",
      complement: orderData.deliveryAddress?.complement || "",
      neighborhood: orderData.deliveryAddress?.neighborhood || "",
      city: orderData.deliveryAddress?.city || "",
      state: orderData.deliveryAddress?.state || "SP",
    };

    if (baseRecipient.cep && baseRecipient.cep.replace(/\D/g, "").length === 8) {
      const dne = await lookupDneCep(baseRecipient.cep);
      if (dne.ok) {
        if (!baseRecipient.street && dne.logradouro) baseRecipient.street = dne.logradouro;
        if (
          dne.bairro &&
          (!baseRecipient.neighborhood ||
            (dne.bairro.length > baseRecipient.neighborhood.length &&
              dne.bairro.toLowerCase().startsWith(baseRecipient.neighborhood.toLowerCase().slice(0, 10))))
        ) {
          baseRecipient.neighborhood = dne.bairro;
        }
        if (!baseRecipient.city && dne.localidade) baseRecipient.city = dne.localidade;
        if (!baseRecipient.state && dne.uf) baseRecipient.state = dne.uf;
      }
    }

    return NextResponse.json({
      ok: true,
      contractConfig: {
        ...config,
        hasCwsPassword: Boolean(config.cwsPassword && config.cwsPassword.trim()),
      },
      existingShipment,
      defaultDraft: {
        orderId: orderData.id,
        orderNumber: orderData.orderNumber,
        serviceCode: existingShipment?.serviceCode || defaultPlan.serviceCode,
        serviceName: existingShipment?.serviceName || defaultPlan.serviceName,
        pickupAddressId: existingShipment?.pickupAddressId || config.selectedPickupAddressId,
        invoiceNumber: existingShipment?.invoiceNumber || "",
        invoiceKey: existingShipment?.invoiceKey || "",
        observations: existingShipment?.observations || `Pedido #${orderData.orderNumber}`,
        recipient: baseRecipient,
        volumes: existingShipment?.volumes?.length ? existingShipment.volumes : defaultPlan.volumes,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: "Erro ao preparar dados da etiqueta Correios: " + error?.message },
      { status: 500 }
    );
  }
}

export async function POST(
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
    const action = body.action || "generate_label";

    if (action === "save_config" || action === "save_pickup_addresses") {
      const saved = saveCorreiosContractConfig(body.config || {});
      let authCheck: any = null;
      if (action === "save_config" && saved.cwsPassword && saved.cwsPassword.trim()) {
        authCheck = await authenticateCorreiosCws(saved);
      }
      return NextResponse.json({
        ok: true,
        message:
          action === "save_pickup_addresses"
            ? "Endereço de coleta salvo e definido como ativo!"
            : authCheck?.ok
            ? `Módulo CWS Correios Ativado e Autenticado com Sucesso (Cartão ${saved.postcardNumber})!`
            : "Configurações do Contrato Correios salvas com sucesso!",
        contractConfig: {
          ...saved,
          hasCwsPassword: Boolean(saved.cwsPassword && saved.cwsPassword.trim()),
        },
        authCheck,
      });
    }

    if (action === "test_cws_connection") {
      if (body.config) {
        saveCorreiosContractConfig(body.config);
      }
      const authRes = await authenticateCorreiosCws(body.config);
      const updatedCfg = getCorreiosContractConfig();
      return NextResponse.json({
        ok: authRes.ok,
        expiresAt: authRes.expiresAt,
        error: authRes.error,
        statusCode: authRes.statusCode,
        endpoint: authRes.endpoint,
        durationMs: authRes.durationMs,
        requestPayload: authRes.requestPayload,
        responsePayload: authRes.responsePayload,
        contractConfig: {
          ...updatedCfg,
          hasCwsPassword: Boolean(updatedCfg.cwsPassword && updatedCfg.cwsPassword.trim()),
        },
        message: authRes.ok
          ? `Módulo CWS Correios ATIVO! Autenticação validada com sucesso (HTTP ${authRes.statusCode || 201}) para o Cartão ${
              updatedCfg.postcardNumber
            }.`
          : authRes.error,
      });
    }

    const orderData = await resolveOrderData(id);
    const defaultPlan = buildDefaultVolumesFromOrder({
      items: orderData.items,
      subtotal_cents: orderData.subtotalCents,
      total_cents: orderData.totalCents,
      shipping_method: orderData.shippingMethod,
      delivery_address: orderData.deliveryAddress,
    });

    const recipientInput = body.recipient || {
      name: orderData.customerName,
      document: orderData.customerDocument,
      phone: orderData.customerWhatsapp,
      email: orderData.customerEmail,
      cep: orderData.deliveryAddress?.cep || "",
      street: orderData.deliveryAddress?.street || "",
      number: orderData.deliveryAddress?.number || "SN",
      complement: orderData.deliveryAddress?.complement || "",
      neighborhood: orderData.deliveryAddress?.neighborhood || "Centro",
      city: orderData.deliveryAddress?.city || "",
      state: orderData.deliveryAddress?.state || "SP",
    };

    const volumesInput =
      Array.isArray(body.volumes) && body.volumes.length > 0 ? body.volumes : defaultPlan.volumes;

    const launchRes = await launchOrderCorreiosPrepostagem({
      orderId: orderData.id,
      orderNumber: orderData.orderNumber,
      mode: body.mode === "simplified" ? "simplified" : "cws_live",
      serviceCode: body.serviceCode || defaultPlan.serviceCode,
      pickupAddressId: body.pickupAddressId,
      customSender: body.customSender,
      invoiceNumber: body.invoiceNumber || "",
      invoiceKey: body.invoiceKey || "",
      observations: body.observations || `Pedido #${orderData.orderNumber}`,
      recipient: recipientInput,
      volumes: volumesInput,
    });

    if (!launchRes.ok) {
      try {
        const failedStep = launchRes.breadcrumbs.find((b) => b.status === "error");
        logEcosystemEvent({
          category: "orders",
          level: "error",
          action: "Falha no Lançamento API Correios CWS",
          target: `Pedido #${orderData.orderNumber}`,
          details: `Falha na Etapa ${failedStep?.step || "?"}/7 (${failedStep?.title || "CWS"}): ${
            launchRes.error || launchRes.message
          }`,
          actor: "Admin",
          metadata: {
            orderId: orderData.id,
            orderNumber: orderData.orderNumber,
            failedStep: failedStep?.code,
            breadcrumbs: launchRes.breadcrumbs,
          },
        });
      } catch {}

      return NextResponse.json({
        ok: false,
        modeUsed: launchRes.modeUsed,
        error: launchRes.error || launchRes.message,
        message: launchRes.message,
        breadcrumbs: launchRes.breadcrumbs,
        shipment: launchRes.shipment,
      });
    }

    const updatedDeliveryAddress = {
      ...(orderData.deliveryAddress || {}),
      cep: launchRes.shipment.recipient.cep || orderData.deliveryAddress?.cep || "",
      street: launchRes.shipment.recipient.street || orderData.deliveryAddress?.street || "",
      number: launchRes.shipment.recipient.number || orderData.deliveryAddress?.number || "",
      complement: launchRes.shipment.recipient.complement ?? orderData.deliveryAddress?.complement ?? "",
      neighborhood: launchRes.shipment.recipient.neighborhood || orderData.deliveryAddress?.neighborhood || "",
      city: launchRes.shipment.recipient.city || orderData.deliveryAddress?.city || "",
      state: launchRes.shipment.recipient.state || orderData.deliveryAddress?.state || "SP",
      correiosShipment: launchRes.shipment,
    };

    try {
      await updateOrderAdmin(orderData.id, {
        delivery_address_json: JSON.stringify(updatedDeliveryAddress),
      });
    } catch (err) {
      console.warn("[Correios Label Route] Aviso ao salvar no Appwrite:", err);
    }

    updateLocalOrderAdmin(orderData.orderNumber, {
      deliveryAddress: updatedDeliveryAddress,
    });

    try {
      const trackingList =
        launchRes.shipment.volumes
          .map((v) => v.trackingCode)
          .filter(Boolean)
          .join(", ") || "Sem código CWS (Endereçamento Simplificado)";
      logEcosystemEvent({
        category: "orders",
        level: "info",
        action:
          launchRes.modeUsed === "cws_live"
            ? "Pré-Postagem Oficial Correios CWS Lançada"
            : "Etiqueta de Endereçamento Simplificada Gerada",
        target: `Pedido #${orderData.orderNumber}`,
        details: `${launchRes.shipment.serviceName} (Contrato ${launchRes.shipment.contractNumber}) • ${launchRes.shipment.volumes.length} volume(s) • Rastreio: ${trackingList}`,
        actor: "Admin",
        metadata: {
          orderId: orderData.id,
          orderNumber: orderData.orderNumber,
          modeUsed: launchRes.modeUsed,
          serviceCode: launchRes.shipment.serviceCode,
          trackingCodes: launchRes.shipment.volumes.map((v) => v.trackingCode),
          breadcrumbs: launchRes.breadcrumbs,
        },
      });
    } catch {}

    return NextResponse.json({
      ok: true,
      modeUsed: launchRes.modeUsed,
      shipment: launchRes.shipment,
      breadcrumbs: launchRes.breadcrumbs,
      message: launchRes.message,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: "Erro interno ao processar etiqueta Correios: " + error?.message },
      { status: 500 }
    );
  }
}
