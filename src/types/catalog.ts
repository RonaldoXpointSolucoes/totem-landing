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
  videoUrls?: string[];
  instagramVideos?: string[];
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
    videoUrls?: string[];
    instagramVideos?: string[];
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

export interface KitSubItem {
  id: string;
  name: string;
  category: "monitor" | "printer" | "reader" | "accessory" | "pc" | "other";
  description?: string;
  image?: string;
  priceCents: number;
  selected: boolean;
  required?: boolean;
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
  isKit?: boolean;
  kitItems?: KitSubItem[];
  priceAdjustmentCents?: number;
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
