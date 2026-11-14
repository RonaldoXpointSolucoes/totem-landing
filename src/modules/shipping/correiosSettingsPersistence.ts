import { APPWRITE_CONFIG } from "@/lib/appwrite/config";
import { getServerDatabases } from "@/lib/appwrite/server";

export const APP_SETTINGS_COLLECTION_ID = "app_settings";
export const CORREIOS_SETTINGS_DOC_ID = "correios_contract_config";

export interface AppSettingsDatabasesLike {
  getCollection(params: { databaseId: string; collectionId: string }): Promise<any>;
  createCollection(
    databaseId: string,
    collectionId: string,
    name: string,
    permissions?: string[],
    documentSecurity?: boolean,
    enabled?: boolean
  ): Promise<any>;
  listAttributes(databaseId: string, collectionId: string): Promise<{ attributes?: any[] }>;
  createStringAttribute(
    databaseId: string,
    collectionId: string,
    key: string,
    size: number,
    required: boolean
  ): Promise<any>;
  getDocument(databaseId: string, collectionId: string, documentId: string): Promise<any>;
  updateDocument(
    databaseId: string,
    collectionId: string,
    documentId: string,
    data: Record<string, any>
  ): Promise<any>;
  createDocument(
    databaseId: string,
    collectionId: string,
    documentId: string,
    data: Record<string, any>
  ): Promise<any>;
}

const CACHE_TTL_MS = 15_000;
let cachedSettings: Record<string, any> | null = null;
let cachedAtMs = 0;
let ensureCollectionPromise: Promise<boolean> | null = null;

function hasUsableAppwriteServerConfig(): boolean {
  const key = (
    process.env.APPWRITE_API_KEY !== undefined ? process.env.APPWRITE_API_KEY : APPWRITE_CONFIG.apiKey || ""
  ).trim();
  return Boolean(key && !key.includes("placeholder"));
}

function isNotFoundError(err: any): boolean {
  return (
    err?.code === 404 ||
    err?.status === 404 ||
    err?.type === "collection_not_found" ||
    err?.type === "document_not_found"
  );
}

function isAlreadyExistsError(err: any): boolean {
  return err?.code === 409 || err?.type === "collection_already_exists" || err?.type === "attribute_already_exists";
}

export function invalidatePersistentCorreiosConfigCache(): void {
  cachedSettings = null;
  cachedAtMs = 0;
}

export function getCachedPersistentCorreiosConfig(): Record<string, any> | null {
  return cachedSettings;
}

/**
 * Garante de forma idempotente a coleção server-side `app_settings` no Appwrite (`totem_db`),
 * protegida sem permissões públicas para armazenar credenciais CWS e endereços de coleta entre deploys.
 */
export async function ensureAppSettingsCollection(
  customDb?: AppSettingsDatabasesLike
): Promise<boolean> {
  if (!customDb && !hasUsableAppwriteServerConfig()) {
    return false;
  }

  if (!customDb && ensureCollectionPromise) {
    return ensureCollectionPromise;
  }

  const run = async (): Promise<boolean> => {
    const db = (customDb || getServerDatabases()) as AppSettingsDatabasesLike;
    const databaseId = APPWRITE_CONFIG.databaseId;

    try {
      await db.getCollection({ databaseId, collectionId: APP_SETTINGS_COLLECTION_ID });
      return true;
    } catch (err: any) {
      if (!isNotFoundError(err)) {
        throw err;
      }
    }

    try {
      await db.createCollection(
        databaseId,
        APP_SETTINGS_COLLECTION_ID,
        "Configurações Globais Totem Pro",
        [],
        false,
        true
      );
    } catch (err: any) {
      if (!isAlreadyExistsError(err)) {
        throw err;
      }
    }

    const requiredAttrs: Array<{ key: string; size: number; required: boolean }> = [
      { key: "key", size: 128, required: true },
      { key: "value_json", size: 65535, required: true },
      { key: "updated_at", size: 64, required: false },
    ];

    for (const attr of requiredAttrs) {
      try {
        await db.createStringAttribute(
          databaseId,
          APP_SETTINGS_COLLECTION_ID,
          attr.key,
          attr.size,
          attr.required
        );
      } catch (err: any) {
        if (!isAlreadyExistsError(err)) {
          throw err;
        }
      }
    }

    // Aguarda os atributos ficarem 'available' no Appwrite antes do primeiro write/read
    for (let attempt = 0; attempt < 12; attempt++) {
      try {
        const listed = await db.listAttributes(databaseId, APP_SETTINGS_COLLECTION_ID);
        const attrs = listed?.attributes || [];
        const allReady = requiredAttrs.every((req) =>
          attrs.some((a: any) => a.key === req.key && (!a.status || a.status === "available"))
        );
        if (allReady) break;
      } catch {
        // Ignora erro transitório enquanto Appwrite provisiona o índice
      }
      await new Promise((r) => setTimeout(r, 350));
    }

    return true;
  };

  if (customDb) {
    return run();
  }

  ensureCollectionPromise = run().catch((err) => {
    ensureCollectionPromise = null;
    console.warn("[CORREIOS_PERSISTENCE] Falha ao garantir coleção app_settings:", err?.message || err);
    return false;
  });
  return ensureCollectionPromise;
}

/**
 * Carrega as configurações persistentes dos Correios do Appwrite (`totem_db.app_settings`).
 */
export async function loadPersistentCorreiosConfig(options?: {
  forceRefresh?: boolean;
  db?: AppSettingsDatabasesLike;
}): Promise<Record<string, any> | null> {
  const customDb = options?.db;
  if (!customDb && !hasUsableAppwriteServerConfig()) {
    return null;
  }

  if (!options?.forceRefresh && cachedSettings && Date.now() - cachedAtMs < CACHE_TTL_MS && !customDb) {
    return cachedSettings;
  }

  try {
    const db = (customDb || getServerDatabases()) as AppSettingsDatabasesLike;
    const ready = await ensureAppSettingsCollection(customDb);
    if (!ready) return null;

    const doc = await db.getDocument(
      APPWRITE_CONFIG.databaseId,
      APP_SETTINGS_COLLECTION_ID,
      CORREIOS_SETTINGS_DOC_ID
    );
    if (!doc?.value_json) return null;

    const parsed = JSON.parse(String(doc.value_json));
    if (parsed && typeof parsed === "object") {
      cachedSettings = parsed;
      cachedAtMs = Date.now();
      return parsed;
    }
    return null;
  } catch (err: any) {
    if (!isNotFoundError(err)) {
      console.warn("[CORREIOS_PERSISTENCE] Erro ao ler configurações no Appwrite:", err?.message || err);
    }
    return null;
  }
}

/**
 * Persiste as configurações dos Correios no Appwrite para sobreviver a qualquer redeploy no Coolify.
 */
export async function savePersistentCorreiosConfig(
  config: Record<string, any>,
  customDb?: AppSettingsDatabasesLike
): Promise<boolean> {
  cachedSettings = { ...config };
  cachedAtMs = Date.now();

  if (!customDb && !hasUsableAppwriteServerConfig()) {
    return false;
  }

  try {
    const db = (customDb || getServerDatabases()) as AppSettingsDatabasesLike;
    const ready = await ensureAppSettingsCollection(customDb);
    if (!ready) return false;

    const databaseId = APPWRITE_CONFIG.databaseId;
    const payload = {
      key: CORREIOS_SETTINGS_DOC_ID,
      value_json: JSON.stringify(config),
      updated_at: new Date().toISOString(),
    };

    try {
      await db.updateDocument(databaseId, APP_SETTINGS_COLLECTION_ID, CORREIOS_SETTINGS_DOC_ID, payload);
      return true;
    } catch (err: any) {
      if (!isNotFoundError(err)) {
        throw err;
      }
      await db.createDocument(databaseId, APP_SETTINGS_COLLECTION_ID, CORREIOS_SETTINGS_DOC_ID, payload);
      return true;
    }
  } catch (err: any) {
    console.warn("[CORREIOS_PERSISTENCE] Erro ao persistir configurações no Appwrite:", err?.message || err);
    return false;
  }
}
