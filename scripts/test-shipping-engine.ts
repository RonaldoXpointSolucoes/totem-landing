import { calculateShippingQuotes } from "../src/modules/shipping/shippingEngine";

async function runTests() {
  console.log("🚚 Iniciando Bateria de Testes do Motor Logístico de Fretes...\n");

  // Teste 1: Gabinete de Parede (16kg) para São Paulo Capital (01310-100)
  console.log("------------------------------------------------------------------");
  console.log("TESTE 1: Gabinete de Parede (16kg) -> São Paulo Capital (01310-100)");
  const res1 = await calculateShippingQuotes({
    destinationCep: "01310-100",
    items: [{ modelId: "cabinet-wall", quantity: 1 }],
  });

  if (!res1.ok) {
    throw new Error(`Teste 1 falhou: ${res1.error}`);
  }

  console.log(`✓ Peso Bruto: ${res1.totalGrossWeightKg} kg | Cubado: ${res1.totalCubicWeightKg} kg`);
  console.log(`✓ Opções encontradas (${res1.quotes.length}):`);
  for (const q of res1.quotes) {
    const status = q.isAvailable ? `R$ ${(q.priceCents / 100).toFixed(2)} (${q.deliveryDaysMin}-${q.deliveryDaysMax} dias)` : `[INDISPONÍVEL] ${q.unavailableReason}`;
    console.log(`   - ${q.name}: ${status}`);
  }

  const pac1 = res1.quotes.find(q => q.id === "correios_pac");
  const sedex1 = res1.quotes.find(q => q.id === "correios_sedex");
  const retirada1 = res1.quotes.find(q => q.id === "retirada_fabrica");
  const carrier1 = res1.quotes.find(q => q.id === "transportadora_express");

  if (!pac1?.isAvailable || !sedex1?.isAvailable || !retirada1?.isAvailable || !carrier1?.isAvailable) {
    throw new Error("Teste 1 falhou: todas as modalidades deveriam estar disponíveis para o modelo de parede em SP.");
  }
  if (retirada1.priceCents !== 0) {
    throw new Error("Teste 1 falhou: retirada na fábrica deve ser R$ 0,00.");
  }
  console.log("✅ TESTE 1 PASSOU COM SUCESSO!\n");

  // Teste 2: Gabinete de Piso (40kg, 170cm) para Rio de Janeiro (20040-002)
  console.log("------------------------------------------------------------------");
  console.log("TESTE 2: Gabinete de Piso (40kg / 170cm) -> Rio de Janeiro (20040-002)");
  const res2 = await calculateShippingQuotes({
    destinationCep: "20040-002",
    items: [{ modelId: "cabinet-floor", quantity: 1 }],
  });

  if (!res2.ok) {
    throw new Error(`Teste 2 falhou: ${res2.error}`);
  }

  console.log(`✓ Peso Bruto: ${res2.totalGrossWeightKg} kg | Cubado: ${res2.totalCubicWeightKg} kg`);
  const pac2 = res2.quotes.find(q => q.id === "correios_pac");
  const sedex2 = res2.quotes.find(q => q.id === "correios_sedex");
  const carrier2 = res2.quotes.find(q => q.id === "transportadora_express");
  const retirada2 = res2.quotes.find(q => q.id === "retirada_fabrica");

  if (pac2?.isAvailable || sedex2?.isAvailable) {
    throw new Error("Teste 2 falhou: Correios PAC/SEDEX NÃO devem estar disponíveis para o gabinete de piso.");
  }
  if (!carrier2?.isAvailable) {
    throw new Error("Teste 2 falhou: Transportadora deve estar disponível para o gabinete de piso.");
  }
  if (!retirada2?.isAvailable) {
    throw new Error("Teste 2 falhou: Retirada na fábrica deve estar disponível.");
  }
  console.log(`✓ Correios PAC indisponível com justificativa correta: "${pac2?.unavailableReason}"`);
  console.log(`✓ Transportadora disponível: R$ ${(carrier2.priceCents / 100).toFixed(2)} (${carrier2.deliveryDaysMin}-${carrier2.deliveryDaysMax} dias)`);
  console.log("✅ TESTE 2 PASSOU COM SUCESSO!\n");

  // Teste 3: Gabinete de Balcão (13.2kg) para Salvador BA (40020-000)
  console.log("------------------------------------------------------------------");
  console.log("TESTE 3: Gabinete de Balcão (13.2kg) -> Salvador BA (40020-000)");
  const res3 = await calculateShippingQuotes({
    destinationCep: "40020-000",
    items: [{ modelId: "cabinet-countertop", quantity: 1 }],
  });

  if (!res3.ok) {
    throw new Error(`Teste 3 falhou: ${res3.error}`);
  }
  const pac3 = res3.quotes.find(q => q.id === "correios_pac");
  const sedex3 = res3.quotes.find(q => q.id === "correios_sedex");
  if (!pac3?.isAvailable || !sedex3?.isAvailable) {
    throw new Error("Teste 3 falhou: Correios devem estar disponíveis para balcão no Nordeste.");
  }
  console.log(`✓ PAC Bahia: R$ ${(pac3.priceCents / 100).toFixed(2)} (${pac3.deliveryDaysMin}-${pac3.deliveryDaysMax} dias)`);
  console.log(`✓ SEDEX Bahia: R$ ${(sedex3.priceCents / 100).toFixed(2)} (${sedex3.deliveryDaysMin}-${sedex3.deliveryDaysMax} dias)`);
  console.log("✅ TESTE 3 PASSOU COM SUCESSO!\n");

  // Teste 4: Validação de CEP inválido
  console.log("------------------------------------------------------------------");
  console.log("TESTE 4: Validação de CEP inválido ('123')");
  const res4 = await calculateShippingQuotes({
    destinationCep: "123",
    items: [{ modelId: "cabinet-wall", quantity: 1 }],
  });
  if (res4.ok || !res4.error) {
    throw new Error("Teste 4 falhou: deveria rejeitar CEP incompleto.");
  }
  console.log(`✓ Rejeição esperada recebida: "${res4.error}"`);
  console.log("✅ TESTE 4 PASSOU COM SUCESSO!\n");

  // Teste 5: Validação de carrinho vazio
  console.log("------------------------------------------------------------------");
  console.log("TESTE 5: Validação de carrinho vazio");
  const res5 = await calculateShippingQuotes({
    destinationCep: "01310-100",
    items: [],
  });
  if (res5.ok || !res5.error) {
    throw new Error("Teste 5 falhou: deveria rejeitar carrinho vazio.");
  }
  console.log(`✓ Rejeição esperada recebida: "${res5.error}"`);
  console.log("✅ TESTE 5 PASSOU COM SUCESSO!\n");

  console.log("🎉 TODOS OS TESTES DO MOTOR DE FRETE FORAM CONCLUÍDOS COM 100% DE APROVAÇÃO!");
}

runTests().catch((err) => {
  console.error("❌ ERRO FATAL NO TESTE:", err);
  process.exit(1);
});
