// Run with: node --env-file=.env --import tsx scripts/setup-mercadopago.ts
// Additive migration: preserves existing Pix payments and order snapshots.
import { Client, Databases } from "node-appwrite";

async function main() {
  if (!process.env.APPWRITE_API_KEY) throw new Error("APPWRITE_API_KEY ausente.");
  const db = new Databases(new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
    .setKey(process.env.APPWRITE_API_KEY));
  const database = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || "totem_db";
  const current = await db.listAttributes(database, "payments");
  for (const [key, size] of Object.entries({ payment_method: 32, gateway_payment_id: 64, gateway_order_id: 64, gateway_preference_id: 128, checkout_url: 1000, gateway_status: 64 })) {
    if (current.attributes.some((a) => a.key === key)) { console.log(`${key}: existente`); continue; }
    await db.createStringAttribute(database, "payments", key, size, false);
    console.log(`${key}: criado`);
  }
}

main().catch(() => { console.error("Falha ao preparar atributos de pagamento."); process.exitCode = 1; });
