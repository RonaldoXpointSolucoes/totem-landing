import fs from "fs";
import path from "path";
import { CustomerAccount } from "@/types/customer";
import { CustomerInfo, DeliveryAddress } from "@/types/order";

const DATA_DIR = path.join(process.cwd(), "src", "data");
const CUSTOMERS_FILE = path.join(DATA_DIR, "customer_accounts.json");
const DELETED_CUSTOMERS_FILE = path.join(DATA_DIR, "deleted_customers.json");

import { normalizePhone, formatPhone } from "./phoneUtils";
export { normalizePhone, formatPhone };

interface DeletedCustomerTombstone {
  id: string;
  email?: string;
  whatsapp?: string;
  document?: string;
  name?: string;
  deletedAt: string;
}

function getDeletedCustomerTombstones(): DeletedCustomerTombstone[] {
  try {
    if (!fs.existsSync(DELETED_CUSTOMERS_FILE)) return [];
    const raw = fs.readFileSync(DELETED_CUSTOMERS_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveDeletedCustomerTombstones(list: DeletedCustomerTombstone[]): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DELETED_CUSTOMERS_FILE, JSON.stringify(list, null, 2), "utf-8");
  } catch (err) {
    console.error("Erro ao salvar tombstones de clientes excluídos:", err);
  }
}

function removeTombstoneForCustomer(email?: string, whatsapp?: string, document?: string): void {
  const list = getDeletedCustomerTombstones();
  if (list.length === 0) return;
  const cleanEmail = (email || "").trim().toLowerCase();
  const cleanPhone = normalizePhone(whatsapp || "");
  const cleanDoc = (document || "").replace(/\D/g, "");

  const filtered = list.filter((t) => {
    if (cleanEmail && t.email && t.email === cleanEmail) return false;
    if (cleanPhone && t.whatsapp && t.whatsapp === cleanPhone) return false;
    if (cleanDoc && t.document && t.document === cleanDoc) return false;
    return true;
  });

  if (filtered.length !== list.length) {
    saveDeletedCustomerTombstones(filtered);
  }
}

const BANNED_TEST_CUSTOMER_IDS = new Set([
  "cust_1776296991806",
  "cust_1776268356649",
  "cust_1776268362364",
  "cust_1776287718566",
]);
const BANNED_TEST_CUSTOMER_EMAILS = new Set([
  "ana.teste@totempro.com.br",
  "cliente.whatsapp@teste.com",
  "google.cliente@gmail.com",
  "marcos.cliente@totempro.com.br",
]);

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
    const parsed: CustomerAccount[] = JSON.parse(content);
    if (!Array.isArray(parsed)) return [];

    const filtered = parsed.filter(
      (c) =>
        !BANNED_TEST_CUSTOMER_IDS.has(c.id) &&
        !BANNED_TEST_CUSTOMER_EMAILS.has((c.email || "").trim().toLowerCase()) &&
        c.name !== "Ana Compradora"
    );

    if (filtered.length !== parsed.length) {
      fs.writeFileSync(CUSTOMERS_FILE, JSON.stringify(filtered, null, 2), "utf-8");
    }

    return filtered;
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

  // Se o cliente fez uma nova compra no checkout, remove qualquer tombstone antigo
  removeTombstoneForCustomer(cleanEmail, cleanPhone, customerInfo.document);

  const existing = findCustomerByEmail(cleanEmail) || findCustomerByWhatsapp(cleanPhone);

  const now = new Date().toISOString();

  if (existing) {
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

  removeTombstoneForCustomer(undefined, cleanPhone, undefined);

  const existing = findCustomerByWhatsapp(cleanPhone);
  const now = new Date().toISOString();

  if (existing) {
    existing.lastLoginAt = now;
    if (name && (!existing.name || existing.name === "Cliente WhatsApp")) {
      existing.name = name.trim();
    }
    return saveCustomer(existing);
  }

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

  removeTombstoneForCustomer(cleanEmail, undefined, undefined);

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
  const updatedPhone = updates.whatsapp !== undefined ? normalizePhone(updates.whatsapp) : current.whatsapp;

  customers[index] = {
    ...current,
    ...updates,
    whatsapp: updatedPhone,
    whatsappFormatted: updatedPhone ? formatPhone(updatedPhone) : current.whatsappFormatted,
    email: updates.email !== undefined ? updates.email.trim().toLowerCase() : current.email,
  };

  persistCustomers(customers);
  return customers[index];
}

/**
 * Adiciona ou atualiza um endereço na lista de endereços do cliente e opcionalmente define como padrão.
 */
export function addOrUpdateCustomerAddress(
  customerId: string,
  newAddress: DeliveryAddress,
  setAsDefault: boolean = true
): CustomerAccount | null {
  const customer = findCustomerById(customerId);
  if (!customer) return null;

  const cleanCep = (newAddress.cep || "").replace(/\D/g, "");
  const cleanNumber = (newAddress.number || "").trim().toLowerCase();

  const addresses = Array.isArray(customer.addresses) ? [...customer.addresses] : [];
  const existingIdx = addresses.findIndex(
    (a) => (a.cep || "").replace(/\D/g, "") === cleanCep && (a.number || "").trim().toLowerCase() === cleanNumber
  );

  if (existingIdx >= 0) {
    addresses[existingIdx] = { ...addresses[existingIdx], ...newAddress };
  } else {
    addresses.push(newAddress);
  }

  const updates: Partial<CustomerAccount> = {
    addresses,
    defaultAddress: setAsDefault ? newAddress : (customer.defaultAddress || addresses[0]),
  };

  return updateCustomer(customerId, updates);
}

/**
 * Exclui um cliente cadastrado pelo ID e registra tombstone para que a sincronização
 * automática não o recrie a partir de pedidos antigos.
 */
export function deleteCustomer(id: string): boolean {
  const customers = getAllCustomers();
  const target = customers.find((c) => c.id === id);
  if (!target) return false;

  const filtered = customers.filter((c) => c.id !== id);
  persistCustomers(filtered);

  // Registra tombstone para impedir ressurreição automática
  const tombstones = getDeletedCustomerTombstones();
  tombstones.push({
    id: target.id,
    email: (target.email || "").trim().toLowerCase(),
    whatsapp: normalizePhone(target.whatsapp || ""),
    document: (target.document || "").replace(/\D/g, ""),
    name: (target.name || "").trim().toLowerCase(),
    deletedAt: new Date().toISOString(),
  });
  saveDeletedCustomerTombstones(tombstones);

  return true;
}

/**
 * Quando um pedido é excluído no Admin, limpa referências órfãs nos clientes.
 */
export function handleOrderDeletedForCustomers(orderNumber?: string, orderId?: string): void {
  if (!orderNumber && !orderId) return;
  const customers = getAllCustomers();
  let changed = false;

  const updatedCustomers = customers.map((c) => {
    if (
      (orderNumber && c.lastOrderNumber === orderNumber) ||
      (orderId && c.lastOrderNumber === orderId)
    ) {
      changed = true;
      return {
        ...c,
        totalOrdersCount: Math.max(0, (c.totalOrdersCount || 1) - 1),
        lastOrderNumber: undefined,
        lastOrderDate: undefined,
        lastOrderStatus: undefined,
        lastOrderTotalCents: undefined,
      };
    }
    return c;
  });

  if (changed) {
    persistCustomers(updatedCustomers);
  }
}

/**
 * Sincroniza bidirecionalmente a lista de clientes com os pedidos ativos (Appwrite e locais).
 * Respeita a lista de clientes excluídos (tombstones) para nunca recriar clientes deletados.
 */
export function syncCustomersFromOrders(orders: any[]): CustomerAccount[] {
  const customers = getAllCustomers();
  const tombstones = getDeletedCustomerTombstones();

  for (const o of orders) {
    const rawName = o.customer_name || o.customer?.name || "";
    const rawEmail = (o.customer_email || o.customer?.email || "").trim().toLowerCase();
    const rawPhone = normalizePhone(o.customer_whatsapp || o.customer?.whatsapp || "");
    const rawDoc = (o.customer_document || o.customer?.document || "").trim();
    const cleanDocDigits = rawDoc.replace(/\D/g, "");
    const orderNum = o.order_number || o.orderNumber || o.$id || "";
    const orderDate = o.$createdAt || o.createdAt || new Date().toISOString();
    const orderTotal = o.total_cents !== undefined ? o.total_cents : (o.totalCents || 0);
    const orderStatus = o.status || "awaiting_payment";

    if (!rawName && !rawEmail && !rawPhone) continue;

    // Verifica se este cliente foi explicitamente excluído pelo Admin após a criação deste pedido
    const wasDeleted = tombstones.some((t) => {
      const matchIdentity =
        (rawEmail && t.email && t.email === rawEmail) ||
        (rawPhone && t.whatsapp && t.whatsapp === rawPhone) ||
        (cleanDocDigits && t.document && t.document === cleanDocDigits) ||
        (rawName && t.name && t.name === rawName.trim().toLowerCase());

      if (!matchIdentity) return false;
      const orderTime = new Date(orderDate).getTime();
      const deletedTime = new Date(t.deletedAt).getTime();
      return !Number.isNaN(deletedTime) && orderTime <= deletedTime;
    });

    if (wasDeleted) {
      continue;
    }

    // Tenta encontrar cliente por e-mail, telefone ou documento
    const matchIndex = customers.findIndex((c) => {
      if (rawEmail && c.email && c.email.toLowerCase() === rawEmail) return true;
      if (rawPhone && c.whatsapp && normalizePhone(c.whatsapp) === rawPhone) return true;
      if (cleanDocDigits && c.document && c.document.replace(/\D/g, "") === cleanDocDigits) return true;
      return false;
    });

    if (matchIndex === -1) {
      const newCust: CustomerAccount = {
        id: `cust_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: rawName || (rawEmail ? rawEmail.split("@")[0] : "Cliente Pedido " + orderNum),
        email: rawEmail || (rawPhone ? `${rawPhone}@cliente.totempro.com.br` : ""),
        whatsapp: rawPhone,
        whatsappFormatted: rawPhone ? formatPhone(rawPhone) : "",
        document: rawDoc,
        personType: cleanDocDigits.length === 14 ? "company" : "individual",
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

  // Recalcula contagem e total gasto de cada cliente com base nos pedidos realmente existentes
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

    const sortedOrders = [...custOrders].sort((a, b) => {
      const dateA = new Date(a.$createdAt || a.createdAt || 0).getTime();
      const dateB = new Date(b.$createdAt || b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    const latest = sortedOrders[0];

    return {
      ...c,
      totalOrdersCount: custOrders.length,
      totalSpentCents: totalSpent,
      lastOrderNumber: latest ? (latest.order_number || latest.orderNumber || latest.$id) : undefined,
      lastOrderDate: latest ? (latest.$createdAt || latest.createdAt) : undefined,
      lastOrderStatus: latest ? latest.status : undefined,
      lastOrderTotalCents: latest ? (latest.total_cents !== undefined ? latest.total_cents : latest.totalCents) : undefined,
    };
  });

  persistCustomers(enriched);
  return enriched;
}
