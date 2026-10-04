import { CABINET_MODELS } from "@/modules/catalog/catalogData";
import {
  ShippingCalculationRequest,
  ShippingCalculationResponse,
  ShippingQuote,
} from "@/types/shipping";
import { calculateCorreiosQuotes } from "./correiosService";
import { calculateCarrierQuote } from "./carrierService";

const DEFAULT_ORIGIN_CEP = "01001-000";
const DEFAULT_PICKUP_ADDRESS =
  "Av. Industrial, Galpão 04 - X-Point Engenharia, São Paulo - SP";

export async function calculateShippingQuotes(
  request: ShippingCalculationRequest
): Promise<ShippingCalculationResponse> {
  const { destinationCep, items } = request;
  const cepClean = (destinationCep || "").replace(/\D/g, "");

  if (cepClean.length !== 8) {
    return {
      ok: false,
      destination: { cep: destinationCep },
      originCep: process.env.SHIPPING_ORIGIN_CEP || DEFAULT_ORIGIN_CEP,
      totalGrossWeightKg: 0,
      totalCubicWeightKg: 0,
      quotes: [],
      error: "CEP inválido. O CEP de entrega deve conter 8 dígitos numéricos.",
    };
  }

  if (!items || items.length === 0) {
    return {
      ok: false,
      destination: { cep: destinationCep },
      originCep: process.env.SHIPPING_ORIGIN_CEP || DEFAULT_ORIGIN_CEP,
      totalGrossWeightKg: 0,
      totalCubicWeightKg: 0,
      quotes: [],
      error: "O carrinho está vazio. Adicione ao menos um totem para calcular o frete.",
    };
  }

  let totalGrossWeightKg = 0;
  let totalVolumeM3 = 0;
  let maxDimensionCm = 0;
  let sumDimensionsCm = 0;
  let hasOversizedItem = false;
  let totalDeclaredValueCents = 0;
  let totalItemCount = 0;

  for (const item of items) {
    const qty = Math.max(1, item.quantity || 1);
    totalItemCount += qty;

    const model = CABINET_MODELS.find((m) => m.id === item.modelId);
    if (!model) {
      continue;
    }

    totalDeclaredValueCents += model.basePriceCents * qty;

    const pkg = model.package || {
      heightCm: 100,
      widthCm: 50,
      depthCm: 30,
      grossWeightKg: 20,
    };

    totalGrossWeightKg += pkg.grossWeightKg * qty;

    const itemVolumeM3 =
      ((pkg.heightCm * pkg.widthCm * pkg.depthCm) / 1_000_000) * qty;
    totalVolumeM3 += itemVolumeM3;

    if (pkg.heightCm > maxDimensionCm) maxDimensionCm = pkg.heightCm;
    if (pkg.widthCm > maxDimensionCm) maxDimensionCm = pkg.widthCm;
    if (pkg.depthCm > maxDimensionCm) maxDimensionCm = pkg.depthCm;

    sumDimensionsCm += (pkg.heightCm + pkg.widthCm + pkg.depthCm) * qty;

    // Gabinete de chão (170cm de embalagem) ou qualquer item com dimensão > 100cm
    if (model.id === "cabinet-floor" || pkg.heightCm > 100 || pkg.grossWeightKg > 30) {
      hasOversizedItem = true;
    }
  }

  // Fator rodoviário padrão: 300 kg por m³
  const totalCubicWeightKg = Number((totalVolumeM3 * 300).toFixed(2));

  // 1. Cotação Correios (SEDEX + PAC)
  const correiosQuotes = await calculateCorreiosQuotes({
    destinationCep: cepClean,
    totalGrossWeightKg,
    maxDimensionCm,
    sumDimensionsCm,
    itemCount: totalItemCount,
    hasOversizedItem,
  });

  // 2. Cotação Transportadora Rodoviária Especial
  const carrierQuote = calculateCarrierQuote({
    destinationCep: cepClean,
    totalGrossWeightKg,
    totalCubicWeightKg,
    declaredValueCents: totalDeclaredValueCents,
    itemCount: totalItemCount,
  });

  // 3. Retirada na Fábrica (Gratuita)
  const pickupAddress =
    process.env.SHIPPING_PICKUP_ADDRESS || DEFAULT_PICKUP_ADDRESS;
  const pickupQuote: ShippingQuote = {
    id: "retirada_fabrica",
    name: "Retirada na Fábrica",
    carrier: "X-Point Engenharia (SP)",
    priceCents: 0,
    deliveryDaysMin: 5,
    deliveryDaysMax: 8,
    description: `Coleta direta sem custo após produção e usinagem CNC no galpão industrial (${pickupAddress})`,
    isAvailable: true,
    badge: "Grátis",
  };

  const allQuotes: ShippingQuote[] = [
    ...correiosQuotes,
    carrierQuote,
    pickupQuote,
  ];

  // Ordenação: disponíveis primeiro, depois por preço crescente
  allQuotes.sort((a, b) => {
    if (a.isAvailable && !b.isAvailable) return -1;
    if (!a.isAvailable && b.isAvailable) return 1;
    return a.priceCents - b.priceCents;
  });

  return {
    ok: true,
    destination: {
      cep: destinationCep,
    },
    originCep: process.env.SHIPPING_ORIGIN_CEP || DEFAULT_ORIGIN_CEP,
    totalGrossWeightKg: Number(totalGrossWeightKg.toFixed(2)),
    totalCubicWeightKg,
    quotes: allQuotes,
  };
}
