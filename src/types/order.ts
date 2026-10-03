import { CabinetModel, ColorOption, MonitorOption, PrinterOption, BarcodeReaderOption } from "./catalog";

export interface TotemConfiguration {
  model: CabinetModel;
  color: ColorOption;
  monitor?: MonitorOption | null;
  printer?: PrinterOption | null;
  barcodeReader?: BarcodeReaderOption | null;
  customizationNotes?: string;
  calculatedPriceCents: number;
}

export interface CartItem {
  id: string;
  configuration: TotemConfiguration;
  quantity: number;
  unitPriceCents: number;
  subtotalCents: number;
}

export type OrderStatus =
  | "awaiting_payment"
  | "paid"
  | "in_production"
  | "ready"
  | "shipped"
  | "delivered"
  | "cancelled";

export type PaymentStatus = "pending" | "paid" | "expired" | "cancelled" | "failed";

export interface CustomerInfo {
  personType: "individual" | "company";
  name: string;
  document: string; // CPF ou CNPJ formatado
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
  status: "ready_for_cutting" | "machining" | "assembly" | "quality_check";
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
  totalCents: number;
  status: OrderStatus;
  payment: {
    status: PaymentStatus;
    method: "pix";
    pixCode: string;
    qrCodeUrl?: string;
    expiresAt: string;
    paidAt?: string;
  };
  manufacturingSheets: ManufacturingSpec[];
}

