export type ShippingOptionId =
  | "correios_sedex"
  | "correios_pac"
  | "transportadora_express"
  | "retirada_fabrica";

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
  error?: string;
}
