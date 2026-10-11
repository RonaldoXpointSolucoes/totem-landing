import { NextResponse } from "next/server";
import { getCustomerSession } from "@/lib/customers/customerSession";
import { getOrdersByCustomer } from "@/lib/orders/orderStore";
import { getServerDatabases } from "@/lib/appwrite/server";
import { APPWRITE_CONFIG } from "@/lib/appwrite/config";
import { Query } from "node-appwrite";

export async function GET() {
  try {
    const customer = await getCustomerSession();
    if (!customer) {
      return NextResponse.json(
        { ok: false, error: "Acesso não autorizado. Faça login primeiro." },
        { status: 401 }
      );
    }

    // 1. Pedidos do armazenamento local
    const localOrders = getOrdersByCustomer(customer.email, customer.whatsapp);

    // 2. Tenta complementar com pedidos do Appwrite se estiver acessível
    let appwriteOrders: any[] = [];
    try {
      const db = getServerDatabases();
      const dbId = APPWRITE_CONFIG.databaseId;
      const cols = APPWRITE_CONFIG.collections;

      const queries = [Query.limit(50), Query.orderDesc("$createdAt")];
      if (customer.email) {
        queries.push(Query.equal("customer_email", customer.email));
      }

      const res = await db.listDocuments(dbId, cols.orders, queries);
      appwriteOrders = res.documents || [];
    } catch {
      // Silencioso se Appwrite estiver offline em dev local
    }

    // Consolidação sem duplicações por orderNumber
    const orderMap = new Map<string, any>();

    // Primeiro os do Appwrite convertidos
    appwriteOrders.forEach((doc) => {
      orderMap.set(doc.order_number, {
        id: doc.$id,
        orderNumber: doc.order_number,
        createdAt: doc.$createdAt,
        status: doc.status,
        customer: {
          name: doc.customer_name,
          email: doc.customer_email,
          whatsapp: doc.customer_whatsapp,
          document: doc.customer_document,
        },
        deliveryAddress: doc.delivery_address_json ? JSON.parse(doc.delivery_address_json) : null,
        subtotalCents: doc.subtotal_cents,
        shippingCents: doc.shipping_cents,
        totalCents: doc.total_cents,
        items: [],
      });
    });

    // Depois sobrescreve com dados ricos locais se disponíveis
    localOrders.forEach((o) => {
      orderMap.set(o.orderNumber, o);
    });

    const consolidated = Array.from(orderMap.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({
      ok: true,
      orders: consolidated,
      customer,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: "Erro ao buscar histórico de compras: " + error.message },
      { status: 500 }
    );
  }
}
