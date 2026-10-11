import { cookies } from "next/headers";
import { CustomerAccount, CustomerSessionPayload } from "@/types/customer";
import { findCustomerById } from "./customerStore";

export const CUSTOMER_COOKIE_NAME = "totem_customer_session";

export function encodeCustomerSession(payload: CustomerSessionPayload): string {
  const json = JSON.stringify(payload);
  return Buffer.from(json).toString("base64url");
}

export function decodeCustomerSession(token: string): CustomerSessionPayload | null {
  try {
    const json = Buffer.from(token, "base64url").toString("utf-8");
    const parsed = JSON.parse(json);
    if (parsed && parsed.customerId && parsed.expiresAt > Date.now()) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Grava o cookie de sessão do cliente (válido por 30 dias).
 */
export async function setCustomerSession(customer: CustomerAccount): Promise<void> {
  const cookieStore = await cookies();
  const payload: CustomerSessionPayload = {
    customerId: customer.id,
    name: customer.name,
    email: customer.email,
    whatsapp: customer.whatsapp,
    avatarUrl: customer.avatarUrl,
    expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 30, // 30 dias
  };

  const token = encodeCustomerSession(payload);

  cookieStore.set(CUSTOMER_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
}

/**
 * Remove a sessão do cliente.
 */
export async function clearCustomerSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(CUSTOMER_COOKIE_NAME);
}

/**
 * Recupera o cliente atualmente autenticado.
 */
export async function getCustomerSession(): Promise<CustomerAccount | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(CUSTOMER_COOKIE_NAME)?.value;

  if (!token) return null;

  const payload = decodeCustomerSession(token);
  if (!payload) return null;

  return findCustomerById(payload.customerId);
}
