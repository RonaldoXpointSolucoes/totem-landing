import {
  BarcodeReaderOption,
  CabinetModel,
  ColorOption,
  MonitorOption,
  PrinterOption,
} from "./catalog";
import { CartItem } from "./order";
import { SelectiveCoupon } from "@/modules/pricing/couponEngine";

export interface SharedKitSubItemFlag {
  id: string;
  name?: string;
  category?: string;
  selected: boolean;
}

export interface SharedCustomMonitorPayload {
  id?: string;
  brand?: string;
  model?: string;
  displayName?: string;
  sizeInches?: number;
  vesaPattern?: string;
  customDimensions?: MonitorOption["customDimensions"];
}

export interface SharedCartItemInput {
  modelId: string;
  colorId: string;
  monitorId?: string | null;
  cutoutMonitorId?: string | null;
  cutoutMonitorName?: string | null;
  kitItems?: SharedKitSubItemFlag[];
  customMonitor?: SharedCustomMonitorPayload | null;
  printerId?: string | null;
  readerId?: string | null;
  hasScanner?: boolean;
  includeAssemblyService?: boolean;
  customizationNotes?: string;
  quantity: number;
}

export interface SharedAssemblyMeta {
  shareCode: string;
  title?: string;
  loadedAt: string;
  unavailableWarnings?: string[];
}

export interface SharedCatalogInput {
  cabinetModels: CabinetModel[];
  colors: ColorOption[];
  monitors: MonitorOption[];
  printers: PrinterOption[];
  barcodeReaders: BarcodeReaderOption[];
}

export interface HydratedSharedCartResult {
  items: CartItem[];
  itemsCount: number;
  pixSubtotalCents: number;
  eligibleCabinetsSubtotalCents: number;
  ineligibleSubtotalCents: number;
  couponDiscountCents: number;
  pixTotalCents: number;
  cardTotalCents: number;
  unavailableWarnings: string[];
  coupon: SelectiveCoupon | null;
}

export interface SharedCartRecord {
  shareCode: string;
  title: string;
  couponCode: string;
  itemsCount: number;
  pixTotalCents: number;
  cardTotalCents: number;
  viewsCount: number;
  items: SharedCartItemInput[];
  createdAt: string;
}

export interface SharedCartCreateResponse {
  ok: boolean;
  shareCode?: string;
  sharePath?: string;
  shareUrl?: string;
  title?: string;
  itemsCount?: number;
  pixTotalCents?: number;
  cardTotalCents?: number;
  whatsappSummaryText?: string;
  error?: string;
}

export interface HydratedSharedCartPayload {
  shareCode: string;
  title: string;
  createdAt: string;
  viewsCount: number;
  items: CartItem[];
  itemsCount: number;
  coupon: SelectiveCoupon | null;
  couponDiscountCents: number;
  pixSubtotalCents: number;
  pixTotalCents: number;
  cardTotalCents: number;
  unavailableWarnings: string[];
}

export interface SharedCartGetResponse {
  ok: boolean;
  assembly?: HydratedSharedCartPayload;
  error?: string;
}
