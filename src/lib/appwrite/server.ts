import { Client, Databases, ID, Query } from "node-appwrite";
import { APPWRITE_CONFIG } from "./config";
import { CustomerInfo, DeliveryAddress, OrderStatus } from "@/types/order";

let serverDatabases: Databases | null = null;

export function getServerDatabases(): Databases {
  if (!serverDatabases) {
    const client = new Client()
      .setEndpoint(APPWRITE_CONFIG.endpoint)
      .setProject(APPWRITE_CONFIG.projectId)
      .setKey(APPWRITE_CONFIG.apiKey);

    serverDatabases = new Databases(client);
  }
  return serverDatabases;
}

export interface OrderItemSnapshot {
  cabinetName: string;
  colorName: string;
  monitorName?: string;
  printerName?: string;
  readerName?: string;
  unitPriceCents: number;
  quantity: number;
  subtotalCents: number;
}

export interface SaveOrderPayload {
  orderNumber: string;
  customer: CustomerInfo;
  deliveryAddress: DeliveryAddress;
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  status?: OrderStatus;
  manufacturingSheetJson?: string;
  items: OrderItemSnapshot[];
  payment: {
    provider: string;
    amountCents: number;
    status: string;
    pixCode: string;
    expiresAt: string;
  };
}

/**
 * Salva uma ordem de pedido completa com Snapshot Imutável de venda no Appwrite.
 * Garante que alterações futuras no catálogo não modifiquem os itens e preços do pedido original.
 */
export async function saveOrderWithSnapshot(payload: SaveOrderPayload) {
  const db = getServerDatabases();
  const dbId = APPWRITE_CONFIG.databaseId;
  const cols = APPWRITE_CONFIG.collections;

  // 1. Criar Documento na Coleção 'orders'
  const orderDocId = ID.unique();
  const orderDoc = await db.createDocument(
    dbId,
    cols.orders,
    orderDocId,
    {
      order_number: payload.orderNumber,
      status: payload.status || "awaiting_payment",
      customer_name: payload.customer.name,
      customer_document: payload.customer.document,
      customer_email: payload.customer.email,
      customer_whatsapp: payload.customer.whatsapp,
      delivery_address_json: JSON.stringify(payload.deliveryAddress),
      subtotal_cents: payload.subtotalCents,
      shipping_cents: payload.shippingCents,
      total_cents: payload.totalCents,
      manufacturing_sheet_json: payload.manufacturingSheetJson || "",
    }
  );

  // 2. Criar Itens com Snapshots Imutáveis na Coleção 'order_items'
  const createdItems = [];
  for (const item of payload.items) {
    const itemDocId = ID.unique();
    const itemDoc = await db.createDocument(
      dbId,
      cols.orderItems,
      itemDocId,
      {
        order_id: orderDoc.$id,
        cabinet_name: item.cabinetName,
        color_name: item.colorName,
        monitor_name: item.monitorName || "Nenhum",
        printer_name: item.printerName || "Nenhum",
        reader_name: item.readerName || "Nenhum",
        unit_price_cents: item.unitPriceCents,
        quantity: item.quantity,
        subtotal_cents: item.subtotalCents,
      }
    );
    createdItems.push(itemDoc);
  }

  // 3. Criar Transação de Pagamento na Coleção 'payments'
  const paymentDocId = ID.unique();
  const paymentDoc = await db.createDocument(
    dbId,
    cols.payments,
    paymentDocId,
    {
      order_id: orderDoc.$id,
      provider: payload.payment.provider,
      amount_cents: payload.payment.amountCents,
      status: payload.payment.status,
      pix_code: payload.payment.pixCode,
      expires_at: payload.payment.expiresAt,
    }
  );

  return {
    orderId: orderDoc.$id,
    orderNumber: payload.orderNumber,
    items: createdItems,
    payment: paymentDoc,
  };
}

/**
 * Consulta pedido completo com snapshot histórico.
 */
export async function getOrderWithDetails(orderId: string) {
  const db = getServerDatabases();
  const dbId = APPWRITE_CONFIG.databaseId;
  const cols = APPWRITE_CONFIG.collections;

  try {
    let orderDoc;
    if (orderId.startsWith("TOT-")) {
      const searchRes = await db.listDocuments(dbId, cols.orders, [
        Query.equal("order_number", orderId),
        Query.limit(1),
      ]);
      if (searchRes.total === 0) return null;
      orderDoc = searchRes.documents[0];
    } else {
      orderDoc = await db.getDocument(dbId, cols.orders, orderId);
    }

    const itemsRes = await db.listDocuments(dbId, cols.orderItems, [
      Query.equal("order_id", orderDoc.$id),
      Query.limit(100),
    ]);

    const paymentsRes = await db.listDocuments(dbId, cols.payments, [
      Query.equal("order_id", orderDoc.$id),
      Query.orderDesc("$createdAt"),
      Query.limit(1),
    ]);

    return {
      order: orderDoc,
      items: itemsRes.documents,
      payment: paymentsRes.documents[0] || null,
    };
  } catch (err) {
    console.error("Erro ao buscar pedido no Appwrite:", err);
    return null;
  }
}

/**
 * Carrega o catálogo dinâmico completo do Appwrite.
 */
export async function getAppwriteCatalog() {
  const db = getServerDatabases();
  const dbId = APPWRITE_CONFIG.databaseId;
  const cols = APPWRITE_CONFIG.collections;

  const [modelsRes, colorsRes, monitorsRes, printersRes, readersRes] =
    await Promise.all([
      db.listDocuments(dbId, cols.cabinetModels, [
        Query.equal("active", true),
        Query.orderAsc("sort_order"),
      ]),
      db.listDocuments(dbId, cols.colors, [Query.equal("active", true)]),
      db.listDocuments(dbId, cols.monitors, [Query.equal("active", true)]),
      db.listDocuments(dbId, cols.printers, [Query.equal("active", true)]),
      db.listDocuments(dbId, cols.barcodeReaders, [Query.equal("active", true)]),
    ]);

  return {
    cabinetModels: modelsRes.documents.map((doc: any) => ({
      id: doc.$id,
      name: doc.name,
      slug: doc.slug,
      description: doc.description,
      basePriceCents: doc.base_price_cents,
      active: doc.active,
      sortOrder: doc.sort_order,
      mainImage: doc.main_image,
      dimensions: doc.dimensions_json ? JSON.parse(doc.dimensions_json) : undefined,
    })),
    colors: colorsRes.documents.map((doc: any) => ({
      id: doc.$id,
      name: doc.name,
      slug: doc.slug,
      hexReference: doc.hex_reference,
      priceAdjustmentCents: doc.price_adjustment_cents || 0,
      active: doc.active,
      image: doc.image || "",
    })),
    monitors: monitorsRes.documents.map((doc: any) => ({
      id: doc.$id,
      brand: doc.brand,
      model: doc.model,
      displayName: doc.display_name,
      sizeInches: doc.size ? parseFloat(doc.size) : undefined,
      vesaPattern: doc.vesa_pattern,
      technicalCode: doc.technical_code,
      notes: doc.notes,
      active: doc.active,
      image: doc.image,
    })),
    printers: printersRes.documents.map((doc: any) => ({
      id: doc.$id,
      brand: doc.brand,
      model: doc.model,
      displayName: doc.display_name,
      paperWidthMm: doc.paper_width_mm,
      technicalCode: doc.technical_code,
      notes: doc.notes,
      active: doc.active,
      image: doc.image,
    })),
    barcodeReaders: readersRes.documents.map((doc: any) => ({
      id: doc.$id,
      brand: doc.brand,
      model: doc.model,
      displayName: doc.display_name,
      is2D: doc.is_2d,
      technicalCode: doc.technical_code,
      notes: doc.notes,
      active: doc.active,
      image: doc.image,
    })),
  };
}
