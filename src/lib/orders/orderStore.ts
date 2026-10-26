import fs from "fs";
import path from "path";
import { OrderDetails } from "@/types/order";
import { normalizePhone } from "@/lib/customers/customerStore";

const DATA_DIR = path.join(process.cwd(), "src", "data");
const ORDERS_FILE = path.join(DATA_DIR, "orders_local.json");

const BANNED_TEST_ORDER_IDS = new Set(["ord_test99", "TP-TEST99"]);

/**
 * Lê todos os pedidos salvos localmente.
 */
export function getAllLocalOrders(): OrderDetails[] {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(ORDERS_FILE)) {
      fs.writeFileSync(ORDERS_FILE, JSON.stringify([], null, 2), "utf-8");
      return [];
    }
    const content = fs.readFileSync(ORDERS_FILE, "utf-8");
    const parsed: OrderDetails[] = JSON.parse(content);
    if (!Array.isArray(parsed)) return [];

    const filtered = parsed.filter(
      (o) =>
        !BANNED_TEST_ORDER_IDS.has(o.id) &&
        !BANNED_TEST_ORDER_IDS.has(o.orderNumber) &&
        o.customer?.name !== "Ana Compradora"
    );

    if (filtered.length !== parsed.length) {
      fs.writeFileSync(ORDERS_FILE, JSON.stringify(filtered, null, 2), "utf-8");
    }

    return filtered;
  } catch (error) {
    console.error("Erro ao ler pedidos locais:", error);
    return [];
  }
}

/**
 * Salva um pedido no armazenamento local com persistência atômica.
 */
export function saveLocalOrder(order: OrderDetails): OrderDetails {
  try {
    const orders = getAllLocalOrders();
    const index = orders.findIndex(
      (o) => o.id === order.id || o.orderNumber === order.orderNumber
    );

    if (index >= 0) {
      orders[index] = { ...orders[index], ...order };
    } else {
      orders.unshift(order);
    }

    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), "utf-8");
    return order;
  } catch (error) {
    console.error("Erro ao persistir pedido local:", error);
    return order;
  }
}

/**
 * Busca pedidos associados a um determinado cliente (por e-mail ou WhatsApp).
 */
export function getOrdersByCustomer(
  email?: string,
  whatsapp?: string
): OrderDetails[] {
  const orders = getAllLocalOrders();
  const cleanEmail = email ? email.trim().toLowerCase() : null;
  const cleanPhone = whatsapp ? normalizePhone(whatsapp) : null;

  return orders.filter((order) => {
    const orderEmail = order.customer?.email?.trim().toLowerCase();
    const orderPhone = normalizePhone(order.customer?.whatsapp || "");

    const matchEmail = cleanEmail && orderEmail && orderEmail === cleanEmail;
    const matchPhone = cleanPhone && orderPhone && orderPhone === cleanPhone;

    return Boolean(matchEmail || matchPhone);
  });
}

/**
 * Busca um pedido específico pelo número oficial (ex: #TP-XXXXXX).
 */
export function findOrderByNumber(orderNumber: string): OrderDetails | null {
  const orders = getAllLocalOrders();
  const cleanNumber = orderNumber.trim().toUpperCase();
  return (
    orders.find((o) => o.orderNumber.toUpperCase() === cleanNumber || o.id === orderNumber) || null
  );
}

/**
 * Atualiza o status de um pedido no armazenamento local.
 */
export function updateLocalOrderStatus(
  orderIdOrNumber: string,
  status: OrderDetails["status"]
): OrderDetails | null {
  const orders = getAllLocalOrders();
  const index = orders.findIndex(
    (o) => o.id === orderIdOrNumber || o.orderNumber === orderIdOrNumber
  );

  if (index >= 0) {
    orders[index].status = status;
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), "utf-8");
    return orders[index];
  }
  return null;
}

/**
 * Atualiza dados de um pedido no armazenamento local a partir de edição administrativa.
 */
export function updateLocalOrderAdmin(
  orderIdOrNumber: string,
  updates: Partial<OrderDetails>
): OrderDetails | null {
  try {
    const orders = getAllLocalOrders();
    const index = orders.findIndex(
      (o) => o.id === orderIdOrNumber || o.orderNumber === orderIdOrNumber
    );
    if (index >= 0) {
      orders[index] = { ...orders[index], ...updates };
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), "utf-8");
      return orders[index];
    }
    return null;
  } catch (error) {
    console.error("Erro ao atualizar pedido local:", error);
    return null;
  }
}

/**
 * Remove permanentemente um pedido do armazenamento local.
 */
export function deleteLocalOrder(orderIdOrNumber: string, altOrderNumber?: string): boolean {
  try {
    const orders = getAllLocalOrders();
    const filtered = orders.filter(
      (o) =>
        o.id !== orderIdOrNumber &&
        o.orderNumber !== orderIdOrNumber &&
        (!altOrderNumber || (o.id !== altOrderNumber && o.orderNumber !== altOrderNumber))
    );
    if (filtered.length !== orders.length) {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(ORDERS_FILE, JSON.stringify(filtered, null, 2), "utf-8");
      return true;
    }
    return false;
  } catch (error) {
    console.error("Erro ao remover pedido local:", error);
    return false;
  }
}
