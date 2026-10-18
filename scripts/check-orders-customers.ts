import { listAllOrdersAdmin } from "../src/lib/appwrite/server";
import { getAllLocalOrders } from "../src/lib/orders/orderStore";
import { getAllCustomers } from "../src/lib/customers/customerStore";

async function main() {
  console.log("--- APPWRITE ORDERS ---");
  try {
    const appwriteOrders = await listAllOrdersAdmin();
    console.log(`Found ${appwriteOrders.length} Appwrite orders:`);
    for (const o of appwriteOrders) {
      console.log(`- [${o.order_number}] Status: ${o.status}, Customer: ${o.customer_name}, Email: ${o.customer_email}, Phone: ${o.customer_whatsapp}, Total: ${o.total_cents}`);
    }
  } catch (err: any) {
    console.log("Appwrite orders error:", err.message);
  }

  console.log("\n--- LOCAL ORDERS ---");
  const localOrders = getAllLocalOrders();
  console.log(`Found ${localOrders.length} local orders:`);
  for (const o of localOrders) {
    console.log(`- [${o.orderNumber}] Status: ${o.status}, Customer: ${o.customer?.name}, Email: ${o.customer?.email}, Phone: ${o.customer?.whatsapp}, Total: ${o.totalCents}`);
  }

  console.log("\n--- LOCAL CUSTOMERS ---");
  const customers = getAllCustomers();
  console.log(`Found ${customers.length} customers:`);
  for (const c of customers) {
    console.log(`- [${c.id}] Name: ${c.name}, Email: ${c.email}, Phone: ${c.whatsapp}, OrdersCount: ${c.totalOrdersCount}, TotalSpent: ${c.totalSpentCents}`);
  }
}

main().catch(console.error);
