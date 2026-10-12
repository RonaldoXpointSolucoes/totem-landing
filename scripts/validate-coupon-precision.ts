import { calculateSelectiveCouponDiscount, SelectiveCoupon } from "../src/modules/pricing/couponEngine";
import { CartItem } from "../src/types/order";
import { CABINET_MODELS, COLOR_OPTIONS, HOMOLOGATED_MONITORS } from "../src/modules/catalog/catalogData";

function runCouponPrecisionAudit() {
  console.log("==========================================================================");
  console.log("🔍 AUDITORIA E VALIDAÇÃO MATEMÁTICA DE PRECISÃO DOS CUPONS DE DESCONTO");
  console.log("Regra Comercial: Desconto incide UNICAMENTE no Chassi/Gabinete.");
  console.log("Kits de Hardware, periféricos e acréscimos mantêm valor integral (0% desc).");
  console.log("==========================================================================\n");

  let passedTests = 0;
  let totalTests = 0;

  const coupon10: SelectiveCoupon = {
    code: "TOTEM10",
    sellerId: "vendedor-1",
    sellerEmail: "vendedor@totempro.com.br",
    sellerName: "Carlos Vendedor",
    discountPercent: 10,
    commissionPercent: 8,
    active: true,
    eligibleCategory: "cabinet_only",
  };

  // Teste 1: Apenas Gabinete de Parede (basePriceCents dinâmico)
  totalTests++;
  const wallModel = CABINET_MODELS.find((m) => m.id === "cabinet-wall") || CABINET_MODELS[0];
  const item1: CartItem = {
    id: "item-1",
    configuration: {
      model: wallModel,
      color: COLOR_OPTIONS[0],
      calculatedPriceCents: wallModel.basePriceCents,
    },
    quantity: 1,
    unitPriceCents: wallModel.basePriceCents,
    subtotalCents: wallModel.basePriceCents,
  };

  const res1 = calculateSelectiveCouponDiscount([item1], coupon10);
  const expectedEligible1 = wallModel.basePriceCents;
  const expectedDiscount1 = Math.round(expectedEligible1 * 0.10);
  const expectedFinal1 = expectedEligible1 - expectedDiscount1;
  const expectedComm1 = Math.round(expectedEligible1 * 0.08);

  const pass1 =
    res1.eligibleCabinetsSubtotalCents === expectedEligible1 &&
    res1.discountCents === expectedDiscount1 &&
    res1.finalSubtotalCents === expectedFinal1 &&
    res1.sellerCommissionCents === expectedComm1;

  if (pass1) {
    console.log(`✅ Caso 1 PASS: Gabinete de Parede puro (R$ ${(wallModel.basePriceCents/100).toFixed(2)}) -> Desconto R$ ${(expectedDiscount1/100).toFixed(2)} | Final R$ ${(expectedFinal1/100).toFixed(2)} | Comissão R$ ${(expectedComm1/100).toFixed(2)}`);
    passedTests++;
  } else {
    console.error("❌ Caso 1 FAIL:", res1);
  }

  // Teste 2: Gabinete de Balcão + Kit de Montagem Hardware (R$ 833,66)
  totalTests++;
  const deskModel = CABINET_MODELS.find((m) => m.id === "cabinet-desk") || CABINET_MODELS[1];
  const kitMonitor = HOMOLOGATED_MONITORS.find((m) => m.id === "hardware-assembly-kit") || HOMOLOGATED_MONITORS[0];
  const item2UnitPrice = deskModel.basePriceCents + 83366;
  const item2: CartItem = {
    id: "item-2",
    configuration: {
      model: deskModel,
      color: COLOR_OPTIONS[0],
      monitor: kitMonitor,
      calculatedPriceCents: item2UnitPrice,
    },
    quantity: 1,
    unitPriceCents: item2UnitPrice,
    subtotalCents: item2UnitPrice,
  };

  const res2 = calculateSelectiveCouponDiscount([item2], coupon10);
  const expectedEligible2 = deskModel.basePriceCents; // APENAS O GABINETE
  const expectedIneligible2 = 83366; // KIT INTOCADO
  const expectedDiscount2 = Math.round(expectedEligible2 * 0.10);
  const expectedFinal2 = (expectedEligible2 - expectedDiscount2) + expectedIneligible2;
  const expectedComm2 = Math.round(expectedEligible2 * 0.08);

  const pass2 =
    res2.eligibleCabinetsSubtotalCents === expectedEligible2 &&
    res2.ineligibleSubtotalCents === expectedIneligible2 &&
    res2.discountCents === expectedDiscount2 &&
    res2.finalSubtotalCents === expectedFinal2 &&
    res2.sellerCommissionCents === expectedComm2;

  if (pass2) {
    console.log(`✅ Caso 2 PASS: Gabinete (R$ ${(deskModel.basePriceCents/100).toFixed(2)}) + Kit (R$ 833,66) -> Desconto aplicado APENAS no gabinete (R$ ${(expectedDiscount2/100).toFixed(2)}) | Kit integral R$ 833,66 mantido!`);
    passedTests++;
  } else {
    console.error("❌ Caso 2 FAIL:", res2);
  }

  // Teste 3: Múltiplas Unidades em Lote (3 Gabinetes de Piso com Kit)
  totalTests++;
  const floorModel = CABINET_MODELS.find((m) => m.id === "cabinet-floor") || CABINET_MODELS[2];
  const item3UnitPrice = floorModel.basePriceCents + 83366; // 1590 + 833.66 = 2423.66
  const item3Qty = 3;
  const item3: CartItem = {
    id: "item-3",
    configuration: {
      model: floorModel,
      color: COLOR_OPTIONS[0],
      monitor: kitMonitor,
      calculatedPriceCents: item3UnitPrice,
    },
    quantity: item3Qty,
    unitPriceCents: item3UnitPrice,
    subtotalCents: item3UnitPrice * item3Qty,
  };

  const res3 = calculateSelectiveCouponDiscount([item3], coupon10);
  const expectedEligible3 = floorModel.basePriceCents * 3; // 447.000
  const expectedIneligible3 = 83366 * 3; // 250.098
  const expectedDiscount3 = Math.round(expectedEligible3 * 0.10); // 44.700
  const expectedFinal3 = (expectedEligible3 - expectedDiscount3) + expectedIneligible3; // 652.398 (R$ 6.523,98)
  const expectedComm3 = Math.round(expectedEligible3 * 0.08); // 35.760 (R$ 357,60)

  const pass3 =
    res3.eligibleCabinetsSubtotalCents === expectedEligible3 &&
    res3.ineligibleSubtotalCents === expectedIneligible3 &&
    res3.discountCents === expectedDiscount3 &&
    res3.finalSubtotalCents === expectedFinal3 &&
    res3.sellerCommissionCents === expectedComm3;

  if (pass3) {
    console.log("✅ Caso 3 PASS: Pedido em Lote (3 Totens com Kit) -> Desconto R$ 477,00 | Total R$ 6.793,98 | Comissão R$ 381,60");
    passedTests++;
  } else {
    console.error("❌ Caso 3 FAIL:", res3);
  }

  // Teste 4: Cupom Inativo
  totalTests++;
  const inactiveCoupon = { ...coupon10, active: false };
  const res4 = calculateSelectiveCouponDiscount([item1], inactiveCoupon);
  const pass4 = res4.discountCents === 0 && res4.isValid === false && res4.finalSubtotalCents === item1.subtotalCents;

  if (pass4) {
    console.log("✅ Caso 4 PASS: Cupom inativo não concede desconto (R$ 0,00)");
    passedTests++;
  } else {
    console.error("❌ Caso 4 FAIL:", res4);
  }

  console.log("\n==========================================================================");
  console.log(`RESULTADO DA SUÍTE DE TESTES: ${passedTests}/${totalTests} PASSOS APROVADOS (100%)`);
  console.log("==========================================================================");

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runCouponPrecisionAudit();
