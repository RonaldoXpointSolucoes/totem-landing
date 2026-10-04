async function testShippingApi() {
  console.log("🌐 Testando Endpoint de Cotação de Frete (POST /api/shipping/quote)...\n");

  const baseUrl = process.env.TEST_API_URL || "http://localhost:3000";

  // Teste 1: Cotação válida para SP com 1 Gabinete de Parede
  console.log("Teste 1: POST /api/shipping/quote com CEP SP e 1 item");
  const payload1 = {
    destinationCep: "01310-100",
    items: [
      {
        modelId: "cabinet-wall",
        quantity: 1,
      },
    ],
  };

  const res1 = await fetch(`${baseUrl}/api/shipping/quote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload1),
  });

  if (res1.status !== 200) {
    const errorBody = await res1.text();
    throw new Error(`Teste 1 falhou com status ${res1.status}: ${errorBody}`);
  }

  const data1 = await res1.json();
  console.log(`✓ Status: ${res1.status} OK`);
  console.log(`✓ ok: ${data1.ok}`);
  console.log(`✓ Opções retornadas: ${data1.quotes?.length}`);
  if (!data1.quotes || data1.quotes.length === 0) {
    throw new Error("Teste 1 falhou: nenhuma opção de frete retornada.");
  }
  for (const q of data1.quotes) {
    console.log(`  - ${q.name} (${q.carrier}): R$ ${(q.priceCents / 100).toFixed(2)} [${q.isAvailable ? "Disponível" : "Indisponível"}]`);
  }
  console.log("✅ Teste 1 da API passou com sucesso!\n");

  // Teste 2: Validação de erro com CEP inválido
  console.log("Teste 2: POST /api/shipping/quote com CEP incompleto (deve retornar 400)");
  const res2 = await fetch(`${baseUrl}/api/shipping/quote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      destinationCep: "123",
      items: [{ modelId: "cabinet-wall", quantity: 1 }],
    }),
  });

  if (res2.status !== 400) {
    throw new Error(`Teste 2 falhou: esperava status 400, mas obteve ${res2.status}`);
  }
  const data2 = await res2.json();
  console.log(`✓ Status: 400 Bad Request`);
  console.log(`✓ Mensagem de erro amigável: "${data2.error}"`);
  console.log("✅ Teste 2 da API passou com sucesso!\n");

  console.log("🎉 TODOS OS TESTES DA ROTA DE API DE FRETE PASSARAM COM SUCESSO!");
}

testShippingApi().catch((err) => {
  console.error("❌ ERRO NO TESTE DA API:", err);
  process.exit(1);
});
