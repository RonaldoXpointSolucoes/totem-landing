import assert from "node:assert/strict";
import {
  DEFAULT_KIT_SUB_ITEMS,
  GRASEP_DAI25T_MONITOR_SUBITEM,
  GRASEP_KIT_SUB_ITEMS,
  calculateKitTotalCents,
  doesKitIncludeMonitor,
  doesKitIncludePrinter,
  mergeServerCatalogKitItems,
  resolveKitEquipmentSummary,
} from "../src/modules/catalog/kitDefaults";
import {
  CABINET_MODELS,
  COLOR_OPTIONS,
  HOMOLOGATED_MONITORS,
} from "../src/modules/catalog/catalogData";
import { calculateTotemPrice } from "../src/modules/pricing/pricingEngine";

function run() {
  console.log("=== Validação: Itens Pausados & Novo Kit Grasep D-AI25T ===");

  // 1. Pausa do Aytek 24" dentro do Kit padrão
  const pausedAytekKit = HOMOLOGATED_MONITORS.find((m) => m.id === "6ac6dbf90032d4f8586e");
  assert.ok(pausedAytekKit, "Kit Aytek 24\" deve existir no fallback");
  const aytekItems = pausedAytekKit.kitItems || DEFAULT_KIT_SUB_ITEMS;
  const aytekPc = aytekItems.find((i) => i.id === "kit-monitor-touch");
  assert.equal(aytekPc?.paused, true, "PC AIO Aytek deve estar pausado");
  assert.equal(aytekPc?.selected, false, "PC pausado não pode estar selecionado");
  assert.equal(doesKitIncludeMonitor(aytekItems), false, "Kit com PC pausado não inclui monitor");
  assert.equal(doesKitIncludePrinter(aytekItems), true, "Impressora do Kit continua ativa");
  assert.equal(
    calculateKitTotalCents(aytekItems),
    81300,
    "Valor do Kit com Aytek pausado deve somar apenas impressora + acessórios (R$ 813,00)"
  );

  // 2. Tentativa de adulteração: cliente tenta enviar selected: true para item pausado
  const tamperedMerged = mergeServerCatalogKitItems(pausedAytekKit, [
    { id: "kit-monitor-touch", selected: true },
    { id: "KIT-IMP-001", selected: true },
  ]);
  const mergedAytekPc = tamperedMerged.kitItems?.find((i) => i.id === "kit-monitor-touch");
  assert.equal(mergedAytekPc?.paused, true);
  assert.equal(mergedAytekPc?.selected, false, "Servidor deve bloquear seleção de item pausado");
  assert.equal(tamperedMerged.priceAdjustmentCents, 81300);

  // 3. Novo Kit Grasep D-AI25T 21,5" Touch Core i7 (R$ 2.980,00)
  const grasepKit = HOMOLOGATED_MONITORS.find((m) => m.id === "kit-grasep-215-i7");
  assert.ok(grasepKit, "Novo Kit Grasep D-AI25T deve existir no catálogo");
  assert.equal(GRASEP_DAI25T_MONITOR_SUBITEM.priceCents, 298000, "PC Grasep deve custar R$ 2.980,00");
  assert.ok(
    GRASEP_DAI25T_MONITOR_SUBITEM.osNotice?.toLowerCase().includes("trial"),
    "Aviso de Windows Trial obrigatório"
  );
  assert.ok(
    GRASEP_DAI25T_MONITOR_SUBITEM.warrantyInfo?.includes("3 meses"),
    "Garantia de 3 meses obrigatória"
  );
  assert.equal(doesKitIncludeMonitor(GRASEP_KIT_SUB_ITEMS), true);
  assert.equal(doesKitIncludePrinter(GRASEP_KIT_SUB_ITEMS), true);
  assert.equal(
    calculateKitTotalCents(GRASEP_KIT_SUB_ITEMS),
    379300,
    "Kit Grasep completo (R$ 2.980 + R$ 813) = R$ 3.793,00"
  );

  // 4. Precificação com Gabinete de Parede (PIX R$ 990 + Kit R$ 3.793 = R$ 4.783,00)
  const wallModel = CABINET_MODELS.find((m) => m.id === "cabinet-wall") || CABINET_MODELS[0];
  const whiteColor = COLOR_OPTIONS[0];
  const pricing = calculateTotemPrice({
    cabinet: wallModel,
    color: whiteColor,
    monitor: grasepKit,
    printer: null,
    barcodeReader: null,
    customization: null,
    includeAssemblyService: false,
  });
  assert.equal(pricing.pixTotalPriceCents, 99000 + 379300);

  // 5. Ficha CNC / Resumo do Kit resolve o Grasep corretamente
  const summary = resolveKitEquipmentSummary({
    monitor: grasepKit,
    printer: null,
    barcodeReader: null,
  });
  assert.equal(summary.hasMonitorInKit, true);
  assert.equal(summary.hasPrinterInKit, true);
  assert.ok(summary.kitMonitorModel.includes("Grasep"));

  // 6. Resumo do Kit com Aytek pausado trata monitor como ausente e informa removedSubItems
  const pausedSummary = resolveKitEquipmentSummary({
    monitor: pausedAytekKit,
    printer: null,
    barcodeReader: null,
  });
  assert.equal(pausedSummary.hasMonitorInKit, false);
  assert.ok(
    pausedSummary.removedSubItems.some((i) => i.id === "kit-monitor-touch" && i.paused),
    "Item pausado deve aparecer fora da lista de envio"
  );

  console.log("✓ Todos os 6 blocos de validação passaram!");
}

run();
