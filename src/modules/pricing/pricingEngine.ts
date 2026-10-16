import { CabinetModel, ColorOption, MonitorOption, PrinterOption, BarcodeReaderOption } from "@/types/catalog";
import { TotemConfiguration } from "@/types/order";
import { isItemKit, getEffectiveKitItems, calculateKitTotalCents } from "@/modules/catalog/kitDefaults";

export interface CustomizationAdjustment {
  approved: boolean;
  priceAdjustmentCents: number;
  description?: string;
}

export interface PriceCalculationInput {
  cabinet: CabinetModel;
  color: ColorOption;
  monitor?: MonitorOption | null;
  printer?: PrinterOption | null;
  barcodeReader?: BarcodeReaderOption | null;
  customization?: CustomizationAdjustment | null;
  kitAdjustmentCents?: number;
}

export interface PriceBreakdown {
  basePriceCents: number;
  pixBasePriceCents: number;
  cardBasePriceCents: number;
  colorAdjustmentCents: number;
  equipmentAdjustmentCents: number;
  customizationAdjustmentCents: number;
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
  const cardBasePriceCents = Math.max(0, input.cabinet.basePriceCents || 0);
  const pixBasePriceCents = Math.max(
    0,
    input.cabinet.pixPriceCents ||
      (cardBasePriceCents >= 120000 ? Math.round(cardBasePriceCents * 0.825) : cardBasePriceCents)
  );
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

  const pixTotalPriceCents =
    pixBasePriceCents +
    colorAdjustmentCents +
    equipmentAdjustmentCents +
    customizationAdjustmentCents;

  const cardTotalPriceCents =
    cardBasePriceCents +
    colorAdjustmentCents +
    equipmentAdjustmentCents +
    customizationAdjustmentCents;

  return {
    basePriceCents: cardBasePriceCents,
    pixBasePriceCents,
    cardBasePriceCents,
    colorAdjustmentCents,
    equipmentAdjustmentCents,
    customizationAdjustmentCents,
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
