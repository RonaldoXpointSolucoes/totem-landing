export interface PackageDimensions {
  heightCm: number;
  widthCm: number;
  depthCm: number;
  grossWeightKg: number;
}

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
  weightKg?: number;
  package?: PackageDimensions;
  dimensions?: {
    heightMm: number;
    widthMm: number;
    depthMm: number;
    material?: string;
    steelGauge?: string;
    vesaPattern?: string;
    weightKg?: number;
    notes?: string;
    images?: string[];
    package?: PackageDimensions;
    supportedScreenSizes?: string;
    printerSlot?: string;
    readerSlot?: string;
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
  isCustom?: boolean;
}

export interface PrinterOption extends EquipmentOption {
  paperWidthMm?: number;
}

export interface BarcodeReaderOption extends EquipmentOption {
  is2D?: boolean;
}
