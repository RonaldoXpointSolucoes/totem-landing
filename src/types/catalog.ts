export interface CabinetModel {
  id: string;
  name: string;
  slug: string;
  description: string;
  basePriceCents: number;
  active: boolean;
  sortOrder: number;
  mainImage: string;
  images?: string[];
  dimensions?: {
    heightMm: number;
    widthMm: number;
    depthMm: number;
    steelGauge?: string;
    vesaPattern?: string;
    weightKg?: number;
    notes?: string;
    images?: string[];
  };
}

export interface ColorOption {
  id: string;
  name: string;
  slug: string;
  hexReference: string;
  priceAdjustmentCents: number;
  active: boolean;
  image?: string;
}

export interface EquipmentOption {
  id: string;
  brand: string;
  model: string;
  displayName: string;
  image?: string;
  technicalCode?: string;
  notes?: string;
  active: boolean;
}

export interface MonitorOption extends EquipmentOption {
  sizeInches?: number;
  vesaPattern?: string;
}

export interface PrinterOption extends EquipmentOption {
  paperWidthMm?: number;
}

export interface BarcodeReaderOption extends EquipmentOption {
  is2D?: boolean;
}
