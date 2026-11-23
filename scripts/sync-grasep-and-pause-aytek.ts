import fs from "node:fs";
import { Client, Databases, Query } from "node-appwrite";
import {
  DEFAULT_KIT_SUB_ITEMS,
  GRASEP_DAI25T_MONITOR_SUBITEM,
  GRASEP_DAI25T_DESCRIPTION,
  calculateKitTotalCents,
} from "../src/modules/catalog/kitDefaults";
import { KitSubItem } from "../src/types/catalog";

function loadEnv(): Record<string, string> {
  const raw = fs.readFileSync(".env", "utf8");
  const env: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
  }
  return env;
}

function sanitizeAccessoryId(sub: KitSubItem): KitSubItem {
  if (sub.id.includes("\t")) {
    if (sub.name.toLowerCase().includes("cabo de força")) {
      return { ...sub, id: "KIT-CAB-ENERGIA" };
    }
    if (sub.name.toLowerCase().includes("parafusos")) {
      return { ...sub, id: "KIT-PAR-001" };
    }
  }
  return sub;
}

async function main() {
  const env = loadEnv();
  const client = new Client()
    .setEndpoint(env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
    .setProject(env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
    .setKey(env.APPWRITE_API_KEY);
  const db = new Databases(client);
  const dbId = env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;

  // 1. Atualiza Kit existente (6ac6dbf90032d4f8586e): coloca PC AIO Aytek 24" como PAUSADO
  const aytekKitDoc = await db.getDocument(dbId, "monitors", "6ac6dbf90032d4f8586e");
  const parsedNotes = aytekKitDoc.notes ? JSON.parse(aytekKitDoc.notes) : {};
  const existingSubItems: KitSubItem[] = Array.isArray(parsedNotes.kitItems)
    ? parsedNotes.kitItems
    : DEFAULT_KIT_SUB_ITEMS;

  const updatedAytekKitItems: KitSubItem[] = existingSubItems.map((raw) => {
    const clean = sanitizeAccessoryId({ ...raw });
    if (
      clean.id === "kit-monitor-touch" ||
      clean.category === "monitor" ||
      clean.name.toLowerCase().includes("23.8")
    ) {
      return {
        ...clean,
        name: 'Computador All-in-One Aytek 23.8" (24") Touch Core i5',
        paused: true,
        selected: false,
        pausedReason: 'PC AIO Aytek 24" temporariamente sem estoque',
      };
    }
    return {
      ...clean,
      paused: false,
      selected: clean.selected !== false,
    };
  });

  const aytekKitTotal = calculateKitTotalCents(updatedAytekKitItems);
  await db.updateDocument(dbId, "monitors", "6ac6dbf90032d4f8586e", {
    brand: "Aytek",
    display_name: 'Kit de Montagem — All-in-One Aytek 23.8" Core i5',
    sort_order: 2,
    price_adjustment_cents: aytekKitTotal,
    notes: JSON.stringify({
      isKit: true,
      kitItems: updatedAytekKitItems,
      kitTotalCents: aytekKitTotal,
      updatedAt: new Date().toISOString(),
    }),
  });
  console.log(`✓ Kit Aytek (6ac6dbf90032d4f8586e) atualizado: PC pausado, saldo kit R$ ${(aytekKitTotal / 100).toFixed(2)}`);

  // 2. Desativa Aytek AIO-T5224 avulso com hardware pago (mon-elgin-215) pois está sem estoque
  try {
    await db.updateDocument(dbId, "monitors", "mon-elgin-215", {
      active: false,
    });
    console.log("✓ Item avulso Aytek AIO-T5224 (mon-elgin-215) marcado como inativo (sem estoque).");
  } catch (err: any) {
    console.warn("Aviso ao atualizar mon-elgin-215:", err?.message);
  }

  // 3. Monta subitens do Novo Kit Grasep usando os mesmos impressora/acessórios do catálogo live + Grasep R$ 2.980
  const nonMonitorItems = updatedAytekKitItems
    .filter((i) => i.category !== "monitor" && i.id !== "kit-monitor-touch")
    .map((i) => ({
      ...i,
      paused: false,
      selected: true,
    }));

  const grasepKitItems: KitSubItem[] = [
    { ...GRASEP_DAI25T_MONITOR_SUBITEM },
    ...nonMonitorItems,
  ];
  const grasepKitTotal = calculateKitTotalCents(grasepKitItems);

  const grasepKitPayload = {
    brand: "Grasep",
    model: "kit-grasep-215-i7",
    display_name: 'Kit de Montagem — All-in-One Grasep 21,5" Touch Core i7',
    slug: "kit-montagem-grasep-215-i7",
    size: "21.5",
    vesa_pattern: "Suporte CNC Sob Medida",
    technical_code: "KIT-GRS-DAI25T",
    active: true,
    sort_order: 1,
    image: "/images/totems/kit-grasep-215.webp",
    price_adjustment_cents: grasepKitTotal,
    notes: JSON.stringify({
      isKit: true,
      kitItems: grasepKitItems,
      kitTotalCents: grasepKitTotal,
      updatedAt: new Date().toISOString(),
    }),
  };

  try {
    await db.getDocument(dbId, "monitors", "kit-grasep-215-i7");
    await db.updateDocument(dbId, "monitors", "kit-grasep-215-i7", grasepKitPayload);
    console.log(`✓ Novo Kit Grasep (kit-grasep-215-i7) atualizado: total R$ ${(grasepKitTotal / 100).toFixed(2)}`);
  } catch {
    await db.createDocument(dbId, "monitors", "kit-grasep-215-i7", grasepKitPayload);
    console.log(`✓ Novo Kit Grasep (kit-grasep-215-i7) criado: total R$ ${(grasepKitTotal / 100).toFixed(2)}`);
  }

  // 4. Também cadastra o Grasep Maximus D-AI25T 21,5" como opção de recorte CNC grátis (R$ 0,00) em Apenas Gabinete
  const standaloneGrasepPayload = {
    brand: "Grasep",
    model: 'Maximus D-AI25T 21,5"',
    display_name: 'Grasep Maximus D-AI25T 21,5" Touch',
    slug: "grasep-maximus-d-ai25t-21-5",
    size: "21.5",
    vesa_pattern: "Berço CNC Sob Medida",
    technical_code: "GRS-DAI25T-215",
    active: true,
    sort_order: 2,
    image: "/images/equipments/grasep-d-ai25t.webp",
    price_adjustment_cents: 0,
    notes: GRASEP_DAI25T_DESCRIPTION,
  };

  try {
    await db.getDocument(dbId, "monitors", "mon-grasep-dai25t");
    await db.updateDocument(dbId, "monitors", "mon-grasep-dai25t", standaloneGrasepPayload);
    console.log("✓ Monitor avulso Grasep Maximus D-AI25T atualizado (furação R$ 0,00).");
  } catch {
    await db.createDocument(dbId, "monitors", "mon-grasep-dai25t", standaloneGrasepPayload);
    console.log("✓ Monitor avulso Grasep Maximus D-AI25T criado (furação R$ 0,00).");
  }

  // Verificação final
  const all = await db.listDocuments(dbId, "monitors", [Query.limit(50)]);
  console.log("\nResumo final Appwrite (monitors):");
  for (const doc of all.documents) {
    console.log(
      ` - ${doc.$id} | ${doc.display_name} | active=${doc.active} | sort=${doc.sort_order} | price=${doc.price_adjustment_cents}`
    );
  }
}

main().catch((err) => {
  console.error("Erro na sincronização Appwrite:", err);
  process.exit(1);
});
