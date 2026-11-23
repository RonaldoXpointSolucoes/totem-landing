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
  pixPriceCents?: number;
  targetNetCents?: number;
  anchorPriceCents?: number;
  maxInstallments?: number;
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
  sortOrder?: number;
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
  /** Quando true, item fica pausado por falta de estoque e não pode ser incluído em novos pedidos */
  paused?: boolean;
  /** Motivo exibido no Admin e no configurador (ex: "Sem estoque no momento") */
  pausedReason?: string;
  /** Aviso de sistema operacional / licenciamento (ex: "Windows 10 Pro Trial") */
  osNotice?: string;
  /** Garantia informada (ex: "3 meses") */
  warrantyInfo?: string;
  /** Especificações técnicas estruturadas em tópicos curtos */
  specs?: string[];
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
  paused?: boolean;
  pausedReason?: string;
  sortOrder?: number;
  isKit?: boolean;
  kitItems?: KitSubItem[];
  priceAdjustmentCents?: number;
}

export interface CustomMonitorDimensions {
  outerWidthCm: number;
  outerHeightCm: number;
  depthCm?: number;
  screenWidthCm: number;
  screenHeightCm: number;
  bezelTopCm: number;
  bezelBottomCm: number;
  bezelLeftCm: number;
  bezelRightCm: number;
  productUrl?: string;
}

export interface MonitorOption extends EquipmentOption {
  sizeInches?: number;
  vesaPattern?: string;
  isCustom?: boolean;
  customDimensions?: CustomMonitorDimensions;
  /**
   * Quando o item selecionado é o Kit de Montagem (`isKit: true`), mas o cliente
   * desabilitou o monitor do Kit, este campo armazena qual monitor o cliente
   * vai utilizar no gabinete para a furação CNC (+ R$ 0,00).
   */
  cutoutMonitor?: MonitorOption | null;
}

export interface PrinterOption extends EquipmentOption {
  paperWidthMm?: number;
}

export interface BarcodeReaderOption extends EquipmentOption {
  is2D?: boolean;
}
