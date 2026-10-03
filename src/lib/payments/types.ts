import { CustomerInfo, PaymentStatus } from "@/types/order";

export interface PixChargeResult {
  paymentId: string;
  txId: string;
  pixCode: string;
  qrCodeBase64: string;
  expiresAt: string;
  provider: string;
}

export interface PaymentProvider {
  name: string;
  createPix(params: {
    orderNumber: string;
    amountCents: number;
    customer: CustomerInfo;
  }): Promise<PixChargeResult>;
  checkPayment(paymentId: string): Promise<{ status: PaymentStatus; paidAt?: string }>;
  refund(paymentId: string): Promise<boolean>;
}
