/**
 * Provisiona as coleções 'ads_leads_carts' e 'analytics_events' no Appwrite (totem_db)
 * para persistência perpétua de Carrinhos Abandonados, Conversões Google Ads, Leads e Eventos do Funil.
 */

const https = require("https");

const APPWRITE_ENDPOINT =
  process.env.APPWRITE_ENDPOINT ||
  "https://appwrite-inwbueezn2gkpm4tqwvzkswy.179.199.142.157.sslip.io/v1";
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID || "chatboot-production";
const APPWRITE_API_KEY =
  process.env.APPWRITE_API_KEY ||
  "standard_bc50daa650a82f0d19717cbbc3b277af8c84ee084ab50232baf2b21cfaaabc4fa80ca0af9669163cd644c8676097eefbe001d9cd77a01b60e9b598222ab8117f341729ad3e5330e06af8c63da6e79e8cc3affa6e54cb87056f542c01f934bf21c37b43d1ddaaa5be0c7aff2f0ff2a060dc7d452ee763a2e22830b35da14db7b1";
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || "totem_db";

function appwriteRequest(path, method = "GET", body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(APPWRITE_ENDPOINT + path);
    const postData = body ? JSON.stringify(body) : null;

    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method,
      headers: {
        "X-Appwrite-Project": APPWRITE_PROJECT_ID,
        "X-Appwrite-Key": APPWRITE_API_KEY,
        "Content-Type": "application/json",
      },
      rejectUnauthorized: false,
    };

    if (postData) {
      options.headers["Content-Length"] = Buffer.byteLength(postData);
    }

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on("error", reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function createCollection(collectionId, name) {
  console.log(`[Collection] Criando/verificando: ${name} (${collectionId})...`);
  const res = await appwriteRequest(`/databases/${DATABASE_ID}/collections`, "POST", {
    collectionId,
    name,
    permissions: [],
    documentSecurity: false,
  });

  if (res.status === 201) {
    console.log(`  ✓ Coleção criada com sucesso: ${collectionId}`);
  } else if (res.status === 409) {
    console.log(`  ℹ Coleção já existe: ${collectionId}`);
  } else {
    console.error(`  ✖ Erro ao criar coleção ${collectionId}:`, res.data);
  }
}

async function addStringAttribute(collectionId, key, size = 255, required = false, defaultValue = null) {
  const body = { key, size, required };
  if (!required && defaultValue !== null) {
    body.default = defaultValue;
  }
  const res = await appwriteRequest(
    `/databases/${DATABASE_ID}/collections/${collectionId}/attributes/string`,
    "POST",
    body
  );
  if (res.status === 201 || res.status === 202) {
    console.log(`  + Atributo string [${key}] (${size}) adicionado em ${collectionId}.`);
  } else if (res.status !== 409) {
    console.warn(`  ! Atributo [${key}] em ${collectionId}:`, res.data?.message || res.status);
  }
}

async function addIntegerAttribute(collectionId, key, required = false, defaultValue = null) {
  const body = { key, required };
  if (!required && defaultValue !== null) {
    body.default = defaultValue;
  }
  const res = await appwriteRequest(
    `/databases/${DATABASE_ID}/collections/${collectionId}/attributes/integer`,
    "POST",
    body
  );
  if (res.status === 201 || res.status === 202) {
    console.log(`  + Atributo integer [${key}] adicionado em ${collectionId}.`);
  } else if (res.status !== 409) {
    console.warn(`  ! Atributo [${key}] em ${collectionId}:`, res.data?.message || res.status);
  }
}

async function main() {
  // 1. Coleção ads_leads_carts
  await createCollection("ads_leads_carts", "Conversões ADS, Carrinhos Abandonados e Leads");
  await addStringAttribute("ads_leads_carts", "record_id", 128, true);
  await addStringAttribute("ads_leads_carts", "session_id", 128, true);
  await addStringAttribute("ads_leads_carts", "record_type", 64, true);
  await addStringAttribute("ads_leads_carts", "funnel_stage", 64, false, "add_to_cart");
  await addStringAttribute("ads_leads_carts", "status", 64, false, "abandoned");
  await addStringAttribute("ads_leads_carts", "customer_name", 255, false, "");
  await addStringAttribute("ads_leads_carts", "customer_whatsapp", 64, false, "");
  await addStringAttribute("ads_leads_carts", "customer_email", 255, false, "");
  await addStringAttribute("ads_leads_carts", "customer_document", 64, false, "");
  await addStringAttribute("ads_leads_carts", "city", 128, false, "");
  await addStringAttribute("ads_leads_carts", "state", 64, false, "");
  await addStringAttribute("ads_leads_carts", "cep", 32, false, "");
  await addStringAttribute("ads_leads_carts", "device", 32, false, "MOBILE");
  await addIntegerAttribute("ads_leads_carts", "total_cents", false, 0);
  await addIntegerAttribute("ads_leads_carts", "items_count", false, 1);
  await addStringAttribute("ads_leads_carts", "campaign_name", 255, false, "");
  await addStringAttribute("ads_leads_carts", "ad_group_name", 255, false, "");
  await addStringAttribute("ads_leads_carts", "keyword", 255, false, "");
  await addStringAttribute("ads_leads_carts", "match_type", 64, false, "");
  await addStringAttribute("ads_leads_carts", "conversion_action_name", 255, false, "");
  await addIntegerAttribute("ads_leads_carts", "conversion_cost_cents", false, 0);
  await addStringAttribute("ads_leads_carts", "payload_json", 10000, true);

  // 2. Coleção analytics_events
  await createCollection("analytics_events", "Eventos de Telemetria do Funil");
  await addStringAttribute("analytics_events", "eventName", 64, true);
  await addStringAttribute("analytics_events", "sessionId", 128, true);
  await addStringAttribute("analytics_events", "timestamp", 64, true);
  await addStringAttribute("analytics_events", "metadataJson", 15000, false, "{}");

  console.log("\n⏳ Aguardando 3 segundos para indexação dos atributos no Appwrite...");
  await new Promise((r) => setTimeout(r, 3000));
  console.log("✅ Coleções 'ads_leads_carts' e 'analytics_events' prontas no Appwrite!");
}

main().catch((err) => {
  console.error("Erro fatal:", err);
  process.exit(1);
});
