import fs from "fs";
import path from "path";
import { ID, Query } from "node-appwrite";
import { APPWRITE_CONFIG } from "@/lib/appwrite/config";
import { getAppwriteCatalog, getServerDatabases } from "@/lib/appwrite/server";
import { findUserByCoupon } from "@/lib/auth/whitelistStore";
import {
  CABINET_MODELS,
  COLOR_OPTIONS,
  HOMOLOGATED_MONITORS,
  HOMOLOGATED_PRINTERS,
  HOMOLOGATED_READERS,
} from "@/modules/catalog/catalogData";
import { SelectiveCoupon } from "@/modules/pricing/couponEngine";
import {
  generateShareCodeCandidate,
  hydrateSharedCartFromCatalog,
  normalizeShareCode,
  sanitizeSharedCartItemsInput,
} from "@/modules/cart/sharedAssembly";
import {
  HydratedSharedCartPayload,
  SharedCartItemInput,
  SharedCartRecord,
  SharedCatalogInput,
} from "@/types/sharedCart";

const DATA_DIR = path.join(process.cwd(), "src", "data");
const LOCAL_SHARED_CARTS_FILE = path.join(DATA_DIR, "shared_carts.json");

let collectionEnsured = false;

type AppwriteAdminResponse = { ok: boolean; status: number; data: any };
type AppwriteAdminRequester = (
  apiPath: string,
  method?: string,
  body?: unknown
) => Promise<AppwriteAdminResponse>;

async function appwriteAdminFetch(
  apiPath: string,
  method = "GET",
  body?: unknown
): Promise<AppwriteAdminResponse> {
  const apiKey = APPWRITE_CONFIG.apiKey || process.env.APPWRITE_API_KEY || "";
  if (!apiKey) return { ok: false, status: 401, data: null };

  try {
    const res = await fetch(`${APPWRITE_CONFIG.endpoint}${apiPath}`, {
      method,
      headers: {
        "X-Appwrite-Project": APPWRITE_CONFIG.projectId,
        "X-Appwrite-Key": apiKey,
        "Content-Type": "application/json",
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    let data: any = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: null };
  }
}

export async function provisionSharedCartsCollection(options?: {
  requester?: AppwriteAdminRequester;
  dbId?: string;
  colId?: string;
  pollIntervalMs?: number;
  maxPolls?: number;
}): Promise<boolean> {
  const req = options?.requester || appwriteAdminFetch;
  const dbId = options?.dbId || APPWRITE_CONFIG.databaseId;
  const colId = options?.colId || APPWRITE_CONFIG.collections.sharedCarts;
  const pollIntervalMs = options?.pollIntervalMs ?? 500;
  const maxPolls = options?.maxPolls ?? 16;

  const checkRes = await req(`/databases/${dbId}/collections/${colId}`, "GET");
  let existingData = checkRes.ok ? checkRes.data : null;

  if (!checkRes.ok) {
    if (checkRes.status !== 404) {
      return false;
    }

    // Provisionamento automático idempotente da coleção 'shared_carts'
    const createCol = await req(`/databases/${dbId}/collections`, "POST", {
      collectionId: colId,
      name: "Montagens Compartilhadas de Carrinho",
      permissions: [],
      documentSecurity: false,
    });

    if (!createCol.ok && createCol.status !== 409) {
      console.warn("[SharedCartStore] Falha ao criar coleção shared_carts:", createCol.data);
      return false;
    }

    const strAttrs: Array<[string, number, boolean, string | null]> = [
      ["share_code", 64, true, null],
      ["title", 160, false, ""],
      ["coupon_code", 64, false, ""],
      ["payload_json", 65535, true, null],
      ["created_at", 64, true, null],
    ];

    for (const [key, size, required, def] of strAttrs) {
      await req(`/databases/${dbId}/collections/${colId}/attributes/string`, "POST", {
        key,
        size,
        required,
        ...(required || def === null ? {} : { default: def }),
      });
    }

    const intAttrs: Array<[string, boolean, number | null]> = [
      ["items_count", true, null],
      ["pix_total_cents", true, null],
      ["card_total_cents", true, null],
      ["views_count", false, 0],
    ];

    for (const [key, required, def] of intAttrs) {
      await req(`/databases/${dbId}/collections/${colId}/attributes/integer`, "POST", {
        key,
        required,
        ...(required || def === null ? {} : { default: def }),
      });
    }
  }

  // Verifica e aguarda TODOS os 9 atributos ficarem 'available' ANTES de criar o índice
  let readyData: any = existingData;
  let allAttributesReady = false;

  const isCollectionReady = (colData: any): boolean => {
    const attrs = Array.isArray(colData?.attributes) ? colData.attributes : [];
    const availableCount = attrs.filter((a: any) => a.status === "available").length;
    const shareCodeReady = attrs.some(
      (a: any) => a.key === "share_code" && a.status === "available"
    );
    return availableCount >= 9 && shareCodeReady;
  };

  if (readyData && isCollectionReady(readyData)) {
    allAttributesReady = true;
  } else {
    for (let attempt = 0; attempt < maxPolls; attempt++) {
      await new Promise((r) => setTimeout(r, pollIntervalMs));
      const colInfo = await req(`/databases/${dbId}/collections/${colId}`, "GET");
      if (colInfo.ok && isCollectionReady(colInfo.data)) {
        readyData = colInfo.data;
        allAttributesReady = true;
        break;
      }
    }
  }

  if (!allAttributesReady) {
    return false;
  }

  const indexes = Array.isArray(readyData?.indexes) ? readyData.indexes : [];
  const hasShareCodeIndex = indexes.some(
    (idx: any) =>
      idx.key === "idx_shared_cart_code" ||
      (Array.isArray(idx.attributes) && idx.attributes.includes("share_code"))
  );

  if (!hasShareCodeIndex) {
    const idxRes = await req(`/databases/${dbId}/collections/${colId}/indexes`, "POST", {
      key: "idx_shared_cart_code",
      type: "key",
      attributes: ["share_code"],
    });
    if (!idxRes.ok && idxRes.status !== 409) {
      console.warn("[SharedCartStore] Falha ao criar índice idx_shared_cart_code:", idxRes.data);
      return false;
    }
  }

  return true;
}

export async function ensureSharedCartsCollection(): Promise<boolean> {
  const apiKey = APPWRITE_CONFIG.apiKey || process.env.APPWRITE_API_KEY || "";
  if (!apiKey) return false;
  if (collectionEnsured) return true;

  const ready = await provisionSharedCartsCollection();
  if (ready) {
    collectionEnsured = true;
  }
  return ready;
}

function readLocalSharedCarts(): SharedCartRecord[] {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(LOCAL_SHARED_CARTS_FILE)) {
      return [];
    }
    const raw = fs.readFileSync(LOCAL_SHARED_CARTS_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalSharedCarts(records: SharedCartRecord[]): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(LOCAL_SHARED_CARTS_FILE, JSON.stringify(records.slice(0, 500), null, 2), "utf-8");
  } catch (err) {
    console.warn("[SharedCartStore] Falha ao gravar cache local:", err);
  }
}

function upsertLocalSharedCart(record: SharedCartRecord): void {
  const all = readLocalSharedCarts();
  const idx = all.findIndex((r) => r.shareCode === record.shareCode);
  if (idx >= 0) {
    all[idx] = record;
  } else {
    all.unshift(record);
  }
  writeLocalSharedCarts(all);
}

export function deleteSharedCartLocalForTest(shareCode: string): void {
  const normalized = normalizeShareCode(shareCode);
  const all = readLocalSharedCarts();
  const filtered = all.filter((r) => r.shareCode !== normalized);
  if (filtered.length !== all.length) {
    writeLocalSharedCarts(filtered);
  }
}

async function loadLiveCatalogWithFallback(): Promise<SharedCatalogInput> {
  try {
    const live = await getAppwriteCatalog();
    if (live?.cabinetModels?.length && live?.colors?.length) {
      return {
        cabinetModels: live.cabinetModels,
        colors: live.colors,
        monitors: live.monitors?.length ? live.monitors : HOMOLOGATED_MONITORS,
        printers: live.printers?.length ? live.printers : HOMOLOGATED_PRINTERS,
        barcodeReaders: live.barcodeReaders?.length ? live.barcodeReaders : HOMOLOGATED_READERS,
      };
    }
  } catch {}

  return {
    cabinetModels: CABINET_MODELS,
    colors: COLOR_OPTIONS,
    monitors: HOMOLOGATED_MONITORS,
    printers: HOMOLOGATED_PRINTERS,
    barcodeReaders: HOMOLOGATED_READERS,
  };
}

async function resolveActiveSelectiveCoupon(couponCode?: string | null): Promise<SelectiveCoupon | null> {
  const cleanCode = (couponCode || "").trim().toUpperCase();
  if (!cleanCode) return null;
  try {
    const seller = await findUserByCoupon(cleanCode);
    if (!seller || seller.status !== "active") return null;
    return {
      code: seller.couponCode || cleanCode,
      sellerId: seller.id,
      sellerEmail: seller.email,
      sellerName: seller.name,
      discountPercent: seller.discountPercent || 10,
      commissionPercent: seller.commissionPercent || 8,
      active: true,
      eligibleCategory: "cabinet_only",
    };
  } catch {
    return null;
  }
}

async function shareCodeExistsInAppwrite(shareCode: string): Promise<boolean> {
  const apiKey = APPWRITE_CONFIG.apiKey || process.env.APPWRITE_API_KEY || "";
  if (!apiKey) return false;
  try {
    const db = getServerDatabases();
    const res = await db.listDocuments(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.collections.sharedCarts,
      [Query.equal("share_code", shareCode), Query.limit(1)]
    );
    return res.total > 0;
  } catch {
    return false;
  }
}

export async function createSharedCart(input: {
  title?: string;
  couponCode?: string | null;
  items: unknown[];
}) {
  const sanitizedItems = sanitizeSharedCartItemsInput(input.items);
  if (sanitizedItems.length === 0) {
    throw new Error("Adicione pelo menos 1 totem válido para compartilhar a montagem.");
  }

  const catalog = await loadLiveCatalogWithFallback();
  const validCoupon = await resolveActiveSelectiveCoupon(input.couponCode);
  const hydrated = hydrateSharedCartFromCatalog(sanitizedItems, catalog, validCoupon);

  if (hydrated.items.length === 0) {
    throw new Error("Nenhum item da montagem foi localizado no catálogo atual.");
  }

  const cleanTitle = (input.title || "").trim().slice(0, 120);

  let shareCode = generateShareCodeCandidate();
  const localRecords = readLocalSharedCarts();
  for (let i = 0; i < 6; i++) {
    const localHit = localRecords.some((r) => r.shareCode === shareCode);
    const remoteHit = await shareCodeExistsInAppwrite(shareCode);
    if (!localHit && !remoteHit) break;
    shareCode = generateShareCodeCandidate();
  }

  const createdAt = new Date().toISOString();
  const record: SharedCartRecord = {
    shareCode,
    title: cleanTitle,
    couponCode: validCoupon?.code || "",
    itemsCount: hydrated.itemsCount,
    pixTotalCents: hydrated.pixTotalCents,
    cardTotalCents: hydrated.cardTotalCents,
    viewsCount: 0,
    items: sanitizedItems,
    createdAt,
  };

  upsertLocalSharedCart(record);

  const apiKey = APPWRITE_CONFIG.apiKey || process.env.APPWRITE_API_KEY || "";
  if (apiKey) {
    try {
      await ensureSharedCartsCollection();
      const db = getServerDatabases();
      await db.createDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.collections.sharedCarts,
        ID.unique(),
        {
          share_code: record.shareCode,
          title: record.title,
          coupon_code: record.couponCode,
          items_count: record.itemsCount,
          pix_total_cents: record.pixTotalCents,
          card_total_cents: record.cardTotalCents,
          views_count: 0,
          payload_json: JSON.stringify({ items: sanitizedItems }),
          created_at: record.createdAt,
        }
      );
    } catch (err: any) {
      console.warn("[SharedCartStore] Aviso ao gravar montagem no Appwrite:", err?.message || err);
    }
  }

  return { record, hydrated };
}

export async function getSharedCartByCode(
  rawCode: string,
  options?: { incrementViews?: boolean }
): Promise<{ assembly: HydratedSharedCartPayload } | null> {
  const code = normalizeShareCode(rawCode);
  if (!code || code.length < 4) return null;

  let record: SharedCartRecord | null = null;
  let appwriteDocId: string | null = null;

  const apiKey = APPWRITE_CONFIG.apiKey || process.env.APPWRITE_API_KEY || "";
  if (apiKey) {
    try {
      const db = getServerDatabases();
      const res = await db.listDocuments(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.collections.sharedCarts,
        [Query.equal("share_code", code), Query.limit(1)]
      );
      if (res.documents.length > 0) {
        const doc: any = res.documents[0];
        appwriteDocId = doc.$id;
        let parsedItems: SharedCartItemInput[] = [];
        try {
          const parsedPayload = JSON.parse(doc.payload_json || "{}");
          parsedItems = sanitizeSharedCartItemsInput(parsedPayload.items || []);
        } catch {
          parsedItems = [];
        }
        record = {
          shareCode: doc.share_code,
          title: doc.title || "",
          couponCode: doc.coupon_code || "",
          itemsCount: Number(doc.items_count) || 0,
          pixTotalCents: Number(doc.pix_total_cents) || 0,
          cardTotalCents: Number(doc.card_total_cents) || 0,
          viewsCount: Number(doc.views_count) || 0,
          items: parsedItems,
          createdAt: doc.created_at || doc.$createdAt || new Date().toISOString(),
        };
      }
    } catch (err: any) {
      console.warn("[SharedCartStore] Fallback para cache local ao ler montagem:", err?.message || err);
    }
  }

  if (!record) {
    const local = readLocalSharedCarts().find((r) => normalizeShareCode(r.shareCode) === code);
    if (local) {
      record = { ...local };
    }
  }

  if (!record || record.items.length === 0) {
    return null;
  }

  const catalog = await loadLiveCatalogWithFallback();
  const validCoupon = await resolveActiveSelectiveCoupon(record.couponCode);
  const hydrated = hydrateSharedCartFromCatalog(record.items, catalog, validCoupon);

  const shouldIncrement = options?.incrementViews !== false;
  const nextViews = shouldIncrement ? (record.viewsCount || 0) + 1 : record.viewsCount || 0;

  if (shouldIncrement) {
    upsertLocalSharedCart({
      ...record,
      viewsCount: nextViews,
      pixTotalCents: hydrated.pixTotalCents,
      cardTotalCents: hydrated.cardTotalCents,
    });

    if (apiKey && appwriteDocId) {
      const db = getServerDatabases();
      db.updateDocument(APPWRITE_CONFIG.databaseId, APPWRITE_CONFIG.collections.sharedCarts, appwriteDocId, {
        views_count: nextViews,
      }).catch(() => {});
    }
  }

  return {
    assembly: {
      shareCode: record.shareCode,
      title: record.title,
      createdAt: record.createdAt,
      viewsCount: nextViews,
      items: hydrated.items,
      itemsCount: hydrated.itemsCount,
      coupon: hydrated.coupon,
      couponDiscountCents: hydrated.couponDiscountCents,
      pixSubtotalCents: hydrated.pixSubtotalCents,
      pixTotalCents: hydrated.pixTotalCents,
      cardTotalCents: hydrated.cardTotalCents,
      unavailableWarnings: hydrated.unavailableWarnings,
    },
  };
}
