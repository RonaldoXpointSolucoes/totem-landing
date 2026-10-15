import { CartItem, TotemConfiguration } from "@/types/order";

export interface SelectiveCoupon {
  code: string;
  sellerId?: string;
  sellerEmail?: string;
  sellerName?: string;
  discountPercent: number; // Porcentagem aplicada APENAS no gabinete (ex: 10 para 10%)
  commissionPercent: number; // Porcentagem de comissão do vendedor sobre o gabinete (ex: 8 para 8%)
  active: boolean;
  minOrderValueCents?: number;
  eligibleCategory: "cabinet_only";
}

export interface CouponDiscountCalculation {
  couponCode: string;
  isValid: boolean;
  errorMessage?: string;
  eligibleCabinetsSubtotalCents: number;
  ineligibleSubtotalCents: number;
  discountPercent: number;
  discountCents: number;
  finalSubtotalCents: number;
  sellerCommissionCents: number;
  sellerEmail?: string;
}

/**
 * Motor Soberano de Desconto Seletivo TotemPro
 *
 * REGRA COMERCIAL CRÍTICA:
 * - O desconto do cupom é calculado EXCLUSIVAMENTE sobre o valor-base dos gabinetes (chassi usinado CNC).
 * - Componentes de montagem de hardware (monitores, kits, mini PCs, impressoras térmicas, pinpads, leitores)
 *   e acréscimos especiais permanecem em valor integral (0% de desconto).
 * - Fretes de transportadora não sofrem abatimento.
 * - Todos os valores são calculados em centavos inteiros (Math.round), sem dízimas monetárias.
 */
export function calculateSelectiveCouponDiscount(
  items: CartItem[],
  coupon: SelectiveCoupon | null | undefined
): CouponDiscountCalculation {
  let eligibleCabinetsSubtotalCents = 0;
  let ineligibleSubtotalCents = 0;

  for (const item of items) {
    const qty = Math.max(1, item.quantity);
    const model = item.configuration.model;
    const cardBase = Math.max(0, model.basePriceCents || 0);
    const cabinetBase = Math.max(
      0,
      model.pixPriceCents ||
        (cardBase >= 120000 ? Math.round(cardBase * 0.825) : cardBase)
    );

    // O gabinete base (no PIX) é o item base para cálculo
    eligibleCabinetsSubtotalCents += cabinetBase * qty;

    // A diferença do preço unitário em relação ao gabinete base é composta por cores/kits/extras
    const unitPrice = Math.max(0, item.unitPriceCents);
    const extraComponentsPerUnit = Math.max(0, unitPrice - cabinetBase);
    ineligibleSubtotalCents += extraComponentsPerUnit * qty;
  }

  const rawTotal = eligibleCabinetsSubtotalCents + ineligibleSubtotalCents;

  if (!coupon || !coupon.active) {
    return {
      couponCode: "",
      isValid: false,
      eligibleCabinetsSubtotalCents,
      ineligibleSubtotalCents,
      discountPercent: 0,
      discountCents: 0,
      finalSubtotalCents: rawTotal,
      sellerCommissionCents: 0,
    };
  }

  // Verifica valor mínimo de pedido se configurado
  if (coupon.minOrderValueCents && (eligibleCabinetsSubtotalCents + ineligibleSubtotalCents) < coupon.minOrderValueCents) {
    const rawTotal = eligibleCabinetsSubtotalCents + ineligibleSubtotalCents;
    return {
      couponCode: coupon.code,
      isValid: false,
      errorMessage: `O pedido mínimo para este cupom é de ${(coupon.minOrderValueCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.`,
      eligibleCabinetsSubtotalCents,
      ineligibleSubtotalCents,
      discountPercent: 0,
      discountCents: 0,
      finalSubtotalCents: rawTotal,
      sellerCommissionCents: 0,
    };
  }

  // Desconto calculado estritamente sobre a base dos gabinetes
  const discountPercent = Math.max(0, Math.min(100, coupon.discountPercent));
  const discountCents = Math.round(eligibleCabinetsSubtotalCents * (discountPercent / 100));

  // Comissão do vendedor calculada estritamente sobre a base dos gabinetes
  const commissionPercent = Math.max(0, Math.min(100, coupon.commissionPercent || 0));
  const sellerCommissionCents = Math.round(eligibleCabinetsSubtotalCents * (commissionPercent / 100));

  const finalSubtotalCents = Math.max(
    0,
    (eligibleCabinetsSubtotalCents - discountCents) + ineligibleSubtotalCents
  );

  return {
    couponCode: coupon.code.toUpperCase().trim(),
    isValid: true,
    eligibleCabinetsSubtotalCents,
    ineligibleSubtotalCents,
    discountPercent,
    discountCents,
    finalSubtotalCents,
    sellerCommissionCents,
    sellerEmail: coupon.sellerEmail,
  };
}
