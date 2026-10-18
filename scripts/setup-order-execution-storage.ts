import { Client, Databases, Storage, Permission, Role } from "node-appwrite";
import { APPWRITE_CONFIG } from "../src/lib/appwrite/config";

export const ORDER_MEDIA_BUCKET_ID = "order_execution_media";

async function setupOrderExecutionStorage() {
  const client = new Client()
    .setEndpoint(APPWRITE_CONFIG.endpoint)
    .setProject(APPWRITE_CONFIG.projectId)
    .setKey(APPWRITE_CONFIG.apiKey);

  const db = new Databases(client);
  const storage = new Storage(client);
  const dbId = APPWRITE_CONFIG.databaseId;

  console.log("1. Verificando atributos da coleção 'orders'...");
  try {
    const col = await db.getCollection(dbId, APPWRITE_CONFIG.collections.orders);
    for (const attr of col.attributes as any[]) {
      console.log(` - ${attr.key} (${attr.type}): size=${attr.size}`);
      if (
        attr.type === "string" &&
        ["delivery_address_json", "manufacturing_sheet_json"].includes(attr.key) &&
        attr.size < 65535
      ) {
        console.log(`   -> Expandindo ${attr.key} de ${attr.size} para 65535...`);
        await (db as any).updateStringAttribute(
          dbId,
          APPWRITE_CONFIG.collections.orders,
          attr.key,
          attr.required || false,
          attr.default ?? null,
          65535
        );
        console.log(`   -> ${attr.key} expandido para 65535 com sucesso!`);
      }
    }
  } catch (err: any) {
    console.error("Erro ao inspecionar coleção orders:", err?.message);
  }

  console.log("\n2. Verificando Bucket de Mídias de Ordem de Execução no Appwrite Storage...");
  try {
    const existing = await storage.getBucket(ORDER_MEDIA_BUCKET_ID);
    console.log(` ✓ Bucket '${existing.$id}' (${existing.name}) já existe e está ativo!`);
  } catch {
    console.log(` -> Criando bucket '${ORDER_MEDIA_BUCKET_ID}' no Appwrite Storage...`);
    const created = await storage.createBucket(
      ORDER_MEDIA_BUCKET_ID,
      "Anexos e Mídias da Ordem de Execução (Fotos e Vídeos)",
      [Permission.read(Role.any())],
      false,
      true,
      50 * 1024 * 1024, // 50 MB max file size
      ["jpg", "jpeg", "png", "webp", "gif", "svg", "mp4", "webm", "mov", "m4v", "ogg", "pdf"]
    );
    console.log(` ✓ Bucket '${created.$id}' criado com sucesso!`);
  }
}

setupOrderExecutionStorage().catch((err) => {
  console.error("Erro fatal:", err);
  process.exit(1);
});
