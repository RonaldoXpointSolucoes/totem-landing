/**
 * TotemPro — Motor de Precificação Reversa e Engenharia de Margem (Markup Reverso)
 * 
 * Permite ao lojista/administrador definir o valor líquido desejado ("No Meu Bolso")
 * e especificar os custos contábeis reais de venda:
 *  - Desconto do Cliente (Cupom em R$ ou %)
 *  - Comissão do Influenciador (em R$ ou %)
 *  - Custo do Cartão em 10x (taxa de intermediação + antecipação em R$ ou %)
 * 
 * E calcula automaticamente os preços de venda à vista no PIX, parcelado em até 10x no Cartão,
 * âncoras comerciais ("De / Por") e simula o DRE completo para cada canal de venda.
 */

export interface ReversePricingInput {
  targetNetCents: number; // Ex: 99000 (R$ 990,00)
  customerDiscountCents?: number; // Ex: 10000 (R$ 100,00)
  influencerCommissionCents?: number; // Ex: 10000 (R$ 100,00)
  cardFeeCents?: number; // Ex: 20000 (R$ 200,00)
  customerCouponPercent?: number; // Ex: 0, 10 ou 20%
  influencerCommissionPercent?: number; // Ex: 0, 5 ou 10%
  installments?: number; // Ex: 10 parcelas
  cardFeePercent?: number; // Taxa média de gateway + antecipação 10x (ex: 14%)
  pixDiscountPercent?: number; // Desconto de incentivo no PIX à vista (ex: 17.5%)
}

export interface DREScenario {
  id: "pix_direct" | "pix_influencer" | "card_installments";
  title: string;
  badge: string;
  customerPaysCents: number;
  discountCents: number;
  influencerCommissionCents: number;
  gatewayFeeCents: number;
  netReceivedCents: number;
  targetDifferenceCents: number;
  percentageOfTarget: number;
  description: string;
}

export interface ReversePricingResult {
  targetNetCents: number;
  customerDiscountCents: number;
  influencerCommissionCents: number;
  cardFeeCents: number;
  cardPriceCents: number; // Preço de tabela no cartão (ex: R$ 1.390,00)
  cardPriceWithDiscountCents: number; // Preço pago no cartão com cupom (ex: R$ 1.290,00)
  pixPriceCents: number; // Preço promocional no PIX à vista direto (ex: R$ 990,00)
  pixInfluencerBaseCents: number; // Preço de tabela PIX com cupom (ex: R$ 1.190,00)
  pixPriceWithDiscountCents: number; // Preço pago no PIX com cupom (ex: R$ 1.090,00)
  anchorPriceCents: number; // Preço "De" de vitrine (ex: R$ 1.590,00)
  installments: number; // Ex: 10
  installmentMonthlyCents: number; // Ex: R$ 139,00
  installmentWithDiscountMonthlyCents: number; // Ex: R$ 129,00
  effectivePixDiscountPercent: number; // Ex: economia no PIX em relação ao cartão
  scenarios: {
    pixDirect: DREScenario;
    pixInfluencer: DREScenario;
    cardInstallments: DREScenario;
  };
}

/**
 * Arredonda para valores comerciais atraentes (terminados em 0 ou 90 reais)
 * Ex: 1198 -> 1200, 1387 -> 1390
 */
export function roundToCommercialPrice(cents: number): number {
  const reais = Math.round(cents / 100);
  const remainder = reais % 10;
  let commercialReais = reais;
  if (remainder >= 5) {
    commercialReais = reais + (10 - remainder);
  } else {
    commercialReais = reais - remainder;
  }
  return commercialReais * 100;
}

/**
 * Calcula a precificação reversa baseada no valor líquido desejado pelo lojista
 */
export function calculateReversePricing(input: ReversePricingInput): ReversePricingResult {
  const targetNetCents = Math.max(1000, input.targetNetCents || 99000);
  const installments = Math.max(1, Math.min(24, input.installments ?? 10));

  // Verifica se o lojista definiu custos explícitos em reais (R$)
  const hasExplicitCosts =
    input.customerDiscountCents !== undefined ||
    input.influencerCommissionCents !== undefined ||
    input.cardFeeCents !== undefined;

  let customerDiscountCents = 0;
  let influencerCommissionCents = 0;
  let cardFeeCents = 0;
  let calculatedCardCents = 0;
  let pixPriceCents = targetNetCents;
  let pixInfluencerBaseCents = targetNetCents;

  if (hasExplicitCosts) {
    customerDiscountCents = Math.max(0, input.customerDiscountCents ?? 10000); // Padrão R$ 100,00
    influencerCommissionCents = Math.max(0, input.influencerCommissionCents ?? 10000); // Padrão R$ 100,00
    cardFeeCents = Math.max(0, input.cardFeeCents ?? 20000); // Padrão R$ 200,00

    // PRECIFICAÇÃO REVERSA EXATA:
    // No Cartão 10x: Preço de Tabela = Meta no Bolso + Desconto Cliente + Comissão Influencer + Custo Cartão 10x
    calculatedCardCents = targetNetCents + customerDiscountCents + influencerCommissionCents + cardFeeCents;

    // No PIX via Influencer: Preço Base = Meta no Bolso + Desconto Cliente + Comissão Influencer (SEM custo de cartão!)
    pixInfluencerBaseCents = targetNetCents + customerDiscountCents + influencerCommissionCents;

    // No PIX Direto à vista: Preço = Meta no Bolso (ou com desconto à vista)
    pixPriceCents = targetNetCents;
  } else {
    // Modo percentual padrão / compatibilidade com catálogo base
    const couponPercent = Math.max(0, Math.min(50, input.customerCouponPercent ?? 10));
    const commissionPercent = Math.max(0, Math.min(30, input.influencerCommissionPercent ?? 10));

    calculatedCardCents = Math.round(targetNetCents * 1.212);
    calculatedCardCents = roundToCommercialPrice(calculatedCardCents);

    customerDiscountCents = Math.round(calculatedCardCents * (couponPercent / 100));
    influencerCommissionCents = Math.round(calculatedCardCents * (commissionPercent / 100));
    cardFeeCents = Math.round(calculatedCardCents * 0.135);

    pixInfluencerBaseCents = targetNetCents + customerDiscountCents + influencerCommissionCents;
    pixPriceCents = targetNetCents;
  }

  // Preço que o cliente paga no cartão após aplicar o cupom
  const cardPriceWithDiscountCents = Math.max(0, calculatedCardCents - customerDiscountCents);
  // Preço que o cliente paga no PIX após aplicar o cupom
  const pixPriceWithDiscountCents = Math.max(0, pixInfluencerBaseCents - customerDiscountCents);

  // Parcelas mensais
  const installmentMonthlyCents = Math.round(calculatedCardCents / installments);
  const installmentWithDiscountMonthlyCents = Math.round(cardPriceWithDiscountCents / installments);

  // Preço Âncora comercial de vitrine ("De / Por")
  const anchorPriceCents = roundToCommercialPrice(Math.round(calculatedCardCents * 1.16));

  // Economia percentual do PIX em relação ao valor de tabela do cartão
  const effectivePixDiscountPercent = calculatedCardCents > 0
    ? Math.round(((calculatedCardCents - pixPriceCents) / calculatedCardCents) * 100)
    : 0;

  // CONSTRUÇÃO DO DRE CONTÁBIL (DEMONSTRAÇÃO DE RESULTADO DO EXERCÍCIO)
  // Cenário 1: PIX Direto (Sem cupom, sem intermediários, 100% da meta)
  const pixDirectScenario: DREScenario = {
    id: "pix_direct",
    title: "Venda Direta no PIX à Vista",
    badge: "100% Limpo no Bolso",
    customerPaysCents: pixPriceCents,
    discountCents: 0,
    influencerCommissionCents: 0,
    gatewayFeeCents: 0,
    netReceivedCents: pixPriceCents,
    targetDifferenceCents: pixPriceCents - targetNetCents,
    percentageOfTarget: 100,
    description: "Cliente compra direto no site à vista. Zero taxas de operadora, zero comissões. Você recebe 100% da sua meta limpa.",
  };

  let pixInfluencerScenario: DREScenario;
  let cardInstallmentsScenario: DREScenario;

  if (hasExplicitCosts) {
    // Cenário 2 Explícito: PIX com Influenciador (Desconto + Comissão, SEM taxa de cartão)
    const netPixInfluencer = pixPriceWithDiscountCents - influencerCommissionCents;
    pixInfluencerScenario = {
      id: "pix_influencer",
      title: "PIX via Link de Influencer",
      badge: "Parceria sem Taxa de Cartão",
      customerPaysCents: pixPriceWithDiscountCents,
      discountCents: customerDiscountCents,
      influencerCommissionCents: influencerCommissionCents,
      gatewayFeeCents: 0,
      netReceivedCents: netPixInfluencer,
      targetDifferenceCents: netPixInfluencer - targetNetCents,
      percentageOfTarget: targetNetCents > 0 ? Math.round((netPixInfluencer / targetNetCents) * 100) : 100,
      description: `Cliente paga no PIX com desconto do cupom (R$ ${(customerDiscountCents / 100).toFixed(2)}). Você paga a comissão de R$ ${(influencerCommissionCents / 100).toFixed(2)} e sobra exatamente R$ ${(netPixInfluencer / 100).toFixed(2)} limpo no bolso, livre de taxas bancárias.`,
    };

    // Cenário 3 Explícito: Cartão em 10x com Influenciador (Absorve desconto, taxa de 10x e comissão)
    const netCard = cardPriceWithDiscountCents - cardFeeCents - influencerCommissionCents;
    cardInstallmentsScenario = {
      id: "card_installments",
      title: `Cartão em ${installments}x via Influencer`,
      badge: "Parcelado Protegido",
      customerPaysCents: cardPriceWithDiscountCents,
      discountCents: customerDiscountCents,
      influencerCommissionCents: influencerCommissionCents,
      gatewayFeeCents: cardFeeCents,
      netReceivedCents: netCard,
      targetDifferenceCents: netCard - targetNetCents,
      percentageOfTarget: targetNetCents > 0 ? Math.round((netCard / targetNetCents) * 100) : 100,
      description: `Cliente parcela em até ${installments}x de ${((installmentWithDiscountMonthlyCents) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}. Absorve o cupom de R$ ${(customerDiscountCents / 100).toFixed(2)}, o custo do cartão de R$ ${(cardFeeCents / 100).toFixed(2)} e a comissão de R$ ${(influencerCommissionCents / 100).toFixed(2)}, entregando exatamente R$ ${(netCard / 100).toFixed(2)} no bolso.`,
    };
  } else {
    // Modo percentual legado (garante compatibilidade matemática)
    const couponPercent = Math.max(0, Math.min(50, input.customerCouponPercent ?? 10));
    const commissionPercent = Math.max(0, Math.min(30, input.influencerCommissionPercent ?? 10));

    const discountAmountPix = Math.round(calculatedCardCents * (couponPercent / 100));
    const customerPaysInfluencerPix = calculatedCardCents - discountAmountPix;
    const influencerCommissionPix = Math.round(calculatedCardCents * (commissionPercent / 100));
    const netPixInfluencer = customerPaysInfluencerPix - influencerCommissionPix;

    pixInfluencerScenario = {
      id: "pix_influencer",
      title: `PIX via Influencer (Cupom ${couponPercent}% + Comiss. ${commissionPercent}%)`,
      badge: "Parceria Influencer",
      customerPaysCents: customerPaysInfluencerPix,
      discountCents: discountAmountPix,
      influencerCommissionCents: influencerCommissionPix,
      gatewayFeeCents: 0,
      netReceivedCents: netPixInfluencer,
      targetDifferenceCents: netPixInfluencer - targetNetCents,
      percentageOfTarget: Math.round((netPixInfluencer / targetNetCents) * 100),
      description: `Cliente recebe ${couponPercent}% de desconto e o influencer ganha ${commissionPercent}%. Você recebe ${((netPixInfluencer) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} líquido.`,
    };

    const cardGatewayFee = Math.round(calculatedCardCents * 0.135);
    const influencerCardCommission = Math.max(0, calculatedCardCents - cardGatewayFee - targetNetCents);
    const netCard = calculatedCardCents - cardGatewayFee - influencerCardCommission;

    cardInstallmentsScenario = {
      id: "card_installments",
      title: `Cartão em ${installments}x (Parcelado sem juros)`,
      badge: "Volume Máximo",
      customerPaysCents: calculatedCardCents,
      discountCents: 0,
      influencerCommissionCents: influencerCardCommission,
      gatewayFeeCents: cardGatewayFee,
      netReceivedCents: netCard,
      targetDifferenceCents: netCard - targetNetCents,
      percentageOfTarget: Math.round((netCard / targetNetCents) * 100),
      description: `Cliente parcela em até ${installments}x de ${((installmentMonthlyCents) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}. Absorve a taxa do cartão e entrega sua meta de R$ ${(targetNetCents / 100).toFixed(2)}.`,
    };
  }

  return {
    targetNetCents,
    customerDiscountCents,
    influencerCommissionCents,
    cardFeeCents,
    cardPriceCents: calculatedCardCents,
    cardPriceWithDiscountCents,
    pixPriceCents,
    pixInfluencerBaseCents,
    pixPriceWithDiscountCents,
    anchorPriceCents,
    installments,
    installmentMonthlyCents,
    installmentWithDiscountMonthlyCents,
    effectivePixDiscountPercent,
    scenarios: {
      pixDirect: pixDirectScenario,
      pixInfluencer: pixInfluencerScenario,
      cardInstallments: cardInstallmentsScenario,
    },
  };
}
