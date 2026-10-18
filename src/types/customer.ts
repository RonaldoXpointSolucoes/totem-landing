import { DeliveryAddress, CustomerInfo, OrderDetails, CartItem, OrderStatus } from "./order";

export interface CustomerAccount {
  id: string;
  name: string;
  whatsapp: string; // Dígitos normalizados (ex: "11988887777")
  whatsappFormatted: string; // Formatado para exibição (ex: "(11) 98888-7777")
  email: string; // E-mail normalizado em minúsculas
  document?: string; // CPF ou CNPJ
  personType: "individual" | "company";
  avatarUrl?: string;
  addresses: DeliveryAddress[];
  defaultAddress?: DeliveryAddress;
  createdAt: string;
  lastLoginAt: string;
  loginMethod: "whatsapp" | "google" | "checkout";
  totalSpentCents?: number;
  totalOrdersCount?: number;
  notes?: string;
  lastOrderNumber?: string;
  lastOrderDate?: string;
  lastOrderStatus?: string;
  lastOrderTotalCents?: number;
}

export interface CustomerSessionPayload {
  customerId: string;
  name: string;
  email: string;
  whatsapp: string;
  avatarUrl?: string;
  expiresAt: number;
}

export interface CustomerOrderSummary {
  id: string;
  orderNumber: string;
  createdAt: string;
  status: OrderStatus;
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  items: CartItem[];
  deliveryAddress: DeliveryAddress;
  shippingMethod?: {
    name: string;
    carrier: string;
    trackingCode?: string;
  };
  payment?: {
    provider: string;
    amountCents: number;
    status: string;
    pixCode?: string;
    expiresAt?: string;
  };
  manufacturingSummary?: {
    models: string[];
    colors: string[];
    hasKits: boolean;
  };
}
