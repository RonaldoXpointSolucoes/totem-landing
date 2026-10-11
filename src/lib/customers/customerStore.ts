import fs from "fs";
import path from "path";
import { CustomerAccount } from "@/types/customer";
import { CustomerInfo, DeliveryAddress } from "@/types/order";

const DATA_DIR = path.join(process.cwd(), "src", "data");
const CUSTOMERS_FILE = path.join(DATA_DIR, "customer_accounts.json");

import { normalizePhone, formatPhone } from "./phoneUtils";
export { normalizePhone, formatPhone };

/**
 * Carrega a lista completa de clientes cadastrados do arquivo JSON local.
 */
export function getAllCustomers(): CustomerAccount[] {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(CUSTOMERS_FILE)) {
      fs.writeFileSync(CUSTOMERS_FILE, JSON.stringify([], null, 2), "utf-8");
      return [];
    }
    const content = fs.readFileSync(CUSTOMERS_FILE, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    console.error("Erro ao ler banco de clientes:", error);
    return [];
  }
}

/**
 * Salva a lista de clientes no arquivo JSON.
 */
function persistCustomers(customers: CustomerAccount[]): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(CUSTOMERS_FILE, JSON.stringify(customers, null, 2), "utf-8");
  } catch (error) {
    console.error("Erro ao persistir banco de clientes:", error);
  }
}

/**
 * Encontra cliente por número de WhatsApp.
 */
export function findCustomerByWhatsapp(rawPhone: string): CustomerAccount | null {
  const clean = normalizePhone(rawPhone);
  if (!clean) return null;
  const customers = getAllCustomers();
  return customers.find((c) => normalizePhone(c.whatsapp) === clean) || null;
}

/**
 * Encontra cliente por endereço de e-mail.
 */
export function findCustomerByEmail(email: string): CustomerAccount | null {
  const clean = email.trim().toLowerCase();
  if (!clean) return null;
  const customers = getAllCustomers();
  return customers.find((c) => c.email.trim().toLowerCase() === clean) || null;
}

/**
 * Encontra cliente por ID exclusivo.
 */
export function findCustomerById(id: string): CustomerAccount | null {
  const customers = getAllCustomers();
  return customers.find((c) => c.id === id) || null;
}

/**
 * Salva ou atualiza um cliente.
 */
export function saveCustomer(account: CustomerAccount): CustomerAccount {
  const customers = getAllCustomers();
  const index = customers.findIndex((c) => c.id === account.id);

  if (index >= 0) {
    customers[index] = {
      ...customers[index],
      ...account,
      lastLoginAt: new Date().toISOString(),
    };
    persistCustomers(customers);
    return customers[index];
  } else {
    customers.unshift(account);
    persistCustomers(customers);
    return account;
  }
}

/**
 * Registra ou atualiza um cliente a partir de uma finalização de compra (Checkout).
 * Vincula endereço e telefone sem exigir etapa de cadastro prévia do comprador.
 */
export function findOrCreateCustomerFromCheckout(
  customerInfo: CustomerInfo,
  deliveryAddress?: DeliveryAddress,
  orderTotalCents: number = 0
): CustomerAccount {
  const cleanEmail = customerInfo.email.trim().toLowerCase();
  const cleanPhone = normalizePhone(customerInfo.whatsapp);

  let existing = findCustomerByEmail(cleanEmail) || findCustomerByWhatsapp(cleanPhone);

  const now = new Date().toISOString();

  if (existing) {
    // Atualiza dados e adiciona endereço se novo
    const addresses = existing.addresses || [];
    if (deliveryAddress) {
      const addressKey = `${deliveryAddress.cep}_${deliveryAddress.number}`;
      const hasAddress = addresses.some(
        (a) => `${a.cep}_${a.number}` === addressKey
      );
      if (!hasAddress) {
        addresses.push(deliveryAddress);
      }
    }

    const updated: CustomerAccount = {
      ...existing,
      name: customerInfo.name || existing.name,
      document: customerInfo.document || existing.document,
      personType: customerInfo.personType || existing.personType,
      whatsapp: cleanPhone || existing.whatsapp,
      whatsappFormatted: formatPhone(cleanPhone || existing.whatsapp),
      email: cleanEmail || existing.email,
      addresses,
      defaultAddress: deliveryAddress || existing.defaultAddress,
      totalOrdersCount: (existing.totalOrdersCount || 0) + 1,
      totalSpentCents: (existing.totalSpentCents || 0) + orderTotalCents,
      lastLoginAt: now,
    };
    return saveCustomer(updated);
  }

  // Novo cliente
  const newAccount: CustomerAccount = {
    id: `cust_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: customerInfo.name.trim(),
    whatsapp: cleanPhone,
    whatsappFormatted: formatPhone(cleanPhone),
    email: cleanEmail,
    document: customerInfo.document?.trim(),
    personType: customerInfo.personType || "individual",
    addresses: deliveryAddress ? [deliveryAddress] : [],
    defaultAddress: deliveryAddress,
    createdAt: now,
    lastLoginAt: now,
    loginMethod: "checkout",
    totalOrdersCount: 1,
    totalSpentCents: orderTotalCents,
  };

  return saveCustomer(newAccount);
}

/**
 * Cria ou autentica cliente via WhatsApp.
 */
export function loginOrCreateWithWhatsapp(
  rawPhone: string,
  name?: string
): CustomerAccount {
  const cleanPhone = normalizePhone(rawPhone);
  if (!cleanPhone || cleanPhone.length < 10) {
    throw new Error("Número de WhatsApp inválido. Digite DDD + número (ex: 11988887777).");
  }

  const existing = findCustomerByWhatsapp(cleanPhone);
  const now = new Date().toISOString();

  if (existing) {
    existing.lastLoginAt = now;
    if (name && (!existing.name || existing.name === "Cliente WhatsApp")) {
      existing.name = name.trim();
    }
    return saveCustomer(existing);
  }

  // Cria nova conta
  const newAccount: CustomerAccount = {
    id: `cust_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: name?.trim() || "Cliente WhatsApp",
    whatsapp: cleanPhone,
    whatsappFormatted: formatPhone(cleanPhone),
    email: `${cleanPhone}@cliente.totempro.com.br`,
    personType: "individual",
    addresses: [],
    createdAt: now,
    lastLoginAt: now,
    loginMethod: "whatsapp",
    totalOrdersCount: 0,
    totalSpentCents: 0,
  };

  return saveCustomer(newAccount);
}

/**
 * Cria ou autentica cliente via Conta Google.
 */
export function loginOrCreateWithGoogle(
  email: string,
  name: string,
  avatarUrl?: string
): CustomerAccount {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes("@")) {
    throw new Error("E-mail Google inválido.");
  }

  const existing = findCustomerByEmail(cleanEmail);
  const now = new Date().toISOString();

  if (existing) {
    existing.lastLoginAt = now;
    if (avatarUrl) existing.avatarUrl = avatarUrl;
    if (name && (!existing.name || existing.name === cleanEmail.split("@")[0])) {
      existing.name = name.trim();
    }
    return saveCustomer(existing);
  }

  // Cria nova conta
  const newAccount: CustomerAccount = {
    id: `cust_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: name.trim() || cleanEmail.split("@")[0],
    email: cleanEmail,
    whatsapp: "",
    whatsappFormatted: "",
    avatarUrl,
    personType: "individual",
    addresses: [],
    createdAt: now,
    lastLoginAt: now,
    loginMethod: "google",
    totalOrdersCount: 0,
    totalSpentCents: 0,
  };

  return saveCustomer(newAccount);
}
