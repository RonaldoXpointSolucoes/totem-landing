import QRCode from "qrcode";
import { generatePixPayload } from "@/lib/pix";
import { PaymentProvider, PixChargeResult } from "../types";
import { CustomerInfo, PaymentStatus } from "@/types/order";

export class InternalPixProvider implements PaymentProvider {
  name = "internal_emv_engine";

  async createPix(params: {
    orderNumber: string;
    amountCents: number;
    customer: CustomerInfo;
  }): Promise<PixChargeResult> {
    const { orderNumber, amountCents } = params;

    const txId = orderNumber.replace(/[^A-Za-z0-9]/g, "").slice(0, 25);
    const pixCode = generatePixPayload({
      pixKey: process.env.PIX_KEY || "pix@totempro.com.br",
      merchantName: process.env.PIX_MERCHANT_NAME || "TOTEM PRO ENGENHARIA",
      merchantCity: process.env.PIX_MERCHANT_CITY || "SAO PAULO",
      txId,
      amountCents,
    });

    const qrCodeBase64 = await QRCode.toDataURL(pixCode, {
      margin: 1,
      width: 320,
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
    });

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    return {
      paymentId: `pay_int_${Date.now()}_${txId.toLowerCase()}`,
      txId,
      pixCode,
      qrCodeBase64,
      expiresAt,
      provider: this.name,
    };
  }

  async checkPayment(paymentId: string): Promise<{ status: PaymentStatus; paidAt?: string }> {
    return {
      status: "pending",
    };
  }

  async refund(paymentId: string): Promise<boolean> {
    return true;
  }
}
