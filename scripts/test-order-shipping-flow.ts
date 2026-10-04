async function testOrderShippingFlow() {
  console.log("💳 Testando Fluxo de Checkout com Recálculo Server-Side de Frete...\n");

  const baseUrl = process.env.TEST_API_URL || "http://localhost:3000";

  // Teste 1: Pedido com frete SEDEX
  console.log("--- TESTE 1: Pedido com SEDEX selecionado ---");
  const payloadSedex = {
    customer: {
      personType: "individual",
      name: "Cliente Teste Sedex",
      document: "123.456.789-00",
      email: "cliente.sedex@teste.com",
      whatsapp: "(11) 98888-7777",
    },
    deliveryAddress: {
      cep: "01310-100",
      street: "Av. Paulista",
      number: "1000",
      neighborhood: "Bela Vista",
      city: "São Paulo",
      state: "SP",
    },
    shippingOptionId: "correios_sedex",
    items: [
      {
        modelId: "cabinet-wall",
        colorId: "color-white",
        quantity: 1,
      },
    ],
  };

  const res1 = await fetch(`${baseUrl}/api/checkout/order`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payloadSedex),
  });

  if (!res1.ok) {
    const errorText = await res1.text();
    throw new Error(`Teste 1 falhou com status ${res1.status}: ${errorText}`);
  }

  const data1 = await res1.json();
  console.log("✓ Resposta recebida da API de Pedidos!");
  console.log(`✓ Pedido gerado: ${data1.order.orderNumber}`);
  console.log(`✓ Subtotal: R$ ${(data1.order.subtotalCents / 100).toFixed(2)}`);
  console.log(`✓ Frete recalculado no servidor: R$ ${(data1.order.shippingCents / 100).toFixed(2)} (${data1.order.shippingMethod?.name})`);
  console.log(`✓ Total final consolidado: R$ ${(data1.order.totalCents / 100).toFixed(2)}`);

  if (data1.order.shippingCents <= 0) {
    throw new Error("Teste 1 falhou: frete SEDEX deveria ser maior que R$ 0,00");
  }
  if (data1.order.totalCents !== data1.order.subtotalCents + data1.order.shippingCents) {
    throw new Error("Teste 1 falhou: totalCents diverge de subtotalCents + shippingCents");
  }
  if (data1.order.shippingMethod?.id !== "correios_sedex") {
    throw new Error(`Teste 1 falhou: shippingMethod incorreto: ${data1.order.shippingMethod?.id}`);
  }
  console.log("✅ TESTE 1 (SEDEX) PASSOU COM SUCESSO!\n");

  // Teste 2: Pedido com Retirada na Fábrica (Frete R$ 0,00)
  console.log("--- TESTE 2: Pedido com Retirada na Fábrica ---");
  const payloadPickup = {
    ...payloadSedex,
    customer: {
      ...payloadSedex.customer,
      name: "Cliente Teste Retirada",
    },
    shippingOptionId: "retirada_fabrica",
  };

  const res2 = await fetch(`${baseUrl}/api/checkout/order`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payloadPickup),
  });

  if (!res2.ok) {
    const errorText = await res2.text();
    throw new Error(`Teste 2 falhou com status ${res2.status}: ${errorText}`);
  }

  const data2 = await res2.json();
  console.log(`✓ Pedido gerado: ${data2.order.orderNumber}`);
  console.log(`✓ Frete Retirada: R$ ${(data2.order.shippingCents / 100).toFixed(2)} (${data2.order.shippingMethod?.name})`);
  console.log(`✓ Total a Pagar Pix: R$ ${(data2.order.totalCents / 100).toFixed(2)}`);

  if (data2.order.shippingCents !== 0) {
    throw new Error("Teste 2 falhou: frete para retirada deve ser exatamente R$ 0,00");
  }
  if (data2.order.totalCents !== data2.order.subtotalCents) {
    throw new Error("Teste 2 falhou: total com retirada deve ser idêntico ao subtotal");
  }
  console.log("✅ TESTE 2 (RETIRADA) PASSOU COM SUCESSO!\n");

  console.log("🎉 TESTE DE INTEGRAÇÃO DO FLUXO COMPLETO DE FRETE CONCLUÍDO COM 100% DE ÊXITO!");
}

testOrderShippingFlow().catch((err) => {
  console.error("❌ ERRO FATAL NO FLUXO DE PEDIDO COM FRETE:", err);
  process.exit(1);
});
