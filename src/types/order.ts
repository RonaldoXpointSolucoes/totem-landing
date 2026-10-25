import { CabinetModel, ColorOption, MonitorOption, PrinterOption, BarcodeReaderOption } from "./catalog";

export interface TotemConfiguration {
  model: CabinetModel;
  color: ColorOption;
  monitor?: MonitorOption | null;
  printer?: PrinterOption | null;
  barcodeReader?: BarcodeReaderOption | null;
  customizationNotes?: string;
  calculatedPriceCents: number;
  includeAssemblyService?: boolean;
  assemblyServicePriceCents?: number;
}

export interface CartItem {
  id: string;
  configuration: TotemConfiguration;
  quantity: number;
  unitPriceCents: number;
  subtotalCents: number;
}

export type OrderStatus =
  | "awaiting_custom_analysis"
  | "custom_approved"
  | "custom_rejected"
  | "awaiting_payment"
  | "paid"
  | "in_production"
  | "ready"
  | "shipped"
  | "delivered"
  | "cancelled";

export type PaymentStatus = "pending" | "paid" | "expired" | "cancelled" | "failed" | "refunded" | "partially_refunded" | "charged_back";

export interface CustomerInfo {
  personType: "individual" | "company";
  name: string;
  document?: string; // CNPJ para empresa ou CPF opcional
  email: string;
  whatsapp: string;
}

export interface DeliveryAddress {
  cep: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  customerNotes?: string;
}

export interface ManufacturingSpec {
  itemIndex: number;
  cabinetModelName: string;
  dimensionsMm: { heightMm: number; widthMm: number; depthMm: number };
  colorName: string;
  finishType: string;
  screenSpecs: {
    monitorName: string;
    screenCutoutMm: string;
    vesaPattern: string;
  };
  printerSpecs: {
    printerName: string;
    slotOpeningMm: string;
    rollSize: string;
  };
  scannerSpecs: {
    hasScanner: boolean;
    scannerName: string;
    windowSpecs: string;
  };
  ventilationSpecs: string;
  securityLock: string;
  customizationNotes?: string;
  isCustomMonitor?: boolean;
  customDimensions?: any;
  assemblyService?: string;
  status: "ready_for_cutting" | "machining" | "assembly" | "quality_check";
}

export interface OrderShippingInfo {
  id: string;
  name: string;
  carrier: string;
  priceCents: number;
  deliveryDaysMin: number;
  deliveryDaysMax: number;
}

export interface OrderDetails {
  id: string;
  orderNumber: string;
  createdAt: string;
  customer: CustomerInfo;
  deliveryAddress: DeliveryAddress;
  items: CartItem[];
  subtotalCents: number;
  shippingCents: number;
  shippingMethod?: OrderShippingInfo | null;
  totalCents: number;
  status: OrderStatus;
  payment: {
    status: PaymentStatus;
    method: "pix" | "credit_card";
    provider?: string;
    gatewayPaymentId?: string;
    gatewayPreferenceId?: string;
    checkoutUrl?: string;
    statusToken?: string;
    pixCode: string;
    qrCodeUrl?: string;
    expiresAt: string;
    paidAt?: string;
  };
  manufacturingSheets: ManufacturingSpec[];
}

