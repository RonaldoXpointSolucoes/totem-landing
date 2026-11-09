import { CabinetModel, ColorOption, MonitorOption, PrinterOption, BarcodeReaderOption } from "@/types/catalog";
import { TotemConfiguration } from "@/types/order";
import { isItemKit, getEffectiveKitItems, calculateKitTotalCents } from "@/modules/catalog/kitDefaults";

export interface CustomizationAdjustment {
  approved: boolean;
  priceAdjustmentCents: number;
  description?: string;
}

export const ASSEMBLY_SERVICE_PRICE_CENTS = 99900; // R$ 999,00 serviço de montagem completa do totem

/**
 * Constantes Oficiais da Integração Mercado Pago (Modo "Parcelado Cliente"):
 * - Taxa de intermediação à vista cobrada do vendedor pelo Mercado Pago: 4,98% (ex: R$ 77,59 sobre R$ 1.558,00)
 * - Divisor exato por dentro (Gross-Up): 1 - 0,0498 = 0,9502
 * - Divisor com margem de segurança recomendada (5,00% por dentro): 0,95
 *   Garante que 100% do valor do PIX caia líquido na conta do Mercado Pago na hora + margem de centavos.
 * - Acréscimo de parcelamento em 10x cobrado do comprador pelo Mercado Pago: 20,65%
 */
export const MERCADOPAGO_SELLER_CARD_FEE_RATE = 0.0498;
export const MERCADOPAGO_EXACT_CARD_DIVISOR = 1 - MERCADOPAGO_SELLER_CARD_FEE_RATE; // 0.9502
export const MERCADOPAGO_SAFE_CARD_DIVISOR = 0.95; // 5.00% por dentro (~ +5,2632% sobre o PIX)
export const MERCADOPAGO_BUYER_10X_FINANCING_RATE = 0.2065; // +20,65% em 10x no MP

/**
 * Calcula o valor seguro a ser cobrado no Link/Preferência de Cartão do Mercado Pago
 * para que o lojista receba 100% do valor à vista (PIX) líquido na conta na hora.
 * Fórmula: Math.ceil(pixCents / 0.95)
 * Exemplo: R$ 1.558,00 (PIX) -> R$ 1.640,00 (Cobrado no Link) -> MP desconta 4,98% (R$ 81,67) -> Recebe líquido R$ 1.558,33
 */
export function calculateSafeCardChargeCents(pixCents: number): number {
  const safePix = Math.max(0, Math.round(Number(pixCents) || 0));
  if (safePix === 0) return 0;
  return Math.ceil(safePix / MERCADOPAGO_SAFE_CARD_DIVISOR);
}

/**
 * Calcula o valor matemático exato (sem folga extra) para cobrir os 4,98% do Mercado Pago.
 * Fórmula: Math.ceil(pixCents / 0.9502)
 * Exemplo: R$ 1.558,00 (PIX) -> R$ 1.639,66 (Cobrado no Link) -> MP desconta 4,98% (R$ 81,66) -> Recebe líquido R$ 1.558,00
 */
export function calculateExactCardChargeCents(pixCents: number): number {
  const safePix = Math.max(0, Math.round(Number(pixCents) || 0));
  if (safePix === 0) return 0;
  return Math.ceil(safePix / MERCADOPAGO_EXACT_CARD_DIVISOR);
}

export interface MercadoPagoCardSimulation {
  pixTargetCents: number;
  safeCardChargeCents: number;
  exactCardChargeCents: number;
  cardProtectionAdditionCents: number;
  mpSellerFeeCents: number;
  netReceivedCents: number;
  safetyBufferCents: number;
  ifChargedWithoutProtectionFeeCents: number;
  ifChargedWithoutProtectionNetCents: number;
  buyer10xInterestCents: number;
  buyer10xTotalCents: number;
  buyer10xInstallmentCents: number;
}

/**
 * Simula todos os valores financeiros da cobrança em Cartão de Crédito no Mercado Pago ("Parcelado Cliente").
 */
export function simulateMercadoPagoCardBreakdown(pixTargetCents: number): MercadoPagoCardSimulation {
  const safePix = Math.max(0, Math.round(Number(pixTargetCents) || 0));
  const safeCardChargeCents = calculateSafeCardChargeCents(safePix);
  const exactCardChargeCents = calculateExactCardChargeCents(safePix);
  const cardProtectionAdditionCents = Math.max(0, safeCardChargeCents - safePix);

  // Taxa real de 4,98% que o Mercado Pago retém do vendedor sobre o valor cobrado no link
  const mpSellerFeeCents = Math.round(safeCardChargeCents * MERCADOPAGO_SELLER_CARD_FEE_RATE);
  const netReceivedCents = Math.max(0, safeCardChargeCents - mpSellerFeeCents);
  const safetyBufferCents = netReceivedCents - safePix;

  // Caso fosse cobrado o valor do PIX sem proteção (ex: R$ 1.558,00 -> perde R$ 77,59 -> recebe R$ 1.480,41)
  const ifChargedWithoutProtectionFeeCents = Math.round(safePix * MERCADOPAGO_SELLER_CARD_FEE_RATE);
  const ifChargedWithoutProtectionNetCents = Math.max(0, safePix - ifChargedWithoutProtectionFeeCents);

  // Acréscimo de parcelamento cobrado do comprador pelo Mercado Pago caso ele escolha 10x (+20,65%)
  const buyer10xInterestCents = Math.round(safeCardChargeCents * MERCADOPAGO_BUYER_10X_FINANCING_RATE);
  const buyer10xTotalCents = safeCardChargeCents + buyer10xInterestCents;
  const buyer10xInstallmentCents = Math.round(buyer10xTotalCents / 10);

  return {
    pixTargetCents: safePix,
    safeCardChargeCents,
    exactCardChargeCents,
    cardProtectionAdditionCents,
    mpSellerFeeCents,
    netReceivedCents,
    safetyBufferCents,
    ifChargedWithoutProtectionFeeCents,
    ifChargedWithoutProtectionNetCents,
    buyer10xInterestCents,
    buyer10xTotalCents,
    buyer10xInstallmentCents,
  };
}

export interface PriceCalculationInput {
  cabinet: CabinetModel;
  color: ColorOption;
  monitor?: MonitorOption | null;
  printer?: PrinterOption | null;
  barcodeReader?: BarcodeReaderOption | null;
  customization?: CustomizationAdjustment | null;
  kitAdjustmentCents?: number;
  includeAssemblyService?: boolean;
}

export interface PriceBreakdown {
  basePriceCents: number;
  pixBasePriceCents: number;
  cardBasePriceCents: number;
  colorAdjustmentCents: number;
  equipmentAdjustmentCents: number;
  customizationAdjustmentCents: number;
  assemblyServiceAdjustmentCents: number;
  includeAssemblyService: boolean;
  totalPriceCents: number;
  pixTotalPriceCents: number;
  cardTotalPriceCents: number;
  maxInstallments: number;
}

/**
 * Motor Único e Autoritativo de Precificação do Totem
 * Regra Comercial Inegociável:
 * - O gabinete possui preço-base configurável no Cartão e no PIX.
 * - Por padrão, a experiência visual do configurador expõe o preço com desconto no PIX.
 * - Cores podem possuir acréscimo (Branco = 0, Preto = +X, Black White = +Y).
 * - Equipamentos homologados avulsos NÃO alteram o preço padrão do gabinete (+ R$ 0,00 de furação).
 * - O Kit de Montagem soma o valor dinâmico dos seus sub-itens de hardware ativos.
 * - Personalizações fora do catálogo homologado entram com acréscimo apenas se previamente aprovadas pelo admin.
 */
export function calculateTotemPrice(input: PriceCalculationInput): PriceBreakdown {
  const rawCabinetBaseCents = Math.max(0, input.cabinet.basePriceCents || 0);
  const pixBasePriceCents = Math.max(
    0,
    input.cabinet.pixPriceCents ||
      (rawCabinetBaseCents >= 120000 ? Math.round(rawCabinetBaseCents * 0.825) : rawCabinetBaseCents)
  );
  // Preço-base seguro no Cartão (protegido contra os 4,98% do Mercado Pago com divisor 0,95)
  const cardBasePriceCents = calculateSafeCardChargeCents(pixBasePriceCents);
  const maxInstallments = input.cabinet.maxInstallments || 10;
  const colorAdjustmentCents = Math.max(0, input.color.priceAdjustmentCents || 0);

  // Se for o Kit de Montagem, soma o valor total dos sub-itens de hardware selecionados.
  // Se forem equipamentos homologados avulsos com valor configurado (priceAdjustmentCents > 0), soma seus valores.
  let equipmentAdjustmentCents = 0;
  if (input.monitor && isItemKit(input.monitor)) {
    if (input.kitAdjustmentCents !== undefined) {
      equipmentAdjustmentCents = Math.max(0, input.kitAdjustmentCents);
    } else {
      const effectiveItems = getEffectiveKitItems(input.monitor);
      equipmentAdjustmentCents = calculateKitTotalCents(effectiveItems);
    }
  } else if (input.kitAdjustmentCents !== undefined && input.kitAdjustmentCents > 0) {
    equipmentAdjustmentCents = Math.max(0, input.kitAdjustmentCents);
  } else {
    const monitorPrice = Math.max(
      0,
      input.monitor?.priceAdjustmentCents ?? (input.monitor as any)?.price_adjustment_cents ?? 0
    );
    const printerPrice = Math.max(
      0,
      input.printer?.priceAdjustmentCents ?? (input.printer as any)?.price_adjustment_cents ?? 0
    );
    const readerPrice = Math.max(
      0,
      input.barcodeReader?.priceAdjustmentCents ?? (input.barcodeReader as any)?.price_adjustment_cents ?? 0
    );
    equipmentAdjustmentCents = monitorPrice + printerPrice + readerPrice;
  }

  // Personalizações especiais avaliadas pelo admin
  const customizationAdjustmentCents =
    input.customization && input.customization.approved
      ? Math.max(0, input.customization.priceAdjustmentCents || 0)
      : 0;

  // Serviço opcional de montagem completa do Totem de fábrica (+ R$ 999,00)
  const includeAssembly = Boolean(input.includeAssemblyService);
  const assemblyServiceAdjustmentCents = includeAssembly ? ASSEMBLY_SERVICE_PRICE_CENTS : 0;

  const pixTotalPriceCents =
    pixBasePriceCents +
    colorAdjustmentCents +
    equipmentAdjustmentCents +
    customizationAdjustmentCents +
    assemblyServiceAdjustmentCents;

  // Valor total a ser cobrado no Cartão com proteção integral (Gross-Up ÷ 0,95 sobre todo o item: Gabinete + Cor + Kit + Montagem)
  const cardTotalPriceCents = calculateSafeCardChargeCents(pixTotalPriceCents);

  return {
    basePriceCents: cardBasePriceCents,
    pixBasePriceCents,
    cardBasePriceCents,
    colorAdjustmentCents,
    equipmentAdjustmentCents,
    customizationAdjustmentCents,
    assemblyServiceAdjustmentCents,
    includeAssemblyService: includeAssembly,
    // O valor exibido como total do Totem no configurador passa a ser o PIX
    totalPriceCents: pixTotalPriceCents,
    pixTotalPriceCents,
    cardTotalPriceCents,
    maxInstallments,
  };
}

/**
 * Formata centavos para a representação monetária oficial brasileira (R$ X.XXX,XX)
 */
export function formatBRL(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format((cents || 0) / 100);
}
