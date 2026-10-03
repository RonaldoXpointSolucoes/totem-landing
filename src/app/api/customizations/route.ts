import { NextResponse } from "next/server";
import { saveOrderWithSnapshot, getServerDatabases } from "@/lib/appwrite/server";
import { APPWRITE_CONFIG } from "@/lib/appwrite/config";
import {
  CABINET_MODELS,
  COLOR_OPTIONS,
} from "@/modules/catalog/catalogData";
import { ID, Query } from "node-appwrite";

interface CustomizationRequestBody {
  customer: {
    personType?: "individual" | "company";
    name: string;
    document?: string;
    email: string;
    whatsapp: string;
  };
  cabinetModelId: string;
  colorId: string;
  equipmentType: "monitor" | "printer" | "reader" | "other";
  equipmentBrand: string;
  equipmentModel: string;
  notes?: string;
  technicalDrawingUrl?: string;
}

export async function POST(req: Request) {
  try {
    const body: CustomizationRequestBody = await req.json();
    const { customer, cabinetModelId, colorId, equipmentType, equipmentBrand, equipmentModel, notes, technicalDrawingUrl } = body;

    // 1. Validações preliminares
    if (!customer?.name || !customer?.whatsapp || !customer?.email) {
      return NextResponse.json(
        { ok: false, error: "Informe nome, WhatsApp e e-mail para receber o orçamento de engenharia." },
        { status: 400 }
      );
    }

    if (!equipmentBrand || !equipmentModel) {
      return NextResponse.json(
        { ok: false, error: "Informe a marca e o modelo do equipamento para análise dimensional." },
        { status: 400 }
      );
    }

    // 2. Obter Modelo e Cor
    const model = CABINET_MODELS.find((m) => m.id === cabinetModelId) || CABINET_MODELS[0];
    const color = COLOR_OPTIONS.find((c) => c.id === colorId) || COLOR_OPTIONS[0];

    // 3. Regra de Segurança Inegociável: Preço Adicional Inicial é R$ 0,00 (Definido exclusivamente pelo Engenheiro no Admin)
    const basePriceCents = model.basePriceCents + color.priceAdjustmentCents;

    // 4. Código Único de Solicitação de Customização
    const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
    const currentYear = new Date().getFullYear();
    const orderNumber = `CUST-${currentYear}-${randomHex}`;

    // 5. Montar Ficha de Análise de Engenharia CNC
    const customManufacturingSheet = {
      isCustomRequest: true,
      equipmentType,
      equipmentBrand,
      equipmentModel,
      customerNotes: notes || "",
      technicalDrawingUrl: technicalDrawingUrl || "",
      engineeringAnalysis: {
        analyzed: false,
        feasibility: "pending_analysis",
        customAdjustmentCents: 0,
        engineeringParecer: "Aguardando avaliação de viabilidade e furação da Router CNC pelo corpo técnico.",
      },
      cabinetModelName: model.name,
      colorName: color.name,
      status: "awaiting_custom_analysis",
    };

    // 6. Persistência no Appwrite
    const db = getServerDatabases();
    const dbId = APPWRITE_CONFIG.databaseId;
    const cols = APPWRITE_CONFIG.collections;

    const orderDocId = ID.unique();
    const orderDoc = await db.createDocument(dbId, cols.orders, orderDocId, {
      order_number: orderNumber,
      status: "awaiting_custom_analysis",
      customer_name: customer.name,
      customer_document: customer.document || "Aguardando cadastro de faturamento",
      customer_email: customer.email,
      customer_whatsapp: customer.whatsapp,
      delivery_address_json: JSON.stringify({ pending: true }),
      subtotal_cents: basePriceCents,
      shipping_cents: 0,
      total_cents: basePriceCents,
      manufacturing_sheet_json: JSON.stringify(customManufacturingSheet),
    });

    // Grava item com snapshot
    await db.createDocument(dbId, cols.orderItems, ID.unique(), {
      order_id: orderDoc.$id,
      cabinet_name: model.name,
      color_name: color.name,
      monitor_name: equipmentType === "monitor" ? `CUSTOMIZADO: ${equipmentBrand} ${equipmentModel}` : "Padrão",
      printer_name: equipmentType === "printer" ? `CUSTOMIZADO: ${equipmentBrand} ${equipmentModel}` : "Padrão",
      reader_name: equipmentType === "reader" ? `CUSTOMIZADO: ${equipmentBrand} ${equipmentModel}` : "Nenhum",
      unit_price_cents: basePriceCents,
      quantity: 1,
      subtotal_cents: basePriceCents,
    });

    return NextResponse.json({
      ok: true,
      orderId: orderDoc.$id,
      orderNumber,
      status: "awaiting_custom_analysis",
      trackingUrl: `/customizacao/${orderDoc.$id}`,
      message: "Solicitação enviada com sucesso! Um engenheiro avaliará as dimensões para definição do orçamento.",
    });
  } catch (error: any) {
    console.error("Erro ao registrar customização especial:", error);
    return NextResponse.json(
      { ok: false, error: "Falha interna ao submeter orçamento: " + error?.message },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    const db = getServerDatabases();
    const dbId = APPWRITE_CONFIG.databaseId;
    const cols = APPWRITE_CONFIG.collections;

    if (id) {
      const order = await db.getDocument(dbId, cols.orders, id);
      return NextResponse.json({ ok: true, data: order });
    }

    // Lista todas em análise ou aprovadas
    const res = await db.listDocuments(dbId, cols.orders, [
      Query.equal("status", ["awaiting_custom_analysis", "custom_approved", "custom_rejected"]),
      Query.orderDesc("$createdAt"),
      Query.limit(50),
    ]);

    return NextResponse.json({ ok: true, data: res.documents });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: "Erro ao consultar solicitações: " + error?.message },
      { status: 500 }
    );
  }
}
