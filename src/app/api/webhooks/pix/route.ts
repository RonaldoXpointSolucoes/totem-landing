import { NextResponse } from "next/server";
import { getServerDatabases } from "@/lib/appwrite/server";
import { APPWRITE_CONFIG } from "@/lib/appwrite/config";
import { Query } from "node-appwrite";

const WEBHOOK_SECRET = process.env.PIX_WEBHOOK_SECRET || "totem_pix_secret_webhook_token_2026";

export async function POST(req: Request) {
  try {
    // 1. Verificação de Segurança (Token / Assinatura do Webhook)
    const tokenHeader =
      req.headers.get("x-webhook-token") ||
      req.headers.get("x-asaas-access-token") ||
      req.headers.get("authorization")?.replace("Bearer ", "");

    if (tokenHeader && tokenHeader !== WEBHOOK_SECRET) {
      console.warn("Webhook rejeitado: Assinatura/Token inválido.");
      return NextResponse.json(
        { ok: false, error: "Assinatura do webhook inválida." },
        { status: 401 }
      );
    }

    const payload = await req.json();

    // 2. Extração agnóstica do número do pedido e identificador
    let orderIdentifier: string | null = null;
    let paymentStatus: string = "paid";

    // Formato Interno / Custom
    if (payload.orderNumber) {
      orderIdentifier = payload.orderNumber;
    } else if (payload.orderId) {
      orderIdentifier = payload.orderId;
    }
    // Formato Asaas
    else if (payload.payment?.externalReference) {
      orderIdentifier = payload.payment.externalReference;
      if (payload.event === "PAYMENT_RECEIVED" || payload.event === "PAYMENT_CONFIRMED") {
        paymentStatus = "paid";
      }
    }
    // Formato Genérico de Gateway
    else if (payload.externalReference) {
      orderIdentifier = payload.externalReference;
    }

    if (!orderIdentifier) {
      return NextResponse.json(
        { ok: false, error: "Identificador do pedido não encontrado no payload do webhook." },
        { status: 400 }
      );
    }

    // 3. Localizar Pedido no Appwrite
    const db = getServerDatabases();
    const dbId = APPWRITE_CONFIG.databaseId;
    const cols = APPWRITE_CONFIG.collections;

    let orderDoc;
    if (orderIdentifier.startsWith("TOT-") || orderIdentifier.startsWith("CUST-")) {
      const searchRes = await db.listDocuments(dbId, cols.orders, [
        Query.equal("order_number", orderIdentifier),
        Query.limit(1),
      ]);
      if (searchRes.total > 0) {
        orderDoc = searchRes.documents[0];
      }
    } else {
      try {
        orderDoc = await db.getDocument(dbId, cols.orders, orderIdentifier);
      } catch {
        orderDoc = null;
      }
    }

    if (!orderDoc) {
      return NextResponse.json(
        { ok: false, error: `Pedido "${orderIdentifier}" não encontrado no banco de dados.` },
        { status: 404 }
      );
    }

    // 4. Verificação de IDEMPOTÊNCIA (Evita duplo processamento)
    if (orderDoc.status === "paid" || orderDoc.status === "in_production") {
      return NextResponse.json({
        ok: true,
        message: "Notificação recebida, pedido já estava compensado anteriormente (idempotência garantida).",
        orderNumber: orderDoc.order_number,
        status: orderDoc.status,
      });
    }

    // 5. Transição Atômica de Status
    const nowIso = new Date().toISOString();

    // Atualiza Coleção 'orders'
    const updatedOrder = await db.updateDocument(dbId, cols.orders, orderDoc.$id, {
      status: paymentStatus,
    });

    // Atualiza Coleção 'payments'
    const paymentsRes = await db.listDocuments(dbId, cols.payments, [
      Query.equal("order_id", orderDoc.$id),
      Query.limit(1),
    ]);

    if (paymentsRes.documents.length > 0) {
      await db.updateDocument(dbId, cols.payments, paymentsRes.documents[0].$id, {
        status: paymentStatus,
        paid_at: nowIso,
      });
    }

    console.log(`[Webhook Pix] Pedido ${orderDoc.order_number} compensado com sucesso!`);

    return NextResponse.json({
      ok: true,
      message: "Pagamento Pix compensado com sucesso e ordem liberada para usinagem CNC.",
      orderNumber: orderDoc.order_number,
      status: paymentStatus,
      paidAt: nowIso,
    });
  } catch (error: any) {
    console.error("Erro no processamento do webhook Pix:", error);
    return NextResponse.json(
      { ok: false, error: "Falha interna no webhook: " + error?.message },
      { status: 500 }
    );
  }
}
