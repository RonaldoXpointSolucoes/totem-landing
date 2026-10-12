/**
 * TotemPro — Motor de Precificação Reversa e Engenharia de Margem (Markup Reverso)
 * 
 * Permite ao lojista/administrador definir o valor líquido desejado ("No Meu Bolso")
 * e calcula automaticamente os preços de venda à vista no PIX, parcelado em até 10x no Cartão,
 * âncoras comerciais ("De / Por") e simula o DRE completo para cada canal de venda.
 */

export interface ReversePricingInput {
  targetNetCents: number; // Ex: 99000 (R$ 990,00)
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
  cardPriceCents: number; // Preço no cartão (ex: R$ 1.200,00)
  pixPriceCents: number; // Preço promocional no PIX (ex: R$ 990,00)
  anchorPriceCents: number; // Preço "De" de vitrine (ex: R$ 1.390,00)
  installments: number; // Ex: 10
  installmentMonthlyCents: number; // Ex: R$ 120,00
  effectivePixDiscountPercent: number; // Ex: 17.5% de economia no PIX
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
  // Arredonda para a dezena mais próxima (ex: 1192 -> 1190 ou 1200)
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
  const couponPercent = Math.max(0, Math.min(50, input.customerCouponPercent ?? 10));
  const commissionPercent = Math.max(0, Math.min(30, input.influencerCommissionPercent ?? 10));
  const installments = Math.max(1, Math.min(24, input.installments ?? 10));

  // 1. Preço no PIX à vista:
  // Se o lojista quer receber R$ 990,00 no PIX direto, o preço à vista é o próprio targetNetCents
  const pixPriceCents = targetNetCents;

  // 2. Preço no Cartão (10x):
  // Regra do Usuário: Para receber R$ 990,00 no bolso em 10x, o valor cobrado no cartão deve ser ~R$ 1.200,00 (+ comissões se houver)
  // Taxa de cartão em 10x (antecipação parcelada ~14% do gateway)
  // Se o lojista definiu R$ 990,00 e temos ~14% de cartão e comissão:
  // Preço base cartão calculado: targetNet / (1 - taxaCartao) -> 990 / 0.825 = ~1.200
  let calculatedCardCents = Math.round(targetNetCents * 1.212); // Coeficiente que transforma R$ 990 em ~R$ 1.200
  calculatedCardCents = roundToCommercialPrice(calculatedCardCents);

  // Parcela individual (ex: 10x de R$ 120,00)
  const installmentMonthlyCents = Math.round(calculatedCardCents / installments);

  // 3. Preço Âncora "De" (Âncora comercial para gerar sensação de alta economia na vitrine)
  // Ex: Se o cartão é R$ 1.200, a âncora é ~R$ 1.390
  const anchorPriceCents = roundToCommercialPrice(Math.round(calculatedCardCents * 1.16));

  // Economia percentual do PIX em relação ao valor do cartão
  const effectivePixDiscountPercent = Math.round(
    ((calculatedCardCents - pixPriceCents) / calculatedCardCents) * 100
  );

  // 4. Construção dos Cenários do DRE
  // Cenário 1: PIX Direto (Sem cupom, sem comissão, taxa zero)
  const pixDirectScenario: DREScenario = {
    id: "pix_direct",
    title: "Venda Direta no PIX (Sem Cupom)",
    badge: "Margem Máxima",
    customerPaysCents: pixPriceCents,
    discountCents: 0,
    influencerCommissionCents: 0,
    gatewayFeeCents: 0,
    netReceivedCents: pixPriceCents,
    targetDifferenceCents: pixPriceCents - targetNetCents,
    percentageOfTarget: 100,
    description: "Cliente paga à vista com desconto instantâneo no PIX. Você recebe 100% da sua meta limpa.",
  };

  // Cenário 2: PIX com Influenciador (Preço cartão/tabela com cupom de 10% e comissão de 10%)
  // Cliente compra pelo link do influencer:
  // Se aplicar cupom de 10% sobre o preço de tabela R$ 1.200:
  // Cliente paga: R$ 1.200 - 10% = R$ 1.080
  // Comissão influencer (10% sobre o gabinete): R$ 108
  // Líquido lojista: R$ 1.080 - R$ 108 = R$ 972 (~98% da meta de R$ 990)
  const discountAmountPix = Math.round(calculatedCardCents * (couponPercent / 100));
  const customerPaysInfluencerPix = calculatedCardCents - discountAmountPix;
  const influencerCommissionPix = Math.round(calculatedCardCents * (commissionPercent / 100));
  const netPixInfluencer = customerPaysInfluencerPix - influencerCommissionPix;

  const pixInfluencerScenario: DREScenario = {
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

  // Cenário 3: Cartão 10x com Parcelamento
  // Cliente paga em 10x de R$ 120,00 = R$ 1.200,00
  // Taxa de antecipação do cartão 10x (~13.5% = R$ 162,00)
  // Comissão ou margem retida
  const cardGatewayFee = Math.round(calculatedCardCents * 0.135); // ~13.5%
  // Se houver comissão de influenciador no cartão (ex: 5% a 8% ou valor residual)
  const influencerCardCommission = Math.max(0, calculatedCardCents - cardGatewayFee - targetNetCents);
  const netCard = calculatedCardCents - cardGatewayFee - influencerCardCommission;

  const cardInstallmentsScenario: DREScenario = {
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
    description: `Cliente parcela em até ${installments}x de ${((installmentMonthlyCents) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}. Absorve a taxa do cartão e entrega sua meta de R$ 990,00.`,
  };

  return {
    targetNetCents,
    cardPriceCents: calculatedCardCents,
    pixPriceCents,
    anchorPriceCents,
    installments,
    installmentMonthlyCents,
    effectivePixDiscountPercent,
    scenarios: {
      pixDirect: pixDirectScenario,
      pixInfluencer: pixInfluencerScenario,
      cardInstallments: cardInstallmentsScenario,
    },
  };
}
