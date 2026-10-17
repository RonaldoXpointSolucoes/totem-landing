import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { Databases } from "node-appwrite";
import { checkoutStatusToken, verifyCheckoutStatusToken, verifyMercadoPagoSignature, createMercadoPagoPayment, paymentMatchesOrder, MercadoPagoPayment } from "../src/lib/payments/mercadoPago";
import { reconcileMercadoPagoPayment } from "../src/lib/payments/mercadoPagoStore";
import { POST as webhook } from "../src/app/api/webhooks/mercadopago/route";
import { POST as legacyWebhook } from "../src/app/api/webhooks/pix/route";
import { GET as statusRoute } from "../src/app/api/checkout/status/route";

async function main() {
  const root = process.cwd();
  const scratch = resolve(root, ".next/payment-validation");
  mkdirSync(scratch, { recursive: true });
  process.chdir(scratch);
  process.env.CHECKOUT_STATUS_SECRET = "test-status-secret";
  process.env.MERCADOPAGO_WEBHOOK_SECRET = "test-webhook-secret";
  process.env.MERCADOPAGO_ACCESS_TOKEN = "APP_USR-mock-only";
  process.env.MERCADOPAGO_COLLECTOR_ID = "100";
  process.env.MERCADOPAGO_MODE = "production";
  assert(verifyCheckoutStatusToken("order-test", checkoutStatusToken("order-test")));
  assert(!verifyCheckoutStatusToken("another-order", checkoutStatusToken("order-test")));
  assert(!verifyCheckoutStatusToken("order-test", "forged"));
  const ts = "1700000000000";
  const digest = createHmac("sha256", "test-webhook-secret").update(`id:123;request-id:req-test;ts:${ts};`).digest("hex");
  const headers = new Headers({ "x-signature": `ts=${ts},v1=${digest}`, "x-request-id": "req-test" });
  assert(verifyMercadoPagoSignature(headers, "123"));
  assert(!verifyMercadoPagoSignature(headers, "124"));
  assert(!verifyMercadoPagoSignature(new Headers(), "123"));
  assert.equal((await webhook(new Request("https://test.example/api/webhooks/mercadopago?data.id=123", { method: "POST", body: JSON.stringify({ type: "payment", data: { id: "123" } }) }))).status, 401);
  assert.equal((await legacyWebhook(new Request("https://test.example/api/webhooks/pix", { method: "POST", body: JSON.stringify({ orderId: "order-test" }) }))).status, 401);
  assert.equal((await statusRoute(new Request("https://test.example/api/checkout/status?orderId=order-test&token=forged"))).status, 403);

  const order: any = { $id: "order-test", order_number: "TOT-TEST-ONLY", total_cents: 142345, status: "awaiting_payment" };
  const stored: any = { $id: "pay-test", order_id: order.$id, provider: "mercadopago", payment_method: "credit_card", status: "pending", amount_cents: order.total_cents };
  let payment: MercadoPagoPayment = {
    id: 123, status: "approved", currency_id: "BRL", transaction_amount: 1423.45, external_reference: order.$id,
    metadata: { order_id: order.$id }, payment_method_id: "visa", payment_type_id: "credit_card", installments: 10,
    collector_id: 100, live_mode: true, date_approved: new Date().toISOString(),
  };
  const writes: any[] = [];
  Databases.prototype.getDocument = (async () => order) as any;
  Databases.prototype.listDocuments = (async (_database: string, collection: string) => ({ total: collection === "payments" ? 1 : 0, documents: collection === "payments" ? [stored] : [] })) as any;
  Databases.prototype.updateDocument = (async (_database: string, collection: string, _id: string, data: object) => {
    writes.push({ target: `/${collection}/`, body: data });
    const doc = collection === "payments" ? stored : order;
    Object.assign(doc, data);
    return doc;
  }) as any;
  let lastRequest: any;
  let searchPayments: MercadoPagoPayment[] = [];
  let otherPayment: MercadoPagoPayment | undefined;
  global.fetch = async (url, init) => {
    const target = String(url);
    const body = init?.body ? JSON.parse(String(init.body)) : null;
    if (target.startsWith("https://api.mercadopago.com")) {
      if (target.includes("/v1/payments/search")) return Response.json({ results: searchPayments });
      if (body) {
        lastRequest = { target, body, headers: init?.headers };
        if (target.endsWith("/checkout/preferences")) return Response.json({ id: "preference-test", init_point: "https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=mock" });
        return Response.json({ id: 124, date_of_expiration: new Date(Date.now() + 1800000).toISOString(), point_of_interaction: { transaction_data: { qr_code: "000201-test", qr_code_base64: "cXJjb2Rl" } } });
      }
      return Response.json(otherPayment && target.endsWith(String(otherPayment.id)) ? otherPayment : payment);
    }
    if (!target.includes("/databases/")) throw new Error("Unexpected network request blocked in test.");
    if (init?.method === "PATCH") {
      writes.push({ target, body });
      const doc = target.includes("/payments/") ? stored : order;
      Object.assign(doc, body);
      return Response.json(doc);
    }
    if (target.includes("/payments/")) return Response.json({ total: 1, documents: [stored] });
    if (target.includes("/order_items/")) return Response.json({ total: 0, documents: [] });
    return Response.json(order);
  };

  assert(paymentMatchesOrder(payment, { id: order.$id, totalCents: 142345, method: "credit_card" }));
  assert(paymentMatchesOrder({ ...payment, payment_type_id: "account_money", installments: 1 }, { id: order.$id, totalCents: 142345, method: "credit_card" }));
  for (const changed of [{ transaction_amount: 1 }, { currency_id: "USD" }, { collector_id: 999 }, { live_mode: false }, { installments: 11 }, { metadata: { order_id: "another" } }]) {
    assert(!paymentMatchesOrder({ ...payment, ...changed }, { id: order.$id, totalCents: 142345, method: "credit_card" }));
  }
  const input = { orderId: order.$id, orderNumber: order.order_number, amountCents: order.total_cents, customer: { personType: "individual" as const, name: "Teste Integração", document: "00000000000", email: "test@example.com", whatsapp: "00000000000" } };
  await createMercadoPagoPayment({ ...input, method: "credit_card" });
  assert.equal(lastRequest.body.items[0].unit_price, 1423.45);
  assert.equal(lastRequest.body.payment_methods.installments, 10);
  assert(lastRequest.body.payment_methods.excluded_payment_types.some((x: any) => x.id === "bank_transfer"));
  assert.equal(lastRequest.body.external_reference, order.$id);
  const pix = await createMercadoPagoPayment({ ...input, amountCents: 123456, method: "pix" });
  assert.equal(lastRequest.body.transaction_amount, 1234.56);
  assert.equal(lastRequest.headers["X-Idempotency-Key"], "totem-pix-order-test");
  assert(pix.qrCodeUrl?.startsWith("data:image/png;base64,"));

  await reconcileMercadoPagoPayment("123");
  assert.equal(order.status, "paid"); assert.equal(stored.status, "paid");
  const orderTransitions = writes.filter((w) => w.target.includes("/orders/")).length;
  await reconcileMercadoPagoPayment("123");
  assert.equal(writes.filter((w) => w.target.includes("/orders/")).length, orderTransitions);
  payment = { ...payment, status: "pending" };
  await reconcileMercadoPagoPayment("123");
  assert.equal(order.status, "paid"); assert.equal(stored.status, "paid");
  payment = { ...payment, status: "approved", transaction_amount: 1 };
  await assert.rejects(() => reconcileMercadoPagoPayment("123"));
  assert.equal(order.status, "paid");
  payment = { ...payment, status: "refunded", transaction_amount: 1423.45 };
  await reconcileMercadoPagoPayment("123");
  assert.equal(order.status, "cancelled"); assert.equal(stored.status, "refunded");
  order.status = "awaiting_payment"; stored.status = "pending"; stored.gateway_preference_id = "pref-split";
  payment = { ...payment, transaction_amount: 500, status: "approved", order: { id: "merchant-test" } };
  searchPayments = [payment];
  await reconcileMercadoPagoPayment("123");
  assert.equal(order.status, "awaiting_payment"); assert.equal(stored.status, "pending");
  otherPayment = { ...payment, id: 456, transaction_amount: 923.45 };
  searchPayments = [payment, otherPayment];
  await reconcileMercadoPagoPayment("123");
  assert.equal(order.status, "paid"); assert.equal(stored.status, "paid");
  otherPayment = { ...otherPayment, metadata: { order_id: "another-order" } };
  await assert.rejects(() => reconcileMercadoPagoPayment("123"));
  process.chdir(root);
  console.log("PASS: assinatura, acesso ao status, valores em centavos, limite de 10x, Pix idempotente, conciliação, eventos duplicados, rejeição de adulteração e estorno.");
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
