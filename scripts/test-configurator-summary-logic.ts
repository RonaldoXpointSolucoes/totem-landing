import { CABINET_MODELS, COLOR_OPTIONS, HOMOLOGATED_MONITORS, HOMOLOGATED_PRINTERS, HOMOLOGATED_READERS } from "../src/modules/catalog/catalogData";
import { isItemKit, getEffectiveKitItems } from "../src/modules/catalog/kitDefaults";

function getSummaryItems(state: {
  selectedModel: any;
  selectedColor: any;
  selectedMonitor: any;
  selectedPrinter: any;
  selectedReader: any;
  useReader: boolean;
  readerConfigured: boolean;
  step: number;
}) {
  const isKitSelected = isItemKit(state.selectedMonitor);
  const activeKitItems = !isKitSelected
    ? []
    : state.selectedMonitor?.kitItems || getEffectiveKitItems(state.selectedMonitor);

  const items: Record<string, string> = {};

  // Modelo: sempre presente
  if (state.selectedModel) {
    items["Modelo"] = state.selectedModel.name;
  }

  // Acabamento: sempre presente
  if (state.selectedColor) {
    items["Acabamento"] = state.selectedColor.name;
  }

  // Monitor: apenas se selecionado (ou obrigatório na etapa 3)
  if (state.selectedMonitor) {
    items["Monitor"] = isKitSelected
      ? `Kit de Montagem (${activeKitItems.filter((i: any) => i.selected).length} itens)`
      : state.selectedMonitor.displayName;
  }

  // Impressora: apenas se fizer parte do kit OU se o usuário selecionou uma impressora
  if (isKitSelected || state.selectedPrinter) {
    items["Impressora"] = isKitSelected
      ? (activeKitItems.find((i: any) => i.category === "printer")?.selected ? "Inclusa no Kit" : "Removida do Kit")
      : state.selectedPrinter?.displayName;
  }

  // Leitor: apenas se fizer parte do kit OU se o usuário configurou o leitor (sem leitor ou leitor homologado)
  if (isKitSelected || (state.readerConfigured && (!state.useReader || state.selectedReader))) {
    items["Leitor 2D"] = isKitSelected
      ? (activeKitItems.find((i: any) => i.category === "reader")?.selected ? "Incluso no Kit" : "Removido do Kit")
      : (state.useReader && state.selectedReader ? state.selectedReader.displayName : "Sem leitor (Gabinete liso)");
  }

  return items;
}

console.log("========================================================");
console.log("🧪 TESTE DE VALIDAÇÃO: REGRAS DE EXIBIÇÃO DO RESUMO DO TOTEM");
console.log("========================================================");

// Cenário 1: Usuário no Passo 3 selecionou apenas Monitor Dell P2422H (Caso exato do chamado do usuário)
const dellMonitor = HOMOLOGATED_MONITORS.find((m) => m.id === "mon-dell-p2422h") || HOMOLOGATED_MONITORS[1];
const scenarioAudioUser = getSummaryItems({
  selectedModel: CABINET_MODELS[0],
  selectedColor: COLOR_OPTIONS[0],
  selectedMonitor: dellMonitor,
  selectedPrinter: null,
  selectedReader: null,
  useReader: true,
  readerConfigured: false,
  step: 3,
});

console.log("Cenário 1 (Passo 3 - Monitor Dell selecionado, Impressora e Leitor ainda não alcançados):");
console.log(scenarioAudioUser);

if ("Impressora" in scenarioAudioUser) {
  throw new Error("❌ FALHA: Impressora não deveria aparecer no resumo antes de ser selecionada!");
}
if ("Leitor 2D" in scenarioAudioUser) {
  throw new Error("❌ FALHA: Leitor 2D não deveria aparecer no resumo antes de ser selecionado!");
}
if (!("Monitor" in scenarioAudioUser)) {
  throw new Error("❌ FALHA: Monitor Dell deveria aparecer no resumo após seleção!");
}
console.log("✅ Cenário 1 APROVADO: Apenas itens de fato selecionados estão visíveis!");

// Cenário 2: Usuário no Passo 1 ou 2 (Monitor ainda não selecionado)
const scenarioStep1 = getSummaryItems({
  selectedModel: CABINET_MODELS[0],
  selectedColor: COLOR_OPTIONS[0],
  selectedMonitor: null,
  selectedPrinter: null,
  selectedReader: null,
  useReader: true,
  readerConfigured: false,
  step: 1,
});

console.log("\nCenário 2 (Passo 1 - Início):");
console.log(scenarioStep1);
if ("Monitor" in scenarioStep1 || "Impressora" in scenarioStep1 || "Leitor 2D" in scenarioStep1) {
  throw new Error("❌ FALHA: Componentes não selecionados apareceram no Passo 1!");
}
console.log("✅ Cenário 2 APROVADO: Apenas Modelo e Acabamento aparecem no início!");

// Cenário 3: Usuário no Passo 4 (Selecionou Impressora EPSON)
const scenarioStep4 = getSummaryItems({
  selectedModel: CABINET_MODELS[0],
  selectedColor: COLOR_OPTIONS[0],
  selectedMonitor: dellMonitor,
  selectedPrinter: HOMOLOGATED_PRINTERS[0],
  selectedReader: null,
  useReader: true,
  readerConfigured: false,
  step: 4,
});

console.log("\nCenário 3 (Passo 4 - Impressora EPSON selecionada):");
console.log(scenarioStep4);
if (!("Impressora" in scenarioStep4)) {
  throw new Error("❌ FALHA: Impressora deveria aparecer após seleção!");
}
if ("Leitor 2D" in scenarioStep4) {
  throw new Error("❌ FALHA: Leitor 2D não deveria aparecer antes do Passo 5!");
}
console.log("✅ Cenário 3 APROVADO: Impressora incluída e Leitor ainda omitido!");

// Cenário 4: Usuário no Passo 5 (Optou por Gabinete Liso Sem Leitor)
const scenarioStep5NoReader = getSummaryItems({
  selectedModel: CABINET_MODELS[0],
  selectedColor: COLOR_OPTIONS[0],
  selectedMonitor: dellMonitor,
  selectedPrinter: HOMOLOGATED_PRINTERS[0],
  selectedReader: null,
  useReader: false,
  readerConfigured: true,
  step: 5,
});

console.log("\nCenário 4 (Passo 5 - Sem leitor / Gabinete liso):");
console.log(scenarioStep5NoReader);
if (scenarioStep5NoReader["Leitor 2D"] !== "Sem leitor (Gabinete liso)") {
  throw new Error("❌ FALHA: Leitor deveria constar como Sem leitor (Gabinete liso)!");
}
console.log("✅ Cenário 4 APROVADO: Opção sem leitor documentada corretamente!");

// Cenário 5: Kit de Montagem selecionado no Passo 3
const kitMonitor = HOMOLOGATED_MONITORS.find((m) => isItemKit(m)) || HOMOLOGATED_MONITORS[0];
const scenarioKit = getSummaryItems({
  selectedModel: CABINET_MODELS[0],
  selectedColor: COLOR_OPTIONS[0],
  selectedMonitor: kitMonitor,
  selectedPrinter: null,
  selectedReader: null,
  useReader: true,
  readerConfigured: false,
  step: 3,
});

console.log("\nCenário 5 (Passo 3 - Kit de Montagem):");
console.log(scenarioKit);
if (!("Impressora" in scenarioKit) || !("Leitor 2D" in scenarioKit)) {
  throw new Error("❌ FALHA: Kit de montagem deveria reportar impressora e leitor inclusos no kit!");
}
console.log("✅ Cenário 5 APROVADO: Kit de Montagem contempla todos os periféricos de hardware!");

console.log("\n🎉 TODOS OS 5 TESTES DE COMPORTAMENTO PASSARAM COM SUCESSO!");
