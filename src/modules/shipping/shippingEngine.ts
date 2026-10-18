import { CABINET_MODELS } from "@/modules/catalog/catalogData";
import {
  ShippingCalculationRequest,
  ShippingCalculationResponse,
  ShippingProvenanceSource,
  ShippingQuote,
} from "@/types/shipping";
import { assertAndStampQuote, validateShippingInput } from "./antiFailureGuard";
import { calculateCarrierQuote } from "./carrierService";
import { calculateCorreiosQuotes } from "./correiosService";
import { MAX_CORREIOS_RETRY_ATTEMPTS } from "./correiosOnlineService";
import { CORREIOS_CONTRACT_METADATA } from "./receiptGroundTruth";

const DEFAULT_ORIGIN_CEP = "06754-000";
const DEFAULT_PICKUP_ADDRESS =
  "Av. Industrial, Galpão 04 - X-Point Engenharia, Taboão da Serra - SP";

function formatCentsToBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function resolveCabinetModel(modelIdRaw: string) {
  const idLower = String(modelIdRaw || "").trim().toLowerCase();
  const exact = CABINET_MODELS.find(
    (m) => m.id.toLowerCase() === idLower || m.slug.toLowerCase() === idLower
  );
  if (exact) return exact;

  if (idLower.includes("wall") || idLower.includes("parede")) {
    return CABINET_MODELS.find((m) => m.id === "cabinet-wall");
  }
  if (idLower.includes("countertop") || idLower.includes("balcao") || idLower.includes("balcão")) {
    return CABINET_MODELS.find((m) => m.id === "cabinet-countertop");
  }
  if (idLower.includes("floor") || idLower.includes("piso") || idLower.includes("chao") || idLower.includes("chão")) {
    return CABINET_MODELS.find((m) => m.id === "cabinet-floor");
  }
  return undefined;
}

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
      error: "O carrinho está vazio. Adicione ao menos um gabinete para calcular o frete.",
    };
  }

  let totalGrossWeightKg = 0;
  let totalVolumeM3 = 0;
  let totalItemCount = 0;

  // Acumuladores por modalidade (soma de 1 frete individual para cada unidade/volume)
  let totalSedexPriceCents = 0;
  let totalPacPriceCents = 0;
  let totalCarrierPriceCents = 0;

  let sedexMinDays = 1;
  let sedexMaxDays = 2;
  let pacMinDays = 3;
  let pacMaxDays = 6;
  let carrierMinDays = 3;
  let carrierMaxDays = 6;

  let correiosAllUnitsAvailable = true;
  let correiosUnavailableReason = "";
  let correiosSource: ShippingProvenanceSource = "correios_contract_ground_truth";
  let correiosSourceLabel = `Matriz Contratual Auditada (Contrato ECT ${CORREIOS_CONTRACT_METADATA.contractNumber} — 99.93% Precisão)`;

  let carrierSourceLabel = "Tabela Rodoviária Fracionada Especial";

  for (const item of items) {
    const qty = Math.max(1, Math.floor(Number(item.quantity) || 1));
    const model = resolveCabinetModel(item.modelId);

    if (!model) {
      return {
        ok: false,
        destination: { cep: destinationCep },
        originCep: process.env.SHIPPING_ORIGIN_CEP || DEFAULT_ORIGIN_CEP,
        totalGrossWeightKg: 0,
        totalCubicWeightKg: 0,
        quotes: [],
        error: `Modelo de gabinete inválido para cálculo de frete: ${item.modelId}`,
      };
    }

    totalItemCount += qty;

    const pkg = model.package || {
      heightCm: 90,
      widthCm: 48,
      depthCm: 25,
      grossWeightKg: 16.0,
    };

    const unitGrossWeightKg = pkg.grossWeightKg;
    const unitVolumeM3 = (pkg.heightCm * pkg.widthCm * pkg.depthCm) / 1_000_000;
    const unitCarrierCubicKg = Number((unitVolumeM3 * 300).toFixed(2));
    const unitCorreiosCubicKg = Number((unitVolumeM3 * 166.667).toFixed(2));
    const unitMaxDimensionCm = Math.max(pkg.heightCm, pkg.widthCm, pkg.depthCm);
    const unitSumDimensionsCm = pkg.heightCm + pkg.widthCm + pkg.depthCm;
    const unitHasOversized =
      model.id === "cabinet-floor" || unitMaxDimensionCm > 100 || unitGrossWeightKg > 30;

    // Valor declarado real da unidade (nunca inferior ao preço base de tabela do gabinete)
    const unitDeclaredValueCents = Math.max(
      model.basePriceCents,
      Number(item.declaredValueCents || item.unitPriceCents) || model.basePriceCents
    );

    totalGrossWeightKg += unitGrossWeightKg * qty;
    totalVolumeM3 += unitVolumeM3 * qty;

    // 1. Calcula o frete INDIVIDUAL de 1 unidade nos Correios (1 caixa = 1 etiqueta de envio)
    const unitCorreiosQuotes = await calculateCorreiosQuotes({
      destinationCep: cepClean,
      totalGrossWeightKg: unitGrossWeightKg,
      totalCubicWeightKg: unitCorreiosCubicKg,
      maxDimensionCm: unitMaxDimensionCm,
      sumDimensionsCm: unitSumDimensionsCm,
      itemCount: 1,
      hasOversizedItem: unitHasOversized,
      declaredValueCents: unitDeclaredValueCents,
      packageDimensionsCm: [pkg.heightCm, pkg.widthCm, pkg.depthCm],
    });

    const unitSedex = unitCorreiosQuotes.find((q) => q.id === "correios_sedex");
    const unitPac = unitCorreiosQuotes.find((q) => q.id === "correios_pac");

    if (!unitSedex || !unitSedex.isAvailable || !unitPac || !unitPac.isAvailable) {
      correiosAllUnitsAvailable = false;
      correiosUnavailableReason =
        unitSedex?.unavailableReason ||
        unitPac?.unavailableReason ||
        "Um ou mais itens excedem os limites operacionais dos Correios. Utilize Transportadora ou Retirada.";
    } else {
      // Multiplica pela quantidade: cada unidade paga seu próprio frete integral
      totalSedexPriceCents += unitSedex.priceCents * qty;
      totalPacPriceCents += unitPac.priceCents * qty;
      sedexMinDays = Math.max(sedexMinDays, unitSedex.deliveryDaysMin);
      sedexMaxDays = Math.max(sedexMaxDays, unitSedex.deliveryDaysMax);
      pacMinDays = Math.max(pacMinDays, unitPac.deliveryDaysMin);
      pacMaxDays = Math.max(pacMaxDays, unitPac.deliveryDaysMax);

      if (unitSedex.provenance?.source === "correios_live_cws_api") {
        correiosSource = "correios_live_cws_api";
        correiosSourceLabel = unitSedex.provenance.sourceLabel;
      }
    }

    // 2. Calcula o frete INDIVIDUAL de 1 unidade na Transportadora Rodoviária Especial
    const unitCarrierQuote = calculateCarrierQuote({
      destinationCep: cepClean,
      totalGrossWeightKg: unitGrossWeightKg,
      totalCubicWeightKg: unitCarrierCubicKg,
      declaredValueCents: unitDeclaredValueCents,
      itemCount: 1,
    });

    // Multiplica pela quantidade: cada unidade paga seu próprio frete integral
    totalCarrierPriceCents += unitCarrierQuote.priceCents * qty;
    carrierMinDays = Math.max(carrierMinDays, unitCarrierQuote.deliveryDaysMin);
    carrierMaxDays = Math.max(carrierMaxDays, unitCarrierQuote.deliveryDaysMax);
    if (unitCarrierQuote.provenance?.sourceLabel) {
      carrierSourceLabel = unitCarrierQuote.provenance.sourceLabel;
    }
  }

  // Validação antifalha de integridade da carga total
  const inputCheck = validateShippingInput({
    destinationCep: cepClean,
    totalGrossWeightKg,
    itemCount: totalItemCount,
  });

  if (!inputCheck.isValid) {
    return {
      ok: false,
      destination: { cep: destinationCep },
      originCep: process.env.SHIPPING_ORIGIN_CEP || DEFAULT_ORIGIN_CEP,
      totalGrossWeightKg: 0,
      totalCubicWeightKg: 0,
      quotes: [],
      error: inputCheck.error || "Dados da carga inconsistentes.",
    };
  }

  const totalCubicWeightKg = Number((totalVolumeM3 * 300).toFixed(2));
  const avgSedexUnitCents = Math.round(totalSedexPriceCents / totalItemCount);
  const avgPacUnitCents = Math.round(totalPacPriceCents / totalItemCount);
  const avgCarrierUnitCents = Math.round(totalCarrierPriceCents / totalItemCount);

  // Construção das cotações consolidadas (soma exata dos fretes individuais de cada volume)
  const rawCorreiosQuotes: ShippingQuote[] = correiosAllUnitsAvailable
    ? [
        {
          id: "correios_sedex",
          name: "SEDEX Contrato AG (Correios)",
          carrier: "Correios",
          priceCents: totalSedexPriceCents,
          unitPriceCents: avgSedexUnitCents,
          packageCount: totalItemCount,
          deliveryDaysMin: sedexMinDays,
          deliveryDaysMax: sedexMaxDays,
          description:
            totalItemCount > 1
              ? `Frete calculado para ${totalItemCount} volumes individuais (${formatCentsToBRL(avgSedexUnitCents)} por unidade) • Seguro incluso (Contrato 9912722993)`
              : `Entrega expressa prioritária com seguro de carga incluso (Contrato 9912722993)`,
          isAvailable: true,
          badge: "Mais Rápido",
        },
        {
          id: "correios_pac",
          name: "PAC Contrato AG (Correios)",
          carrier: "Correios",
          priceCents: totalPacPriceCents,
          unitPriceCents: avgPacUnitCents,
          packageCount: totalItemCount,
          deliveryDaysMin: pacMinDays,
          deliveryDaysMax: pacMaxDays,
          description:
            totalItemCount > 1
              ? `Frete calculado para ${totalItemCount} volumes individuais (${formatCentsToBRL(avgPacUnitCents)} por unidade) • Seguro incluso (Contrato 9912722993)`
              : `Entrega econômica oficial com seguro de carga incluso (Contrato 9912722993)`,
          isAvailable: true,
          badge: "Econômico",
        },
      ]
    : [
        {
          id: "correios_sedex",
          name: "SEDEX Contrato AG (Correios)",
          carrier: "Correios",
          priceCents: 0,
          unitPriceCents: 0,
          packageCount: totalItemCount,
          deliveryDaysMin: 0,
          deliveryDaysMax: 0,
          description: "Entrega expressa dos Correios com seguro total",
          isAvailable: false,
          unavailableReason: correiosUnavailableReason,
        },
        {
          id: "correios_pac",
          name: "PAC Contrato AG (Correios)",
          carrier: "Correios",
          priceCents: 0,
          unitPriceCents: 0,
          packageCount: totalItemCount,
          deliveryDaysMin: 0,
          deliveryDaysMax: 0,
          description: "Entrega econômica dos Correios com seguro",
          isAvailable: false,
          unavailableReason: correiosUnavailableReason,
        },
      ];

  const correiosQuotes = rawCorreiosQuotes.map((q) =>
    assertAndStampQuote(q, {
      source: correiosAllUnitsAvailable ? correiosSource : "correios_contract_ground_truth",
      sourceLabel: correiosAllUnitsAvailable
        ? correiosSourceLabel
        : "Limites Operacionais Correios ECT",
      destinationCep: cepClean,
    })
  );

  const rawCarrierQuote: ShippingQuote = {
    id: "transportadora_express",
    name: "Transportadora Rodoviária Especial",
    carrier: "X-Point Cargo Industrial",
    priceCents: totalCarrierPriceCents,
    unitPriceCents: avgCarrierUnitCents,
    packageCount: totalItemCount,
    deliveryDaysMin: carrierMinDays,
    deliveryDaysMax: carrierMaxDays,
    description:
      totalItemCount > 1
        ? `Frete calculado para ${totalItemCount} volumes individuais (${formatCentsToBRL(avgCarrierUnitCents)} por unidade) • Transporte especializado com seguro total`
        : `Transporte especializado para cargas volumétricas, com seguro total e proteção paletizada`,
    isAvailable: true,
    badge: "Carga Segura",
  };

  const carrierQuote = assertAndStampQuote(rawCarrierQuote, {
    source: "carrier_road_freight",
    sourceLabel: carrierSourceLabel,
    destinationCep: cepClean,
  });

  // 3. Retirada na Fábrica (Gratuita)
  const pickupAddress =
    process.env.SHIPPING_PICKUP_ADDRESS || DEFAULT_PICKUP_ADDRESS;
  const rawPickupQuote: ShippingQuote = {
    id: "retirada_fabrica",
    name: "Retirada na Fábrica",
    carrier: "X-Point Engenharia (SP)",
    priceCents: 0,
    unitPriceCents: 0,
    packageCount: totalItemCount,
    deliveryDaysMin: 5,
    deliveryDaysMax: 8,
    description: `Coleta direta sem custo após produção e usinagem CNC no galpão industrial (${pickupAddress})`,
    isAvailable: true,
    badge: "Grátis",
  };

  const pickupQuote = assertAndStampQuote(rawPickupQuote, {
    source: "factory_pickup",
    sourceLabel: "Retirada Presencial na Fábrica",
    destinationCep: cepClean,
  });

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
    packageCount: totalItemCount,
    quotes: allQuotes,
    antiFailureStatus: {
      isActive: true,
      auditedPrecision: CORREIOS_CONTRACT_METADATA.auditedAveragePrecision,
      receiptsVerifiedCount: CORREIOS_CONTRACT_METADATA.auditedReceiptsCount,
      contractNumber: CORREIOS_CONTRACT_METADATA.contractNumber,
      agency: CORREIOS_CONTRACT_METADATA.agency,
      maxRetryAttempts: MAX_CORREIOS_RETRY_ATTEMPTS,
    },
  };
}


