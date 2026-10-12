import { calculateReversePricing } from "../src/modules/pricing/smartPricing";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FALHA: ${message}`);
    process.exit(1);
  }
  console.log(`✅ OK: ${message}`);
}

async function runTests() {
  console.log("==================================================");
  console.log("🧪 TESTES DO MOTOR DE PRECIFICAÇÃO REVERSA INTELIGENTE");
  console.log("==================================================");

  // Teste 1: Gabinete de Parede (Meta R$ 990,00)
  console.log("\n--- TESTE 1: Gabinete de Parede (Meta R$ 990,00) ---");
  const wallResult = calculateReversePricing({
    targetNetCents: 99000,
    customerCouponPercent: 10,
    influencerCommissionPercent: 10,
    installments: 10,
  });

  console.log("Resultado Parede:", {
    targetNet: wallResult.targetNetCents / 100,
    pixPrice: wallResult.pixPriceCents / 100,
    cardPrice: wallResult.cardPriceCents / 100,
    installment: wallResult.installmentMonthlyCents / 100,
    anchorPrice: wallResult.anchorPriceCents / 100,
    pixDiscount: wallResult.effectivePixDiscountPercent + "%",
  });

  assert(wallResult.pixPriceCents === 99000, "Preço no PIX é R$ 990,00");
  assert(wallResult.cardPriceCents === 120000, "Preço no Cartão 10x é R$ 1.200,00");
  assert(wallResult.installmentMonthlyCents === 12000, "Parcela mensal é R$ 120,00");
  assert(wallResult.anchorPriceCents === 139000, "Preço âncora comercial é R$ 1.390,00");
  assert(wallResult.scenarios.pixDirect.netReceivedCents === 99000, "Cenário PIX Direto recebe R$ 990,00 líquido (100%)");
  assert(wallResult.scenarios.cardInstallments.netReceivedCents === 99000, "Cenário Cartão 10x recebe R$ 990,00 líquido após absorver taxas");

  // Teste 2: Gabinete de Balcão (Meta R$ 950,00)
  console.log("\n--- TESTE 2: Gabinete de Balcão (Meta R$ 950,00) ---");
  const countertopResult = calculateReversePricing({
    targetNetCents: 95000,
    customerCouponPercent: 10,
    influencerCommissionPercent: 10,
    installments: 10,
  });

  console.log("Resultado Balcão:", {
    targetNet: countertopResult.targetNetCents / 100,
    pixPrice: countertopResult.pixPriceCents / 100,
    cardPrice: countertopResult.cardPriceCents / 100,
    installment: countertopResult.installmentMonthlyCents / 100,
    anchorPrice: countertopResult.anchorPriceCents / 100,
  });

  assert(countertopResult.pixPriceCents === 95000, "Preço Balcão no PIX é R$ 950,00");
  assert(countertopResult.cardPriceCents === 115000, "Preço Balcão no Cartão é R$ 1.150,00");
  assert(countertopResult.scenarios.pixDirect.netReceivedCents === 95000, "Balcão PIX direto entrega R$ 950,00 líquido");

  // Teste 3: Gabinete de Piso (Meta R$ 1.590,00)
  console.log("\n--- TESTE 3: Gabinete de Piso (Meta R$ 1.590,00) ---");
  const floorResult = calculateReversePricing({
    targetNetCents: 159000,
    customerCouponPercent: 10,
    influencerCommissionPercent: 10,
    installments: 10,
  });

  console.log("Resultado Piso:", {
    targetNet: floorResult.targetNetCents / 100,
    pixPrice: floorResult.pixPriceCents / 100,
    cardPrice: floorResult.cardPriceCents / 100,
    installment: floorResult.installmentMonthlyCents / 100,
    anchorPrice: floorResult.anchorPriceCents / 100,
  });

  assert(floorResult.pixPriceCents === 159000, "Preço Piso no PIX é R$ 1.590,00");
  assert(floorResult.cardPriceCents >= 192000 && floorResult.cardPriceCents <= 193000, "Preço Piso no Cartão proporcionalmente calibrado");
  assert(floorResult.scenarios.pixDirect.netReceivedCents === 159000, "Piso PIX direto entrega R$ 1.590,00 líquido");

  console.log("\n==================================================");
  console.log("🎉 TODOS OS TESTES DO MOTOR DE PRECIFICAÇÃO PASSARAM!");
  console.log("==================================================");
}

runTests().catch(console.error);
