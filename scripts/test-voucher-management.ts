import {
  recordVoucherUsage,
  getAllVoucherUsages,
  getVoucherUsagesBySeller,
  updateVoucherPayout,
  getVoucherSummaryMetrics,
  syncOrderStatusToVoucherUsage,
} from "../src/lib/vouchers/voucherStore";
import { calculateSelectiveCouponDiscount } from "../src/modules/pricing/couponEngine";
import { buildTrackedCampaignLink } from "../src/lib/vouchers/campaignTracker";

async function testVoucherManagement() {
  console.log("===================================================================");
  console.log("🚀 INICIANDO AUDITORIA DO SISTEMA MODERNO DE GESTÃO DE VOUCHERS");
  console.log("===================================================================\n");

  // 1. Teste do Construtor de Links Rastreados (Campaign Link Builder)
  console.log("1. Testando Construtor de Links Rastreados com UTM...");
  const origin = "https://totempro.com.br";
  const linkStories = buildTrackedCampaignLink(origin, "CARLOS10", {
    channel: "instagram_stories",
    targetPath: "/monte-seu-totem",
  });
  console.log("   ✓ Link Stories:", linkStories.url);
  if (!linkStories.url.includes("utm_source=instagram") || !linkStories.url.includes("cupom=CARLOS10")) {
    throw new Error("Falha no construtor de links: parâmetros esperados ausentes.");
  }

  const linkYoutube = buildTrackedCampaignLink(origin, "CARLOS10", {
    channel: "youtube",
    customCampaign: "lancamento_totem_2026",
  });
  console.log("   ✓ Link YouTube:", linkYoutube.url);
  if (!linkYoutube.url.includes("utm_source=youtube") || !linkYoutube.url.includes("lancamento_totem_2026")) {
    throw new Error("Falha no link do YouTube: UTM source ou campaign incorreta.");
  }

  // 2. Teste do Recálculo Seletivo de Desconto no Gabinete CNC
  console.log("\n2. Testando Recálculo Seletivo no Gabinete CNC (Soberania do Servidor)...");
  const mockItems = [
    {
      id: "item_1",
      quantity: 1,
      unitPriceCents: 460200, // Total: Gabinete R$ 990 + Kits R$ 3.612 = R$ 4.602,00
      subtotalCents: 460200,
      configuration: {
        model: {
          id: "wall_std",
          name: "Gabinete de Parede",
          basePriceCents: 99000, // R$ 990,00
        } as any,
        color: { id: "white_tx", name: "Branco TX" } as any,
        calculatedPriceCents: 460200,
      },
    },
  ];

  const discountCalc = calculateSelectiveCouponDiscount(mockItems, {
    code: "CARLOS10",
    sellerId: "user-seller-demo",
    sellerName: "Carlos Vendedor",
    sellerEmail: "vendedor@totempro.com.br",
    discountPercent: 10,
    commissionPercent: 8,
    active: true,
    eligibleCategory: "cabinet_only",
  });

  console.log(`   ✓ Base Elegível de Gabinete: R$ ${(discountCalc.eligibleCabinetsSubtotalCents / 100).toFixed(2)}`);
  console.log(`   ✓ Inelegível (Hardware/Kits): R$ ${(discountCalc.ineligibleSubtotalCents / 100).toFixed(2)}`);
  console.log(`   ✓ Desconto Aplicado (10% no Gabinete): -R$ ${(discountCalc.discountCents / 100).toFixed(2)}`);
  console.log(`   ✓ Comissão Vendedor (8% no Gabinete): +R$ ${(discountCalc.sellerCommissionCents / 100).toFixed(2)}`);
  console.log(`   ✓ Subtotal Final do Pedido: R$ ${(discountCalc.finalSubtotalCents / 100).toFixed(2)}`);

  if (discountCalc.discountCents !== 9900) {
    throw new Error(`Desconto incorreto: esperado 9900 centavos, obtido ${discountCalc.discountCents}`);
  }
  if (discountCalc.sellerCommissionCents !== 7920) {
    throw new Error(`Comissão incorreta: esperado 7920 centavos, obtido ${discountCalc.sellerCommissionCents}`);
  }
  if (discountCalc.finalSubtotalCents !== 450300) {
    throw new Error(`Total final incorreto: esperado 450300 centavos, obtido ${discountCalc.finalSubtotalCents}`);
  }

  // 3. Teste de Gravação e Auditoria de Utilização com Link Track
  console.log("\n3. Registrando Utilização com Atribuição de Campanha e Cliente...");
  const recorded = await recordVoucherUsage({
    voucherCode: "CARLOS10",
    orderId: `ord_test_${Date.now()}`,
    orderNumber: "TOT-2026-TESTVCH",
    orderStatus: "awaiting_payment",
    customer: {
      name: "João da Silva Teste",
      email: "joao.teste@empresa.com.br",
      whatsapp: "(11) 99999-8888",
      document: "12.345.678/0001-90",
      city: "Barueri",
      state: "SP",
    },
    influencer: {
      sellerId: "user-seller-demo",
      name: "Carlos Vendedor",
      email: "vendedor@totempro.com.br",
      pixKey: "11988887777",
      phone: "(11) 98888-7777",
      commissionPercent: 8,
    },
    financials: {
      grossItemsTotalCents: 460200,
      eligibleCabinetBaseCents: 99000,
      discountPercent: 10,
      discountCents: 9900,
      shippingCents: 15000,
      finalOrderTotalCents: 465300,
      influencerCommissionCents: 7920,
      payoutStatus: "pending",
      payoutNotes: "Aguardando confirmação Pix do pedido.",
    },
    campaignTracking: {
      hasTracking: true,
      landingUrl: linkStories.url,
      referrer: "https://l.instagram.com/",
      utmSource: "instagram",
      utmMedium: "stories",
      utmCampaign: "stories_carlos10",
      refCode: "CARLOS10",
      device: "mobile",
      capturedAt: new Date().toISOString(),
    },
  });

  console.log(`   ✓ Utilização gravada com sucesso! ID: ${recorded.id}`);
  console.log(`   ✓ Pedido: ${recorded.orderNumber} | Cliente: ${recorded.customer.name}`);
  console.log(`   ✓ Campanha: ${recorded.campaignTracking.utmSource} / ${recorded.campaignTracking.utmCampaign}`);

  // 4. Teste de Transição Atômica de Status (Sincronização de Pagamento do Pedido)
  console.log("\n4. Testando Sincronização do Status do Pedido para Liberação de Comissão...");
  await syncOrderStatusToVoucherUsage("TOT-2026-TESTVCH", "paid");
  
  const allUsagesAfterPaid = await getAllVoucherUsages({ search: "TOT-2026-TESTVCH" });
  const updatedAfterPaid = allUsagesAfterPaid[0];
  console.log(`   ✓ Novo status do pedido: ${updatedAfterPaid.orderStatus}`);
  console.log(`   ✓ Novo status da comissão: ${updatedAfterPaid.financials.payoutStatus}`);
  if (updatedAfterPaid.financials.payoutStatus !== "approved") {
    throw new Error(`Status de repasse incorreto: esperado 'approved', obtido '${updatedAfterPaid.financials.payoutStatus}'`);
  }

  // 5. Teste de Liquidação Financeira de Repasse PIX
  console.log("\n5. Testando Liquidação Financeira de Repasse PIX ao Influencer...");
  const payoutReceipt = "E12345678202610119999988887777";
  const updatedPayout = await updateVoucherPayout(recorded.id, {
    payoutStatus: "paid",
    payoutProof: payoutReceipt,
    payoutNotes: "Transferido via Itaú Pix pelo administrador.",
  });

  console.log(`   ✓ Status do Repasse: ${updatedPayout?.financials.payoutStatus}`);
  console.log(`   ✓ Comprovante Registrado: ${updatedPayout?.financials.payoutProof}`);
  console.log(`   ✓ Data de Pagamento: ${updatedPayout?.financials.paidAt}`);
  if (updatedPayout?.financials.payoutStatus !== "paid") {
    throw new Error("Falha ao registrar liquidação da comissão PIX.");
  }

  // 6. Teste de Métricas Financeiras Consolidadas
  console.log("\n6. Testando Métricas Financeiras Executivas...");
  const metrics = await getVoucherSummaryMetrics();
  console.log(`   ✓ Total de Vouchers Usados: ${metrics.totalUsages}`);
  console.log(`   ✓ Total de Descontos Concedidos: R$ ${(metrics.totalDiscountCents / 100).toFixed(2)}`);
  console.log(`   ✓ Total de Comissões Geradas: R$ ${(metrics.totalCommissionCents / 100).toFixed(2)}`);
  console.log(`   ✓ Total de Comissões Liquidadas (PIX): R$ ${(metrics.paidCommissionCents / 100).toFixed(2)}`);
  console.log(`   ✓ Top Influencers: ${metrics.topInfluencers.map((i) => `${i.name} (${i.couponCode}): R$ ${(i.commissionCents / 100).toFixed(2)}`).join(", ")}`);
  console.log(`   ✓ Origens de Tráfego: ${metrics.topSources.map((s) => `${s.source}: ${s.count} vendas`).join(", ")}`);

  // 7. Teste da Visão do Vendedor/Influenciador
  console.log("\n7. Testando Extrato Específico do Vendedor (CARLOS10)...");
  const sellerRecords = await getVoucherUsagesBySeller("CARLOS10");
  console.log(`   ✓ Quantidade de registros do vendedor: ${sellerRecords.length}`);
  if (sellerRecords.length < 2) {
    throw new Error("Esperado pelo menos 2 registros no extrato do vendedor.");
  }

  console.log("\n===================================================================");
  console.log("🎉 TODOS OS TESTES PASSARAM COM 100% DE SUCESSO!");
  console.log("===================================================================");
}

testVoucherManagement().catch((err) => {
  console.error("\n❌ ERRO NA AUDITORIA DE VOUCHERS:", err);
  process.exit(1);
});
