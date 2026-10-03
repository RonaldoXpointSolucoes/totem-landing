/**
 * Testes Automatizados para o Item 14:
 * Observabilidade, SEO Técnico, Analytics de Funil e Rotinas de Backup
 */

const fs = require("fs");
const path = require("path");

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

async function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FALHA: ${message}`);
    throw new Error(message);
  }
  console.log(`✓ OK: ${message}`);
}

async function testAnalyticsTracking() {
  console.log("\n--- [TESTE 1] Telemetria e Disparo de Eventos Canônicos ---");

  const events = [
    { eventName: "view_home", metadata: { source: "test_runner" } },
    { eventName: "start_configurator", metadata: { modelId: "cabinet-floor" } },
    { eventName: "select_cabinet_model", metadata: { modelId: "cabinet-floor", modelName: "Totem Slim Chão" } },
    { eventName: "select_color", metadata: { colorId: "color-black", colorName: "Preto Fosco Industrial" } },
    { eventName: "select_monitor", metadata: { monitorId: "mon-15-touch", monitorName: "Monitor 15.6\" Touch" } },
    { eventName: "select_printer", metadata: { printerId: "print-80", printerName: "Impressora Térmica 80mm" } },
    { eventName: "select_barcode_reader", metadata: { readerId: "reader-2d", enabled: true } },
    { eventName: "add_to_cart", metadata: { modelId: "cabinet-floor", totalPriceCents: 329000 } },
    { eventName: "duplicate_item", metadata: { itemId: "item_test_1" } },
    { eventName: "begin_checkout", metadata: { totalItems: 2, totalPriceCents: 658000 } },
    { eventName: "pix_generated", metadata: { orderId: "ord_test_1", totalCents: 658000 } },
    { eventName: "purchase", metadata: { orderId: "ord_test_1", totalCents: 658000 } },
  ];

  for (const evt of events) {
    const res = await fetch(`${BASE_URL}/api/analytics/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventName: evt.eventName,
        sessionId: "test-session-runner",
        metadata: evt.metadata,
      }),
    });

    const data = await res.json();
    await assert(res.ok && data.ok, `Evento '${evt.eventName}' registrado com sucesso (ID: ${data.eventId})`);
  }
}

async function testAnalyticsFunnelMetrics() {
  console.log("\n--- [TESTE 2] Agregação de Funil e Taxas de Abandono ---");

  const res = await fetch(`${BASE_URL}/api/analytics/funnel`);
  const data = await res.json();

  await assert(res.ok && data.ok, "Endpoint /api/analytics/funnel responde com sucesso");
  await assert(data.funnel && Array.isArray(data.funnel.stages), "Stages do funil retornados em array");
  await assert(data.funnel.stages.length === 7, `Exatamente 7 etapas mapeadas (obtido: ${data.funnel.stages.length})`);

  for (const stage of data.funnel.stages) {
    console.log(
      `  - [Etapa ${stage.stepNumber}] ${stage.label}: ${stage.count} eventos | Retenção: ${stage.conversionRateFromPrevious}% | Abandono: ${stage.dropoffRateFromPrevious}%`
    );
    await assert(typeof stage.conversionRateFromPrevious === "number", `Taxa de conversão válida para ${stage.label}`);
    await assert(typeof stage.dropoffRateFromPrevious === "number", `Taxa de abandono calculada para ${stage.label}`);
  }

  await assert(typeof data.funnel.globalConversionRate === "number", `Conversão global calculada: ${data.funnel.globalConversionRate}%`);
}

async function testSeoAndRobots() {
  console.log("\n--- [TESTE 3] SEO Técnico, Robots.txt, Sitemap e JSON-LD Schema.org ---");

  // Robots.txt
  const robotsRes = await fetch(`${BASE_URL}/robots.txt`);
  await assert(robotsRes.ok, "Rota /robots.txt responde com status 200");
  const robotsTxt = await robotsRes.text();
  await assert(robotsTxt.includes("Disallow: /admin"), "robots.txt bloqueia rastreamento do /admin");
  await assert(robotsTxt.includes("sitemap.xml"), "robots.txt declara URL do sitemap");

  // Sitemap.xml
  const sitemapRes = await fetch(`${BASE_URL}/sitemap.xml`);
  await assert(sitemapRes.ok, "Rota /sitemap.xml responde com status 200");
  const sitemapXml = await sitemapRes.text();
  await assert(sitemapXml.includes("<loc>https://totem.xpointsolucoes.com.br"), "sitemap.xml contém URL canônica principal");

  // Home Page HTML & Schema.org JSON-LD
  const homeRes = await fetch(`${BASE_URL}/`);
  await assert(homeRes.ok, "Home page responde com status 200");
  const homeHtml = await homeRes.text();

  await assert(
    homeHtml.includes("application/ld+json"),
    "HTML renderiza script com Schema.org JSON-LD estruturado"
  );
  await assert(
    homeHtml.includes("Gabinete para Totem de Autoatendimento"),
    "JSON-LD ou Title contém palavra-chave 'Gabinete para Totem de Autoatendimento'"
  );
  await assert(
    homeHtml.includes("AggregateOffer") || homeHtml.includes("Product"),
    "JSON-LD contém Schema Product/AggregateOffer com faixa de preços"
  );
}

async function testAppwriteBackupRoutine() {
  console.log("\n--- [TESTE 4] Rotina Automatizada de Backup Appwrite ---");

  const { runBackup } = require("./backup_appwrite_totem.js");
  const manifest = await runBackup();

  await assert(manifest.status === "completed", "Status do backup é 'completed'");
  await assert(manifest.totalDocuments > 0, `Total de documentos extraídos maior que zero (${manifest.totalDocuments} docs)`);

  const backupsDir = path.resolve(__dirname, "../backups");
  const entries = fs.readdirSync(backupsDir, { withFileTypes: true });
  const backupFolders = entries.filter((e) => e.isDirectory() && e.name.startsWith("totem_db_"));

  await assert(backupFolders.length > 0, "Pasta de backup criada no sistema de arquivos");
  const latestBackupDir = path.join(backupsDir, backupFolders[backupFolders.length - 1].name);
  const manifestPath = path.join(latestBackupDir, "manifest.json");

  await assert(fs.existsSync(manifestPath), "Arquivo manifest.json gravado com sucesso");

  const manifestData = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  await assert(manifestData.collections["cabinet_models"]?.count > 0, "Coleção cabinet_models exportada com dados");
  await assert(manifestData.collections["cabinet_models"]?.sha256, "Hash criptográfico SHA-256 gerado para integridade");

  console.log(`✓ Backup validado: ${manifestPath}`);
}

async function runAllTests() {
  console.log("=============================================================");
  console.log("🧪 INICIANDO BATERIA DE TESTES — ITEM 14");
  console.log("Observabilidade, SEO Técnico, Analytics de Funil & Backup");
  console.log("=============================================================");

  try {
    await testAnalyticsTracking();
    await testAnalyticsFunnelMetrics();
    await testSeoAndRobots();
    await testAppwriteBackupRoutine();

    console.log("\n=============================================================");
    console.log("🎉 TODOS OS TESTES DO ITEM 14 PASSARAM COM SUCESSO!");
    console.log("=============================================================\n");
  } catch (err) {
    console.error("\n❌ ERRO NA EXECUÇÃO DOS TESTES:", err.message);
    process.exit(1);
  }
}

runAllTests();
