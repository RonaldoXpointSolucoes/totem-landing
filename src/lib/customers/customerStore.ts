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

/**
 * Atualiza dados cadastrais de um cliente existente por ID.
 */
export function updateCustomer(
  id: string,
  updates: Partial<CustomerAccount>
): CustomerAccount | null {
  const customers = getAllCustomers();
  const index = customers.findIndex((c) => c.id === id);
  if (index === -1) return null;

  const current = customers[index];
  const updatedPhone = updates.whatsapp ? normalizePhone(updates.whatsapp) : current.whatsapp;

  customers[index] = {
    ...current,
    ...updates,
    whatsapp: updatedPhone,
    whatsappFormatted: updatedPhone ? formatPhone(updatedPhone) : current.whatsappFormatted,
    email: updates.email ? updates.email.trim().toLowerCase() : current.email,
  };

  persistCustomers(customers);
  return customers[index];
}

/**
 * Exclui um cliente cadastrado pelo ID.
 */
export function deleteCustomer(id: string): boolean {
  const customers = getAllCustomers();
  const filtered = customers.filter((c) => c.id !== id);
  if (filtered.length === customers.length) return false;
  persistCustomers(filtered);
  return true;
}

/**
 * Sincroniza bidirecionalmente a lista de clientes com TODOS os pedidos (Appwrite e locais).
 * Garante que cada pedido pertença a um cliente indexado e que o nome do cliente seja
 * consistente entre pedidos e clientes.
 */
export function syncCustomersFromOrders(orders: any[]): CustomerAccount[] {
  let customers = getAllCustomers();

  for (const o of orders) {
    const rawName = o.customer_name || o.customer?.name || "";
    const rawEmail = (o.customer_email || o.customer?.email || "").trim().toLowerCase();
    const rawPhone = normalizePhone(o.customer_whatsapp || o.customer?.whatsapp || "");
    const rawDoc = (o.customer_document || o.customer?.document || "").trim();
    const orderNum = o.order_number || o.orderNumber || o.$id || "";
    const orderDate = o.$createdAt || o.createdAt || new Date().toISOString();
    const orderTotal = o.total_cents !== undefined ? o.total_cents : (o.totalCents || 0);
    const orderStatus = o.status || "awaiting_payment";

    if (!rawName && !rawEmail && !rawPhone) continue;

    // Tenta encontrar cliente por e-mail, telefone ou documento
    const matchIndex = customers.findIndex((c) => {
      if (rawEmail && c.email && c.email.toLowerCase() === rawEmail) return true;
      if (rawPhone && c.whatsapp && normalizePhone(c.whatsapp) === rawPhone) return true;
      if (rawDoc && c.document && c.document.replace(/\D/g, "") === rawDoc.replace(/\D/g, "")) return true;
      return false;
    });

    if (matchIndex === -1) {
      // Cliente novo descoberto a partir de pedido
      const newCust: CustomerAccount = {
        id: `cust_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: rawName || (rawEmail ? rawEmail.split("@")[0] : "Cliente Pedido " + orderNum),
        email: rawEmail || (rawPhone ? `${rawPhone}@cliente.totempro.com.br` : ""),
        whatsapp: rawPhone,
        whatsappFormatted: rawPhone ? formatPhone(rawPhone) : "",
        document: rawDoc,
        personType: rawDoc.replace(/\D/g, "").length === 14 ? "company" : "individual",
        addresses: o.delivery_address ? [o.delivery_address] : o.deliveryAddress ? [o.deliveryAddress] : [],
        defaultAddress: o.delivery_address || o.deliveryAddress,
        createdAt: orderDate,
        lastLoginAt: orderDate,
        loginMethod: "checkout",
        totalOrdersCount: 1,
        totalSpentCents: orderTotal,
        lastOrderNumber: orderNum,
        lastOrderDate: orderDate,
        lastOrderStatus: orderStatus,
        lastOrderTotalCents: orderTotal,
      };
      customers.unshift(newCust);
    } else {
      // Atualiza o cliente existente para garantir consistência
      const existing = customers[matchIndex];
      const needsNameUpdate = rawName && (!existing.name || existing.name === "Cliente sem nome" || existing.name.startsWith("Cliente Pedido"));
      const isNewerOrder = !existing.lastOrderDate || new Date(orderDate).getTime() >= new Date(existing.lastOrderDate).getTime();

      let shouldUpdate = false;
      const updated: CustomerAccount = { ...existing };

      if (needsNameUpdate) {
        updated.name = rawName;
        shouldUpdate = true;
      }
      if (!updated.document && rawDoc) {
        updated.document = rawDoc;
        shouldUpdate = true;
      }
      if (isNewerOrder) {
        updated.lastOrderNumber = orderNum;
        updated.lastOrderDate = orderDate;
        updated.lastOrderStatus = orderStatus;
        updated.lastOrderTotalCents = orderTotal;
        if (rawName && rawName.trim().length > (updated.name?.length || 0)) {
          updated.name = rawName;
        }
        shouldUpdate = true;
      }

      if (shouldUpdate) {
        customers[matchIndex] = updated;
      }
    }
  }

  // Recalcula contagem e total gasto de cada cliente a partir de todos os pedidos
  const enriched = customers.map((c) => {
    const custOrders = orders.filter((o) => {
      const orderEmail = (o.customer_email || o.customer?.email || "").trim().toLowerCase();
      const orderPhone = normalizePhone(o.customer_whatsapp || o.customer?.whatsapp || "");
      const orderDoc = (o.customer_document || o.customer?.document || "").replace(/\D/g, "");
      const orderName = (o.customer_name || o.customer?.name || "").trim().toLowerCase();

      if (c.email && orderEmail && c.email.toLowerCase() === orderEmail) return true;
      if (c.whatsapp && orderPhone && normalizePhone(c.whatsapp) === orderPhone) return true;
      if (c.document && orderDoc && c.document.replace(/\D/g, "") === orderDoc) return true;
      if (c.name && orderName && c.name.toLowerCase() === orderName) return true;
      return false;
    });

    const totalSpent = custOrders
      .filter((o) => o.status !== "cancelled")
      .reduce((sum, o) => sum + (o.total_cents !== undefined ? o.total_cents : (o.totalCents || 0)), 0);

    // Encontra o pedido mais recente
    const sortedOrders = [...custOrders].sort((a, b) => {
      const dateA = new Date(a.$createdAt || a.createdAt || 0).getTime();
      const dateB = new Date(b.$createdAt || b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    const latest = sortedOrders[0];

    return {
      ...c,
      totalOrdersCount: Math.max(c.totalOrdersCount || 0, custOrders.length),
      totalSpentCents: Math.max(c.totalSpentCents || 0, totalSpent),
      lastOrderNumber: latest ? (latest.order_number || latest.orderNumber || latest.$id) : c.lastOrderNumber,
      lastOrderDate: latest ? (latest.$createdAt || latest.createdAt) : c.lastOrderDate,
      lastOrderStatus: latest ? latest.status : c.lastOrderStatus,
      lastOrderTotalCents: latest ? (latest.total_cents !== undefined ? latest.total_cents : latest.totalCents) : c.lastOrderTotalCents,
    };
  });

  persistCustomers(enriched);
  return enriched;
}
