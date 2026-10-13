import { calculateReversePricing } from "../src/modules/pricing/smartPricing";

console.log("==========================================================================");
console.log("🧪 TESTE DE PRECIFICAÇÃO REVERSA COM CUSTOS CONTÁBEIS EXPLÍCITOS EM REAIS");
console.log("==========================================================================\n");

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`✅ [PASS] ${message}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${message}`);
    failed++;
  }
}

// Cenário do Usuário:
// Meta Bolso: R$ 990,00 | Desconto: R$ 100,00 | Comissão: R$ 100,00 | Custo Cartão: R$ 200,00
const result = calculateReversePricing({
  targetNetCents: 99000,
  customerDiscountCents: 10000,
  influencerCommissionCents: 10000,
  cardFeeCents: 20000,
  installments: 10,
});

console.log("Valores Calculados:", {
  targetNet: result.targetNetCents / 100,
  customerDiscount: result.customerDiscountCents / 100,
  influencerCommission: result.influencerCommissionCents / 100,
  cardFee: result.cardFeeCents / 100,
  cardPrice: result.cardPriceCents / 100,
  cardPriceWithDiscount: result.cardPriceWithDiscountCents / 100,
  pixInfluencerBase: result.pixInfluencerBaseCents / 100,
  pixPriceWithDiscount: result.pixPriceWithDiscountCents / 100,
  pixDirect: result.pixPriceCents / 100,
});

// Asserções Matemáticas
assert(result.cardPriceCents === 139000, "Preço Cartão (Tabela) é R$ 1.390,00 (990 + 100 + 100 + 200)");
assert(result.cardPriceWithDiscountCents === 129000, "Cliente paga no Cartão com cupom R$ 1.290,00 (10x de R$ 129,00)");
assert(result.pixInfluencerBaseCents === 119000, "Preço Base no PIX é R$ 1.190,00 (990 + 100 + 100, sem taxa de cartão)");
assert(result.pixPriceWithDiscountCents === 109000, "Cliente paga no PIX com cupom R$ 1.090,00");
assert(result.pixPriceCents === 99000, "Preço no PIX Direto à vista é R$ 990,00");

// Asserções do DRE (Fechamento no Bolso do Lojista)
assert(result.scenarios.cardInstallments.netReceivedCents === 99000, "Cenário Cartão 10x entrega exatamente R$ 990,00 no bolso");
assert(result.scenarios.pixInfluencer.netReceivedCents === 99000, "Cenário PIX Influencer entrega exatamente R$ 990,00 no bolso");
assert(result.scenarios.pixDirect.netReceivedCents === 99000, "Cenário PIX Direto entrega exatamente R$ 990,00 no bolso");

console.log(`\n==========================================================================`);
console.log(`RESULTADO: ${passed} PASSOU, ${failed} FALHOU`);
console.log(`==========================================================================\n`);

if (failed > 0) {
  process.exit(1);
}
