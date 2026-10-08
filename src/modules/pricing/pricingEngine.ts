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
  colorAdjustmentCents: number;
  equipmentAdjustmentCents: number;
  customizationAdjustmentCents: number;
  totalPriceCents: number;
}

/**
 * Motor Único e Autoritativo de Precificação do Totem
 * Regra Comercial Inegociável:
 * - O gabinete possui preço-base configurável.
 * - Cores podem possuir acréscimo (Branco = 0, Preto = +X, Black White = +Y).
 * - Equipamentos homologados avulsos NÃO alteram o preço padrão do gabinete (+ R$ 0,00 de furação).
 * - O Kit de Montagem soma o valor dinâmico dos seus sub-itens de hardware ativos.
 * - Personalizações fora do catálogo homologado entram com acréscimo apenas se previamente aprovadas pelo admin.
 */
export function calculateTotemPrice(input: PriceCalculationInput): PriceBreakdown {
  const basePriceCents = Math.max(0, input.cabinet.basePriceCents || 0);
  const colorAdjustmentCents = Math.max(0, input.color.priceAdjustmentCents || 0);

  // Se for o Kit de Montagem, soma o valor total dos sub-itens de hardware selecionados
  let equipmentAdjustmentCents = 0;
  if (input.kitAdjustmentCents !== undefined) {
    equipmentAdjustmentCents = Math.max(0, input.kitAdjustmentCents);
  } else if (input.monitor && isItemKit(input.monitor)) {
    const effectiveItems = getEffectiveKitItems(input.monitor);
    equipmentAdjustmentCents = calculateKitTotalCents(effectiveItems);
  }

  // Personalizações especiais avaliadas pelo admin
  const customizationAdjustmentCents =
    input.customization && input.customization.approved
      ? Math.max(0, input.customization.priceAdjustmentCents || 0)
      : 0;

  const totalPriceCents =
    basePriceCents +
    colorAdjustmentCents +
    equipmentAdjustmentCents +
    customizationAdjustmentCents;

  return {
    basePriceCents,
    colorAdjustmentCents,
    equipmentAdjustmentCents,
    customizationAdjustmentCents,
    totalPriceCents,
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
