import { ShippingQuote } from "@/types/shipping";
import { assertAndStampQuote } from "./antiFailureGuard";

export interface CarrierPackageInput {
  destinationCep: string;
  totalGrossWeightKg: number;
  totalCubicWeightKg: number;
  declaredValueCents: number;
  itemCount: number;
}

interface RegionalCarrierRate {
  baseFreightCents: number;
  perEffectiveKgCents: number;
  minDays: number;
  maxDays: number;
  zoneName: string;
}

function getRegionalCarrierRate(cepClean: string): RegionalCarrierRate {
  const prefix2 = parseInt(cepClean.substring(0, 2), 10);
  const prefix1 = parseInt(cepClean.substring(0, 1), 10);

  // 01-09: Grande SP
  if (prefix2 >= 1 && prefix2 <= 9) {
    return {
      baseFreightCents: 8500,
      perEffectiveKgCents: 120,
      minDays: 2,
      maxDays: 4,
      zoneName: "Grande São Paulo",
    };
  }

  // 11-19: SP Interior
  if (prefix2 >= 11 && prefix2 <= 19) {
    return {
      baseFreightCents: 11500,
      perEffectiveKgCents: 150,
      minDays: 3,
      maxDays: 5,
      zoneName: "Interior de São Paulo",
    };
  }

  // 20-39: Sudeste (RJ, MG, ES)
  if (prefix1 === 2 || prefix1 === 3) {
    return {
      baseFreightCents: 14000,
      perEffectiveKgCents: 180,
      minDays: 4,
      maxDays: 7,
      zoneName: "Região Sudeste",
    };
  }

  // 80-99: Sul (PR, SC, RS)
  if (prefix1 === 8 || prefix1 === 9) {
    return {
      baseFreightCents: 16000,
      perEffectiveKgCents: 210,
      minDays: 5,
      maxDays: 8,
      zoneName: "Região Sul",
    };
  }

  // 70-79: Centro-Oeste / 40-65: Nordeste
  if ((prefix1 >= 4 && prefix1 <= 7) && !(prefix2 >= 68 && prefix2 <= 69)) {
    return {
      baseFreightCents: 20000,
      perEffectiveKgCents: 250,
      minDays: 6,
      maxDays: 11,
      zoneName: "Centro-Oeste e Nordeste",
    };
  }

  // Norte
  return {
    baseFreightCents: 29000,
    perEffectiveKgCents: 350,
    minDays: 9,
    maxDays: 16,
    zoneName: "Região Norte",
  };
}

/**
 * Calcula cotação de frete para Transportadora Rodoviária Especial.
 * O frete é baseado no peso efetivo (maior valor entre peso bruto e peso cubado a 300kg/m³),
 * taxa de coleta, despacho rodoviário e taxa de seguro GRIS/Ad Valorem (0,3%).
 */
export function calculateCarrierQuote(input: CarrierPackageInput): ShippingQuote {
  const { destinationCep, totalGrossWeightKg, totalCubicWeightKg, declaredValueCents } = input;
  const cepClean = destinationCep.replace(/\D/g, "");

  const rate = getRegionalCarrierRate(cepClean);

  // Peso tarifado (peso efetivo: maior entre bruto e cubado)
  const effectiveWeightKg = Math.max(totalGrossWeightKg, totalCubicWeightKg);

  // Frete peso base + excedente por kg
  const weightFreightCents = Math.round(effectiveWeightKg * rate.perEffectiveKgCents);

  // Taxa de seguro de carga (0,3% do valor declarado com piso de R$ 15,00)
  const insuranceCents = Math.max(1500, Math.round(declaredValueCents * 0.003));

  const totalFreightCents = rate.baseFreightCents + weightFreightCents + insuranceCents;

  const rawQuote: ShippingQuote = {
    id: "transportadora_express",
    name: "Transportadora Rodoviária Especial",
    carrier: "X-Point Cargo Industrial",
    priceCents: totalFreightCents,
    deliveryDaysMin: rate.minDays,
    deliveryDaysMax: rate.maxDays,
    description: `Transporte especializado para cargas volumétricas, com seguro total e proteção paletizada (${rate.zoneName})`,
    isAvailable: true,
    badge: "Carga Segura",
  };

  return assertAndStampQuote(rawQuote, {
    source: "carrier_road_freight",
    sourceLabel: `Tabela Rodoviária Fracionada Especial (${rate.zoneName})`,
    destinationCep: cepClean,
  });
}

