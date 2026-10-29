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

    const rawHeaders = (client as any).headers;
    if (rawHeaders && typeof rawHeaders === 'object') {
      delete rawHeaders['X-Appwrite-Response-Format'];
      delete rawHeaders['x-sdk-version'];
      rawHeaders['x-appwrite-response-format'] = '1.6.0';
    }

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
  shippingMethod?: {
    id: string;
    name: string;
    carrier: string;
    priceCents: number;
    deliveryDaysMin: number;
    deliveryDaysMax: number;
  } | null;
  couponCode?: string;
  discountCents?: number;
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
    method?: "pix" | "credit_card";
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
      delivery_address_json: JSON.stringify({
        ...payload.deliveryAddress,
        shippingMethod: payload.shippingMethod || null,
        paymentMethod: payload.payment.method || "pix",
        couponCode: payload.couponCode || null,
        discountCents: payload.discountCents || 0,
      }),
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
      ...(payload.payment.method ? { payment_method: payload.payment.method } : {}),
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

let cachedCatalogData: any = null;
let cachedCatalogTimestamp = 0;
let isRevalidatingCatalog = false;
const CATALOG_CACHE_TTL_MS = 5 * 60 * 1000; // 5 min de cache em memória + Stale-While-Revalidate (SWR)

export function invalidateCatalogCache() {
  cachedCatalogData = null;
  cachedCatalogTimestamp = 0;
}

import { getOptimizedImageUrl } from "@/lib/media/imageCache";

function toFastWebp(url: string): string {
  return getOptimizedImageUrl(url);
}

/**
 * Carrega o catálogo dinâmico completo do Appwrite com cache em memória e imagens WebP.
 */
export async function fetchCatalogFromAppwrite() {
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

  const result = {
    cabinetModels: modelsRes.documents.map((doc: any) => {
      let dims: any = undefined;
      try {
        if (doc.dimensions_json) dims = JSON.parse(doc.dimensions_json);
      } catch (e) {}

      let galleryImages = Array.isArray(dims?.images) ? dims.images : [doc.main_image];
      const nonSvgImages = galleryImages.filter(
        (img: string) => typeof img === "string" && !img.endsWith(".svg")
      );
      if (nonSvgImages.length > 0) {
        galleryImages = nonSvgImages;
      }

      const effectiveMainImage =
        doc.main_image && !doc.main_image.endsWith(".svg")
          ? doc.main_image
          : galleryImages[0] || doc.main_image;

      const videoList = Array.isArray(dims?.videoUrls)
        ? dims.videoUrls
        : Array.isArray(dims?.instagramVideos)
        ? dims.instagramVideos
        : [];

      const pixPrice =
        dims?.pixPriceCents ??
        dims?.pix_price_cents ??
        doc.pix_price_cents ??
        (doc.base_price_cents >= 120000 ? Math.round(doc.base_price_cents * 0.825) : doc.base_price_cents);
      const targetNet = dims?.targetNetCents ?? dims?.target_net_cents ?? doc.target_net_cents ?? pixPrice;
      const anchorPrice = dims?.anchorPriceCents ?? dims?.anchor_price_cents ?? doc.anchor_price_cents ?? Math.round(doc.base_price_cents * 1.15);
      const maxInst = dims?.maxInstallments ?? dims?.max_installments ?? doc.max_installments ?? 10;

      return {
        id: doc.$id,
        name: doc.name,
        slug: doc.slug,
        description: doc.description,
        basePriceCents: doc.base_price_cents,
        pixPriceCents: pixPrice,
        targetNetCents: targetNet,
        anchorPriceCents: anchorPrice,
        maxInstallments: maxInst,
        active: doc.active,
        sortOrder: doc.sort_order,
        mainImage: toFastWebp(effectiveMainImage),
        images: galleryImages.map((img: string) => toFastWebp(img)),
        videoUrls: videoList,
        instagramVideos: videoList,
        dimensions: dims,
      };
    }),
    colors: colorsRes.documents.map((doc: any) => ({
      id: doc.$id,
      name: doc.name,
      slug: doc.slug,
      hexReference: doc.hex_reference,
      priceAdjustmentCents: doc.price_adjustment_cents || 0,
      active: doc.active,
      sortOrder: typeof doc.sort_order === "number" ? doc.sort_order : (parseInt(doc.sort_order, 10) || 999),
      image: doc.image || "",
    })).sort((a: any, b: any) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999)),
    monitors: monitorsRes.documents.map((doc: any) => {
      let isKit = false;
      let kitItems = undefined;
      let priceAdjustmentCents = typeof doc.price_adjustment_cents === "number" ? doc.price_adjustment_cents : (parseInt(doc.price_adjustment_cents, 10) || 0);

      const name = (doc.display_name || doc.model || "").toLowerCase();
      if (doc.$id === "6ac6dbf90032d4f8586e" || name.includes("kit")) {
        isKit = true;
      }

      if (doc.notes && typeof doc.notes === "string" && doc.notes.includes("kitItems")) {
        try {
          const parsed = JSON.parse(doc.notes);
          if (Array.isArray(parsed.kitItems)) {
            kitItems = parsed.kitItems;
            isKit = true;
            priceAdjustmentCents = parsed.kitItems
              .filter((i: any) => i.selected)
              .reduce((acc: number, i: any) => acc + (i.priceCents || 0), 0);
          }
        } catch (e) {}
      }

      const sortOrderNum = typeof doc.sort_order === "number" ? doc.sort_order : (parseInt(doc.sort_order, 10) || 999);

      return {
        id: doc.$id,
        brand: doc.brand,
        model: doc.model,
        displayName: doc.display_name,
        sizeInches: doc.size ? parseFloat(doc.size) : undefined,
        vesaPattern: doc.vesa_pattern,
        technicalCode: doc.technical_code,
        notes: doc.notes,
        active: doc.active,
        image: toFastWebp(doc.image || ""),
        sortOrder: sortOrderNum,
        isKit,
        kitItems,
        priceAdjustmentCents,
      };
    }).sort((a: any, b: any) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999)),
    printers: printersRes.documents.map((doc: any) => ({
      id: doc.$id,
      brand: doc.brand,
      model: doc.model,
      displayName: doc.display_name,
      paperWidthMm: doc.paper_width_mm,
      technicalCode: doc.technical_code,
      notes: doc.notes,
      active: doc.active,
      sortOrder: typeof doc.sort_order === "number" ? doc.sort_order : (parseInt(doc.sort_order, 10) || 999),
      image: doc.image,
      priceAdjustmentCents: typeof doc.price_adjustment_cents === "number" ? doc.price_adjustment_cents : (parseInt(doc.price_adjustment_cents, 10) || 0),
    })).sort((a: any, b: any) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999)),
    barcodeReaders: readersRes.documents.map((doc: any) => ({
      id: doc.$id,
      brand: doc.brand,
      model: doc.model,
      displayName: doc.display_name,
      is2D: doc.is_2d,
      technicalCode: doc.technical_code,
      notes: doc.notes,
      active: doc.active,
      sortOrder: typeof doc.sort_order === "number" ? doc.sort_order : (parseInt(doc.sort_order, 10) || 999),
      image: doc.image,
      priceAdjustmentCents: typeof doc.price_adjustment_cents === "number" ? doc.price_adjustment_cents : (parseInt(doc.price_adjustment_cents, 10) || 0),
    })).sort((a: any, b: any) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999)),
  };
  cachedCatalogData = result;
  cachedCatalogTimestamp = Date.now();
  return result;
}

/**
 * Consulta administrativa de todos os itens do catálogo (ativos e inativos).
 */
export async function getAppwriteCatalog() {
  const now = Date.now();
  if (cachedCatalogData) {
    if (now - cachedCatalogTimestamp < CATALOG_CACHE_TTL_MS) {
      return cachedCatalogData;
    }
    if (!isRevalidatingCatalog) {
      isRevalidatingCatalog = true;
      fetchCatalogFromAppwrite()
        .catch(() => {})
        .finally(() => {
          isRevalidatingCatalog = false;
        });
    }
    return cachedCatalogData;
  }
  return fetchCatalogFromAppwrite();
}

export async function getAllCatalogAdmin() {
  const db = getServerDatabases();
  const dbId = APPWRITE_CONFIG.databaseId;
  const cols = APPWRITE_CONFIG.collections;

  const [modelsRes, colorsRes, monitorsRes, printersRes, readersRes] =
    await Promise.all([
      db.listDocuments(dbId, cols.cabinetModels, [Query.orderAsc("sort_order"), Query.limit(100)]),
      db.listDocuments(dbId, cols.colors, [Query.limit(100)]),
      db.listDocuments(dbId, cols.monitors, [Query.limit(100)]),
      db.listDocuments(dbId, cols.printers, [Query.limit(100)]),
      db.listDocuments(dbId, cols.barcodeReaders, [Query.limit(100)]),
    ]);

  return {
    models: modelsRes.documents,
    colors: colorsRes.documents,
    monitors: monitorsRes.documents,
    printers: printersRes.documents,
    readers: readersRes.documents,
  };
}

/**
 * Atualiza um item do catálogo (preço, status, descrição).
 */
export async function updateCatalogItemAdmin(collection: string, docId: string, data: Record<string, any>) {
  const db = getServerDatabases();
  const dbId = APPWRITE_CONFIG.databaseId;
  const res = await db.updateDocument(dbId, collection, docId, data);
  invalidateCatalogCache();
  return res;
}

/**
 * Cria um novo item no catálogo do Appwrite.
 */
export async function createCatalogItemAdmin(collection: string, data: Record<string, any>) {
  const db = getServerDatabases();
  const dbId = APPWRITE_CONFIG.databaseId;
  const res = await db.createDocument(dbId, collection, ID.unique(), data);
  invalidateCatalogCache();
  return res;
}

/**
 * Remove um item do catálogo no Appwrite.
 */
export async function deleteCatalogItemAdmin(collection: string, docId: string) {
  const db = getServerDatabases();
  const dbId = APPWRITE_CONFIG.databaseId;
  const res = await db.deleteDocument(dbId, collection, docId);
  invalidateCatalogCache();
  return res;
}

/**
 * Lista todos os pedidos para o painel administrativo com seus itens e pagamentos.
 */
export async function listAllOrdersAdmin(statusFilter?: string) {
  const db = getServerDatabases();
  const dbId = APPWRITE_CONFIG.databaseId;
  const cols = APPWRITE_CONFIG.collections;

  const queries = [Query.orderDesc("$createdAt"), Query.limit(50)];
  if (statusFilter && statusFilter !== "all") {
    queries.push(Query.equal("status", statusFilter));
  }

  const ordersRes = await db.listDocuments(dbId, cols.orders, queries);

  // Carrega itens e pagamentos vinculados
  const enrichedOrders = await Promise.all(
    ordersRes.documents.map(async (orderDoc: any) => {
      const [itemsRes, paymentsRes] = await Promise.all([
        db.listDocuments(dbId, cols.orderItems, [
          Query.equal("order_id", orderDoc.$id),
          Query.limit(50),
        ]),
        db.listDocuments(dbId, cols.payments, [
          Query.equal("order_id", orderDoc.$id),
          Query.orderDesc("$createdAt"),
          Query.limit(1),
        ]),
      ]);

      return {
        ...orderDoc,
        items: itemsRes.documents,
        payment: paymentsRes.documents[0] || null,
      };
    })
  );

  return enrichedOrders;
}

/**
 * Atualiza o status de um pedido e transita o pagamento se necessário.
 */
export async function updateOrderStatusAdmin(orderId: string, newStatus: string) {
  const db = getServerDatabases();
  const dbId = APPWRITE_CONFIG.databaseId;
  const cols = APPWRITE_CONFIG.collections;

  const updatedOrder = await db.updateDocument(dbId, cols.orders, orderId, {
    status: newStatus,
  });

  // Se o pedido foi marcado como pago, atualiza a transação Pix correspondente
  if (newStatus === "paid") {
    const paymentsRes = await db.listDocuments(dbId, cols.payments, [
      Query.equal("order_id", orderId),
      Query.limit(1),
    ]);
    if (paymentsRes.documents.length > 0) {
      await db.updateDocument(dbId, cols.payments, paymentsRes.documents[0].$id, {
        status: "paid",
        paid_at: new Date().toISOString(),
      });
    }
  }

  return updatedOrder;
}

export interface AdminOrderUpdatePayload {
  status?: string;
  customer_name?: string;
  customer_document?: string;
  customer_email?: string;
  customer_whatsapp?: string;
  subtotal_cents?: number;
  shipping_cents?: number;
  total_cents?: number;
  delivery_address_json?: string;
  manufacturing_sheet_json?: string;
  items?: {
    $id?: string;
    cabinet_name: string;
    color_name: string;
    monitor_name?: string;
    printer_name?: string;
    reader_name?: string;
    unit_price_cents: number;
    quantity: number;
    subtotal_cents: number;
  }[];
  payment_method?: "pix" | "credit_card";
}

/**
 * Atualiza integralmente os dados de um pedido, seus itens e método de pagamento no Appwrite.
 */
export async function updateOrderAdmin(orderId: string, payload: AdminOrderUpdatePayload) {
  const db = getServerDatabases();
  const dbId = APPWRITE_CONFIG.databaseId;
  const cols = APPWRITE_CONFIG.collections;

  const docUpdates: Record<string, any> = {};
  if (payload.status !== undefined) docUpdates.status = payload.status;
  if (payload.customer_name !== undefined) docUpdates.customer_name = payload.customer_name;
  if (payload.customer_document !== undefined) docUpdates.customer_document = payload.customer_document;
  if (payload.customer_email !== undefined) docUpdates.customer_email = payload.customer_email;
  if (payload.customer_whatsapp !== undefined) docUpdates.customer_whatsapp = payload.customer_whatsapp;
  if (payload.subtotal_cents !== undefined) docUpdates.subtotal_cents = payload.subtotal_cents;
  if (payload.shipping_cents !== undefined) docUpdates.shipping_cents = payload.shipping_cents;
  if (payload.total_cents !== undefined) docUpdates.total_cents = payload.total_cents;
  if (payload.delivery_address_json !== undefined) docUpdates.delivery_address_json = payload.delivery_address_json;
  if (payload.manufacturing_sheet_json !== undefined) docUpdates.manufacturing_sheet_json = payload.manufacturing_sheet_json;

  const updatedOrder = await db.updateDocument(dbId, cols.orders, orderId, docUpdates);

  // Atualiza itens vinculados se enviados
  if (Array.isArray(payload.items)) {
    const existingItemsRes = await db.listDocuments(dbId, cols.orderItems, [
      Query.equal("order_id", orderId),
      Query.limit(100),
    ]);
    const existingIds = new Set(existingItemsRes.documents.map((d: any) => d.$id));
    const incomingIds = new Set(payload.items.map((i) => i.$id).filter(Boolean));

    // Remove itens que foram excluídos na edição
    for (const oldDoc of existingItemsRes.documents) {
      if (!incomingIds.has(oldDoc.$id)) {
        try {
          await db.deleteDocument(dbId, cols.orderItems, oldDoc.$id);
        } catch {}
      }
    }

    // Atualiza ou cria itens
    for (const item of payload.items) {
      const itemData = {
        order_id: orderId,
        cabinet_name: item.cabinet_name,
        color_name: item.color_name,
        monitor_name: item.monitor_name || "Nenhum",
        printer_name: item.printer_name || "Nenhum",
        reader_name: item.reader_name || "Nenhum",
        unit_price_cents: Number(item.unit_price_cents) || 0,
        quantity: Number(item.quantity) || 1,
        subtotal_cents: Number(item.subtotal_cents) || 0,
      };
      if (item.$id && existingIds.has(item.$id)) {
        await db.updateDocument(dbId, cols.orderItems, item.$id, itemData);
      } else {
        await db.createDocument(dbId, cols.orderItems, ID.unique(), itemData);
      }
    }
  }

  // Sincroniza pagamento se status ou valor total mudou
  try {
    const paymentsRes = await db.listDocuments(dbId, cols.payments, [
      Query.equal("order_id", orderId),
      Query.limit(10),
    ]);
    if (paymentsRes.documents.length > 0) {
      const paymentDoc = paymentsRes.documents[0];
      const payUpdates: Record<string, any> = {};
      if (payload.total_cents !== undefined) payUpdates.amount_cents = payload.total_cents;
      if (payload.payment_method !== undefined) payUpdates.payment_method = payload.payment_method;
      if (payload.status === "paid" && paymentDoc.status !== "paid") {
        payUpdates.status = "paid";
        payUpdates.paid_at = new Date().toISOString();
      }
      if (Object.keys(payUpdates).length > 0) {
        await db.updateDocument(dbId, cols.payments, paymentDoc.$id, payUpdates);
      }
    }
  } catch {}

  return updatedOrder;
}

/**
 * Exclui permanentemente um pedido e todos os seus itens e registros de pagamento vinculados no Appwrite.
 */
export async function deleteOrderAdmin(orderId: string) {
  const db = getServerDatabases();
  const dbId = APPWRITE_CONFIG.databaseId;
  const cols = APPWRITE_CONFIG.collections;

  // 1. Buscar e remover order_items vinculados
  try {
    const itemsRes = await db.listDocuments(dbId, cols.orderItems, [
      Query.equal("order_id", orderId),
      Query.limit(100),
    ]);
    for (const itemDoc of itemsRes.documents) {
      await db.deleteDocument(dbId, cols.orderItems, itemDoc.$id);
    }
  } catch (err) {
    console.warn("Aviso ao excluir itens do pedido:", err);
  }

  // 2. Buscar e remover payments vinculados
  try {
    const paymentsRes = await db.listDocuments(dbId, cols.payments, [
      Query.equal("order_id", orderId),
      Query.limit(100),
    ]);
    for (const payDoc of paymentsRes.documents) {
      await db.deleteDocument(dbId, cols.payments, payDoc.$id);
    }
  } catch (err) {
    console.warn("Aviso ao excluir pagamentos do pedido:", err);
  }

  // 3. Excluir o documento principal do pedido
  await db.deleteDocument(dbId, cols.orders, orderId);
  return { deleted: true, orderId };
}


