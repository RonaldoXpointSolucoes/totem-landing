import { Client, Databases } from "node-appwrite";
import { APPWRITE_CONFIG } from "../src/lib/appwrite/config";

async function checkAndUpgradeAllCollections() {
  const client = new Client()
    .setEndpoint(APPWRITE_CONFIG.endpoint)
    .setProject(APPWRITE_CONFIG.projectId)
    .setKey(APPWRITE_CONFIG.apiKey);
  const db = new Databases(client);
  const dbId = APPWRITE_CONFIG.databaseId;

  for (const [name, colId] of Object.entries(APPWRITE_CONFIG.collections)) {
    try {
      const col = await db.getCollection(dbId, colId);
      console.log(`\nVerificando coleção: ${name} (${colId})`);
      for (const attr of col.attributes as any[]) {
        if (attr.type === "string" && ["notes", "description", "dimensions_json"].includes(attr.key)) {
          console.log(`  Atributo: ${attr.key} -> tamanho atual: ${attr.size}`);
          if (attr.size < 65535) {
            console.log(`  Aumentando tamanho de ${attr.key} de ${attr.size} para 65535...`);
            try {
              await (db as any).updateStringAttribute(
                dbId,
                colId,
                attr.key,
                attr.required || false,
                attr.default || "",
                65535
              );
              console.log(`  -> Sucesso ao atualizar ${attr.key} para 65535!`);
            } catch (err: any) {
              console.log(`  -> Erro ao atualizar ${attr.key}:`, err.message);
            }
          }
        }
      }
    } catch (e: any) {
      console.log(`Coleção ${name} (${colId}): não encontrada ou erro (${e.message})`);
    }
  }
}

checkAndUpgradeAllCollections();
