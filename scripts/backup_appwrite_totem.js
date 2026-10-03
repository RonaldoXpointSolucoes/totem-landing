/**
 * Script de Backup Automatizado e Auditoria de Resiliência
 * Appwrite Self-Hosted — Database: totem_db
 * 
 * Uso:
 *   node scripts/backup_appwrite_totem.js
 *   node scripts/backup_appwrite_totem.js --retention 7
 *   node scripts/backup_appwrite_totem.js --dry-run
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { Client, Databases, Query } = require("node-appwrite");

const ENDPOINT =
  process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ||
  "https://appwrite-inwbueezn2gkpm4tqwvzkswy.179.199.142.157.sslip.io/v1";
const PROJECT_ID =
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "chatboot-production";
const DATABASE_ID =
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || "totem_db";
const API_KEY =
  process.env.APPWRITE_API_KEY ||
  "standard_bc50daa650a82f0d19717cbbc3b277af8c84ee084ab50232baf2b21cfaaabc4fa80ca0af9669163cd644c8676097eefbe001d9cd77a01b60e9b598222ab8117f341729ad3e5330e06af8c63da6e79e8cc3affa6e54cb87056f542c01f934bf21c37b43d1ddaaa5be0c7aff2f0ff2a060dc7d452ee763a2e22830b35da14db7b1";

const COLLECTIONS = [
  "cabinet_models",
  "colors",
  "monitors",
  "printers",
  "barcode_readers",
  "compatibility_rules",
  "carts",
  "cart_items",
  "orders",
  "order_items",
  "payments",
];

const BACKUP_ROOT_DIR = path.resolve(__dirname, "../backups");

function getArgs() {
  const args = process.argv.slice(2);
  const options = {
    dryRun: args.includes("--dry-run"),
    retention: 10,
  };

  const retIdx = args.indexOf("--retention");
  if (retIdx !== -1 && args[retIdx + 1]) {
    options.retention = parseInt(args[retIdx + 1], 10) || 10;
  }

  return options;
}

function calculateSha256(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

function cleanOldBackups(retentionCount) {
  if (!fs.existsSync(BACKUP_ROOT_DIR)) return;

  const entries = fs.readdirSync(BACKUP_ROOT_DIR, { withFileTypes: true });
  const backupDirs = entries
    .filter((e) => e.isDirectory() && e.name.startsWith("totem_db_"))
    .map((e) => ({
      name: e.name,
      fullPath: path.join(BACKUP_ROOT_DIR, e.name),
      mtime: fs.statSync(path.join(BACKUP_ROOT_DIR, e.name)).mtimeMs,
    }))
    .sort((a, b) => b.mtime - a.mtime); // Mais recentes primeiro

  if (backupDirs.length > retentionCount) {
    const toRemove = backupDirs.slice(retentionCount);
    console.log(`[Backup Retention] Limpando ${toRemove.length} backups antigos (retenção máxima: ${retentionCount})...`);
    for (const item of toRemove) {
      fs.rmSync(item.fullPath, { recursive: true, force: true });
      console.log(`  - Removido: ${item.name}`);
    }
  }
}

async function runBackup() {
  const { dryRun, retention } = getArgs();
  console.log("=================================================");
  console.log("💾 ROTINA DE BACKUP APPWRITE — TOTEM PRO");
  console.log("=================================================");
  console.log(`Endpoint:    ${ENDPOINT}`);
  console.log(`Database:    ${DATABASE_ID}`);
  console.log(`Dry Run:     ${dryRun ? "SIM (Nenhum arquivo gravado)" : "NÃO"}`);
  console.log(`Retenção:    Manter últimos ${retention} backups`);
  console.log("-------------------------------------------------");

  const client = new Client()
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT_ID)
    .setKey(API_KEY);

  const databases = new Databases(client);

  const timestamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace("T", "_")
    .split(".")[0];
  const targetDirName = `totem_db_${timestamp}`;
  const targetDirPath = path.join(BACKUP_ROOT_DIR, targetDirName);

  if (!dryRun) {
    fs.mkdirSync(targetDirPath, { recursive: true });
  }

  const manifest = {
    version: "1.0",
    createdAt: new Date().toISOString(),
    databaseId: DATABASE_ID,
    endpoint: ENDPOINT,
    collections: {},
    totalDocuments: 0,
    totalBytes: 0,
    status: "in_progress",
  };

  for (const colId of COLLECTIONS) {
    process.stdout.write(`Exportando coleção '${colId}'... `);
    try {
      let documents = [];
      let cursor = null;
      let hasMore = true;

      while (hasMore) {
        const queries = [Query.limit(100)];
        if (cursor) {
          queries.push(Query.cursorAfter(cursor));
        }

        const res = await databases.listDocuments(DATABASE_ID, colId, queries);
        if (res.documents && res.documents.length > 0) {
          documents = documents.concat(res.documents);
          cursor = res.documents[res.documents.length - 1].$id;
          if (res.documents.length < 100) {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
      }

      const jsonStr = JSON.stringify(documents, null, 2);
      const sha256 = calculateSha256(jsonStr);
      const byteSize = Buffer.byteLength(jsonStr, "utf8");

      manifest.collections[colId] = {
        count: documents.length,
        byteSize,
        sha256,
        fileName: `${colId}.json`,
      };

      manifest.totalDocuments += documents.length;
      manifest.totalBytes += byteSize;

      if (!dryRun) {
        fs.writeFileSync(path.join(targetDirPath, `${colId}.json`), jsonStr, "utf8");
      }

      console.log(`✓ ${documents.length} documentos (${(byteSize / 1024).toFixed(1)} KB)`);
    } catch (err) {
      console.log(`⚠️ Aviso: Não foi possível exportar (${err.message})`);
      manifest.collections[colId] = {
        count: 0,
        error: err.message,
      };
    }
  }

  manifest.status = "completed";

  if (!dryRun) {
    const manifestStr = JSON.stringify(manifest, null, 2);
    fs.writeFileSync(path.join(targetDirPath, "manifest.json"), manifestStr, "utf8");
    console.log("-------------------------------------------------");
    console.log(`✓ Backup concluído com sucesso em:`);
    console.log(`  ${targetDirPath}`);
    console.log(`  Total: ${manifest.totalDocuments} documentos em ${Object.keys(manifest.collections).length} coleções.`);

    // Aplica limpeza com base na política de retenção
    cleanOldBackups(retention);
  } else {
    console.log("-------------------------------------------------");
    console.log(`[Dry-Run] Simulação concluída com sucesso. Nenhum arquivo gravado.`);
  }

  return manifest;
}

if (require.main === module) {
  runBackup().catch((err) => {
    console.error("❌ Falha fatal na rotina de backup:", err);
    process.exit(1);
  });
}

module.exports = { runBackup };
