import { PaymentProvider, PixChargeResult } from "./types";
import { InternalPixProvider } from "./providers/internalPixProvider";
import { AsaasPixProvider } from "./providers/asaasPixProvider";
import { CustomerInfo } from "@/types/order";

let providerInstance: PaymentProvider | null = null;

export function getPaymentProvider(): PaymentProvider {
  if (!providerInstance) {
    const configuredProvider = process.env.PIX_GATEWAY_PROVIDER?.toLowerCase();

    if (configuredProvider === "asaas" && process.env.ASAAS_API_KEY) {
      providerInstance = new AsaasPixProvider();
    } else {
      providerInstance = new InternalPixProvider();
    }
  }
  return providerInstance;
}

export async function createPixCharge(params: {
  orderNumber: string;
  amountCents: number;
  customer: CustomerInfo;
}): Promise<PixChargeResult> {
  const provider = getPaymentProvider();
  return await provider.createPix(params);
}
