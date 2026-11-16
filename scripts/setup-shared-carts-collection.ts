import fs from "fs";
import path from "path";
import { APPWRITE_CONFIG } from "../src/lib/appwrite/config";

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf-8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIdx = line.indexOf("=");
    if (eqIdx === -1) continue;
    const key = line.slice(0, eqIdx).trim();
    let val = line.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = val;
    }
  }
}

loadEnvFile(path.join(process.cwd(), ".env"));
loadEnvFile(path.join(process.cwd(), ".env.local"));

async function main() {
  const { ensureSharedCartsCollection } = await import("../src/lib/cart/sharedCartStore");
  const apiKey = process.env.APPWRITE_API_KEY || APPWRITE_CONFIG.apiKey;
  if (!apiKey) {
    console.error("❌ APPWRITE_API_KEY não encontrada no ambiente ou .env/.env.local.");
    process.exit(1);
  }
  console.log(`🚀 Provisionando coleção '${APPWRITE_CONFIG.collections.sharedCarts}' em '${APPWRITE_CONFIG.databaseId}'...`);
  const ok = await ensureSharedCartsCollection();
  if (!ok) {
    console.error("❌ Falha ao provisionar coleção shared_carts no Appwrite.");
    process.exit(1);
  }
  console.log("✅ Coleção shared_carts verificada e pronta no Appwrite!");
}

main().catch((err) => {
  console.error("❌ Erro no setup shared_carts:", err);
  process.exit(1);
});
