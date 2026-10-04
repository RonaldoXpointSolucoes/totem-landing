export type ShippingOptionId =
  | "correios_sedex"
  | "correios_pac"
  | "transportadora_express"
  | "retirada_fabrica";

export type ShippingProvenanceSource =
  | "correios_live_cws_api"
  | "correios_contract_ground_truth"
  | "carrier_road_freight"
  | "factory_pickup";

export interface ShippingProvenance {
  source: ShippingProvenanceSource;
  sourceLabel: string;
  verifiedAgainstReceipts: boolean;
  contractNumber: string;
  postcardNumber: string;
  agency: string;
  auditAccuracy: string;
  sanityCheckPassed: boolean;
  calculatedAt: string;
  antiFailureChecksum: string;
}

export interface ShippingQuote {
  id: ShippingOptionId;
  name: string;
  carrier: string;
  priceCents: number;
  deliveryDaysMin: number;
  deliveryDaysMax: number;
  description: string;
  isAvailable: boolean;
  unavailableReason?: string;
  badge?: string;
  provenance?: ShippingProvenance;
}

export interface ShippingItemInput {
  modelId: string;
  quantity: number;
}

export interface ShippingCalculationRequest {
  destinationCep: string;
  items: ShippingItemInput[];
}

export interface ShippingCalculationResponse {
  ok: boolean;
  destination: {
    cep: string;
    city?: string;
    state?: string;
  };
  originCep: string;
  totalGrossWeightKg: number;
  totalCubicWeightKg: number;
  quotes: ShippingQuote[];
  antiFailureStatus?: {
    isActive: boolean;
    auditedPrecision: string;
    receiptsVerifiedCount: number;
    contractNumber: string;
    agency: string;
  };
  error?: string;
}

