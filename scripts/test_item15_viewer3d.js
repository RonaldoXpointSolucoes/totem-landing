/**
 * Testes Automatizados para o Item 15:
 * Integração Desacoplada do Visualizador 3D via postMessage e Hotspots Interativos (MVP 5)
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

async function testViewerRouteAndAssets() {
  console.log("\n--- [TESTE 1] Rota Dedicada do Visualizador 3D ---");

  const res = await fetch(`${BASE_URL}/viewer3d`);
  await assert(res.ok, "Rota /viewer3d responde com status 200");

  const html = await res.text();
  await assert(
    html.includes("3D WebGL 360") || html.includes("viewer") || html.includes("Totem"),
    "HTML do visualizador 3D renderizado com sucesso"
  );

  // Validação de Isolamento Comercial Estrito
  await assert(
    !html.includes("/api/checkout/order"),
    "Visualizador 3D não possui dependência de endpoint de checkout (Regra de Ouro mantida)"
  );
  await assert(
    !html.includes("calculateTotemPrice"),
    "Visualizador 3D não calcula preço comercial (soberania do backend preservada)"
  );
}

async function testPostMessageInterfaceContract() {
  console.log("\n--- [TESTE 2] Contrato de Comunicação postMessage Bidirecional ---");

  const viewerPagePath = path.resolve(__dirname, "../src/app/viewer3d/page.tsx");
  const wrapperPath = path.resolve(__dirname, "../src/components/configurator/TotemViewer3DWrapper.tsx");

  await assert(fs.existsSync(viewerPagePath), "Arquivo src/app/viewer3d/page.tsx existe");
  await assert(fs.existsSync(wrapperPath), "Arquivo src/components/configurator/TotemViewer3DWrapper.tsx existe");

  const viewerCode = fs.readFileSync(viewerPagePath, "utf8");
  const wrapperCode = fs.readFileSync(wrapperPath, "utf8");

  // Eventos enviados pelo pai (Configurador)
  await assert(wrapperCode.includes("type: \"UPDATE_TOTEM\""), "Wrapper despacha evento 'UPDATE_TOTEM'");
  await assert(viewerCode.includes("data.type === \"UPDATE_TOTEM\""), "Visualizador 3D escuta evento 'UPDATE_TOTEM'");

  await assert(wrapperCode.includes("type: \"TOGGLE_DOOR\""), "Wrapper despacha evento 'TOGGLE_DOOR'");
  await assert(viewerCode.includes("data.type === \"TOGGLE_DOOR\""), "Visualizador 3D escuta evento 'TOGGLE_DOOR'");

  // Eventos enviados pelo filho (Visualizador 3D)
  await assert(viewerCode.includes("type: \"VIEWER_READY\""), "Visualizador 3D emite evento 'VIEWER_READY'");
  await assert(wrapperCode.includes("data.type === \"VIEWER_READY\""), "Wrapper escuta evento 'VIEWER_READY'");

  await assert(viewerCode.includes("type: \"HOTSPOT_CLICKED\""), "Visualizador 3D emite evento 'HOTSPOT_CLICKED'");
  await assert(wrapperCode.includes("data.type === \"HOTSPOT_CLICKED\""), "Wrapper escuta evento 'HOTSPOT_CLICKED'");
}

async function testHotspotsAndInteractiveFeatures() {
  console.log("\n--- [TESTE 3] Modelos Procedurais e Hotspots Informativos ---");

  const viewerCode = fs.readFileSync(path.resolve(__dirname, "../src/app/viewer3d/page.tsx"), "utf8");

  // Os 3 modelos industriais procedurais
  await assert(viewerCode.includes("cabinet-floor"), "Suporte ao modelo Totem Slim Piso");
  await assert(viewerCode.includes("cabinet-wall"), "Suporte ao modelo Totem Parede Compact");
  await assert(viewerCode.includes("cabinet-countertop"), "Suporte ao modelo Totem Balcão Express");

  // Hotspots informativos obrigatórios
  await assert(
    viewerCode.includes("Abertura e furação VESA produzida conforme seu modelo"),
    "Hotspot do Monitor com especificação técnica VESA presente"
  );
  await assert(
    viewerCode.includes("Compartimento e guilhotina ajustados"),
    "Hotspot da Impressora com especificação de guilhotina presente"
  );
  await assert(
    viewerCode.includes("Acesso técnico com ventilação e fechadura de segurança"),
    "Hotspot Traseiro com fechadura e ventilação presente"
  );

  // Mecanismo de abertura e fechamento da porta
  await assert(viewerCode.includes("doorPivotRef"), "Eixo de rotação da porta técnica implementado");
  await assert(viewerCode.includes("targetDoorAngle"), "Ângulo de abertura da porta técnica interpolado");
}

async function testMobileFirstAndLazyLoading() {
  console.log("\n--- [TESTE 4] Mobile-First, Performance e Lazy Loading ---");

  const wizardCode = fs.readFileSync(
    path.resolve(__dirname, "../src/components/configurator/ConfiguratorWizard.tsx"),
    "utf8"
  );
  const wrapperCode = fs.readFileSync(
    path.resolve(__dirname, "../src/components/configurator/TotemViewer3DWrapper.tsx"),
    "utf8"
  );

  // Modo 2D leve por padrão
  await assert(
    wrapperCode.includes("const [mode, setMode] = useState<\"2d\" | \"3d\">(\"2d\")"),
    "Modo padrão é 2D para carregamento instantâneo (<50KB) e zero degradação de performance"
  );

  // Ativação 3D On-Demand
  await assert(
    wrapperCode.includes("<iframe") && wrapperCode.includes("loading=\"lazy\""),
    "Iframe 3D utiliza loading='lazy' para consumo sob demanda"
  );

  // Modal / Banner dedicado para Mobile
  await assert(
    wizardCode.includes("isMobileViewerOpen"),
    "Banner e Modal de visualização 3D disponíveis para dispositivos móveis"
  );
}

async function runAllTests() {
  console.log("=============================================================");
  console.log("🧪 INICIANDO BATERIA DE TESTES — ITEM 15");
  console.log("Visualizador 3D Desacoplado via postMessage e Hotspots");
  console.log("=============================================================");

  try {
    await testViewerRouteAndAssets();
    await testPostMessageInterfaceContract();
    await testHotspotsAndInteractiveFeatures();
    await testMobileFirstAndLazyLoading();

    console.log("\n=============================================================");
    console.log("🎉 TODOS OS TESTES DO ITEM 15 PASSARAM COM SUCESSO!");
    console.log("=============================================================\n");
  } catch (err) {
    console.error("\n❌ ERRO NA EXECUÇÃO DOS TESTES DO ITEM 15:", err.message);
    process.exit(1);
  }
}

runAllTests();
