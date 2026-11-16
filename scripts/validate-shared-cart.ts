import assert from "node:assert/strict";
import {
  CABINET_MODELS,
  COLOR_OPTIONS,
  HOMOLOGATED_MONITORS,
  HOMOLOGATED_PRINTERS,
  HOMOLOGATED_READERS,
} from "../src/modules/catalog/catalogData";
import { calculateTotemPrice, calculateSafeCardChargeCents } from "../src/modules/pricing/pricingEngine";
import { calculateSelectiveCouponDiscount, SelectiveCoupon } from "../src/modules/pricing/couponEngine";
import { isItemKit } from "../src/modules/catalog/kitDefaults";
import { CartItem } from "../src/types/order";
import {
  normalizeShareCode,
  generateShareCodeCandidate,
  serializeCartItemsForShare,
  hydrateSharedCartFromCatalog,
  buildSharedWhatsappSummaryText,
  resolveCartConflictDecision,
} from "../src/modules/cart/sharedAssembly";
import {
  createSharedCart,
  getSharedCartByCode,
  deleteSharedCartLocalForTest,
} from "../src/lib/cart/sharedCartStore";

async function runTests() {
  console.log("=== Validação: Compartilhamento de Montagem & Carrinho ===");

  const wallModel = CABINET_MODELS.find((m) => m.id === "cabinet-wall") || CABINET_MODELS[0];
  const counterModel = CABINET_MODELS.find((m) => m.id === "cabinet-countertop") || CABINET_MODELS[1];
  const whiteColor = COLOR_OPTIONS[0];
  const blackColor = COLOR_OPTIONS[1] || COLOR_OPTIONS[0];
  const stdMonitor = HOMOLOGATED_MONITORS.find((m) => !isItemKit(m) && !m.isCustom)!;
  const kitMonitor = HOMOLOGATED_MONITORS.find((m) => isItemKit(m))!;
  const printer0 = HOMOLOGATED_PRINTERS[0];
  const reader0 = HOMOLOGATED_READERS[0];

  const staticCatalog = {
    cabinetModels: CABINET_MODELS,
    colors: COLOR_OPTIONS,
    monitors: HOMOLOGATED_MONITORS,
    printers: HOMOLOGATED_PRINTERS,
    barcodeReaders: HOMOLOGATED_READERS,
  };

  // 1. Código curto legível e normalização
  const generated = generateShareCodeCandidate();
  assert.match(generated, /^MNT-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/, "Formato de código curto inválido");
  assert.equal(normalizeShareCode("  mnt-ab34cd  "), "MNT-AB34CD");
  assert.equal(normalizeShareCode("AB34CD"), "AB34CD");
  console.log("✓ Teste 1: Geração e normalização de shareCode passou");

  // 2. Serialização sanitizada (sem preços/dados pessoais, preservando kit personalizado e monitor sob medida)
  const customizedKitItems = (kitMonitor.kitItems || []).map((sub) =>
    sub.category === "monitor" ? { ...sub, selected: false } : { ...sub }
  );
  const customCutoutMonitor = {
    id: "custom-mon-999",
    brand: "Elgin",
    model: "Touch M15",
    displayName: "Elgin Touch M15 (Sob Medida)",
    sizeInches: 15.6,
    vesaPattern: "100x100",
    active: true,
    isCustom: true,
    priceAdjustmentCents: 0,
    customDimensions: {
      outerWidthCm: 39.2,
      outerHeightCm: 24.5,
      depthCm: 4.5,
      screenWidthCm: 34.4,
      screenHeightCm: 19.4,
      bezelTopCm: 2.5,
      bezelBottomCm: 2.6,
      bezelLeftCm: 2.4,
      bezelRightCm: 2.4,
      productUrl: "https://exemplo.com/monitor",
    },
  };

  const fakeClientCart: CartItem[] = [
    {
      id: "old-item-1",
      configuration: {
        model: wallModel,
        color: whiteColor,
        monitor: stdMonitor,
        printer: printer0,
        barcodeReader: reader0,
        customizationNotes: "Furar embaixo para cabo Ethernet",
        calculatedPriceCents: 100, // Preço adulterado no cliente
      },
      quantity: 2,
      unitPriceCents: 100,
      subtotalCents: 200,
    },
    {
      id: "old-item-2",
      configuration: {
        model: counterModel,
        color: blackColor,
        monitor: {
          ...kitMonitor,
          kitItems: customizedKitItems,
          cutoutMonitor: customCutoutMonitor,
        },
        printer: null,
        barcodeReader: null,
        includeAssemblyService: true,
        calculatedPriceCents: 50,
      },
      quantity: 1,
      unitPriceCents: 50,
      subtotalCents: 50,
    },
  ];

  // Injeta campos extras indevidos via any para validar sanitização
  const dirtySerialized = serializeCartItemsForShare(fakeClientCart) as any[];
  assert.equal(dirtySerialized.length, 2);
  assert.equal("unitPriceCents" in dirtySerialized[0], false, "Não pode conter unitPriceCents");
  assert.equal("subtotalCents" in dirtySerialized[0], false, "Não pode conter subtotalCents");
  assert.equal(dirtySerialized[0].quantity, 2);
  assert.equal(dirtySerialized[1].includeAssemblyService, true);
  assert.equal(dirtySerialized[1].customMonitor?.customDimensions?.screenWidthCm, 34.4);
  const monFlag = dirtySerialized[1].kitItems?.find((k: any) => k.id === "kit-monitor-touch");
  assert.equal(monFlag?.selected, false, "Desmarcação do monitor no kit deve ser preservada");
  console.log("✓ Teste 2: Serialização sanitizada preservou kit personalizado e medidas sob medida");

  // 3. Reidratação e Recálculo Soberano Server-Side + Cupom Seletivo
  const validCoupon: SelectiveCoupon = {
    code: "PARCEIRO10",
    discountPercent: 10,
    commissionPercent: 8,
    active: true,
    eligibleCategory: "cabinet_only",
  };

  const hydrated = hydrateSharedCartFromCatalog(dirtySerialized, staticCatalog, validCoupon);
  assert.equal(hydrated.items.length, 2);

  const expectedItem1Pricing = calculateTotemPrice({
    cabinet: wallModel,
    color: whiteColor,
    monitor: stdMonitor,
    printer: printer0,
    barcodeReader: reader0,
    includeAssemblyService: false,
  });
  assert.equal(
    hydrated.items[0].unitPriceCents,
    expectedItem1Pricing.pixTotalPriceCents,
    "Preço unitário do item 1 deve ignorar R$ 1,00 do cliente e usar catálogo oficial"
  );
  assert.equal(hydrated.items[0].subtotalCents, expectedItem1Pricing.pixTotalPriceCents * 2);

  const expectedItem2Pricing = calculateTotemPrice({
    cabinet: counterModel,
    color: blackColor,
    monitor: hydrated.items[1].configuration.monitor,
    printer: null,
    barcodeReader: null,
    includeAssemblyService: true,
  });
  assert.equal(hydrated.items[1].unitPriceCents, expectedItem2Pricing.pixTotalPriceCents);
  assert.equal(
    hydrated.items[1].configuration.monitor?.cutoutMonitor?.customDimensions?.outerWidthCm,
    39.2
  );

  const expectedCouponCalc = calculateSelectiveCouponDiscount(hydrated.items, validCoupon);
  assert.equal(hydrated.couponDiscountCents, expectedCouponCalc.discountCents);
  assert.equal(hydrated.pixTotalCents, expectedCouponCalc.finalSubtotalCents);
  assert.equal(hydrated.cardTotalCents, calculateSafeCardChargeCents(expectedCouponCalc.finalSubtotalCents));
  console.log("✓ Teste 3: Recálculo server-side e cupom seletivo bateram ao centavo");

  // 4. Decisão de Conflito de Carrinho (Substituir vs Somar sem colisão de IDs)
  const existingCart: CartItem[] = [
    {
      id: hydrated.items[0].id, // força colisão intencional caso não regenerasse
      configuration: hydrated.items[0].configuration,
      quantity: 1,
      unitPriceCents: hydrated.items[0].unitPriceCents,
      subtotalCents: hydrated.items[0].unitPriceCents,
    },
  ];

  const replaced = resolveCartConflictDecision(existingCart, hydrated.items, "replace");
  assert.equal(replaced.length, 2);

  const merged = resolveCartConflictDecision(existingCart, hydrated.items, "merge");
  assert.equal(merged.length, 3);
  const mergedIds = new Set(merged.map((i) => i.id));
  assert.equal(mergedIds.size, 3, "Mesclar deve gerar novos IDs únicos sem colisão");
  console.log("✓ Teste 4: Substituição e Mesclagem de carrinho sem colisão de IDs passou");

  // 5. Texto pronto para WhatsApp
  const waText = buildSharedWhatsappSummaryText({
    shareUrl: "https://totem.xpointsolucoes.com.br/montagem/MNT-AB34CD",
    title: "Totens Loja Centro",
    items: hydrated.items,
    pixTotalCents: hydrated.pixTotalCents,
    cardTotalCents: hydrated.cardTotalCents,
    coupon: validCoupon,
  });
  assert.match(waText, /Totens Loja Centro/);
  assert.match(waText, /MNT-AB34CD/);
  assert.match(waText, /PARCEIRO10/);
  console.log("✓ Teste 5: Resumo formatado para WhatsApp passou");

  // 6. Persistência do Store + Zero Dados Pessoais + Recálculo ao Ler + 404 para código inexistente
  const created = await createSharedCart({
    title: "Montagem Teste Loja",
    items: dirtySerialized,
  });
  assert.match(created.record.shareCode, /^MNT-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/);
  assert.equal(created.hydrated.items.length, 2);
  const serializedRecordText = JSON.stringify(created.record);
  assert.equal(serializedRecordText.includes("unitPriceCents"), false);

  const fetched = await getSharedCartByCode(created.record.shareCode.toLowerCase());
  assert.ok(fetched, "Montagem recém-salva deve ser encontrada pelo código em minúsculas");
  assert.equal(fetched!.assembly.shareCode, created.record.shareCode);
  assert.equal(fetched!.assembly.title, "Montagem Teste Loja");
  assert.equal(fetched!.assembly.items[0].unitPriceCents > 1000, true, "Preço recalculado no servidor na leitura");
  assert.equal(fetched!.assembly.viewsCount >= 1, true, "Contador de visualizações incrementado");

  const missing = await getSharedCartByCode("MNT-NAO999");
  assert.equal(missing, null, "Código inexistente deve retornar null");
  deleteSharedCartLocalForTest(created.record.shareCode);
  console.log("✓ Teste 6: Persistência e reidratação no sharedCartStore passou");
}

runTests().catch((err) => {
  console.error("❌ Falha nos testes:", err);
  process.exit(1);
});
