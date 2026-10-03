import { NextResponse } from "next/server";
import { getServerDatabases } from "@/lib/appwrite/server";
import { APPWRITE_CONFIG } from "@/lib/appwrite/config";
import { Query } from "node-appwrite";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getServerDatabases();
    const dbId = APPWRITE_CONFIG.databaseId;
    const cols = APPWRITE_CONFIG.collections;

    let orderDoc;
    if (id.startsWith("CUST-") || id.startsWith("TOT-")) {
      const searchRes = await db.listDocuments(dbId, cols.orders, [
        Query.equal("order_number", id),
        Query.limit(1),
      ]);
      if (searchRes.total === 0) {
        return NextResponse.json({ ok: false, error: "Solicitação não encontrada." }, { status: 404 });
      }
      orderDoc = searchRes.documents[0];
    } else {
      orderDoc = await db.getDocument(dbId, cols.orders, id);
    }

    const itemsRes = await db.listDocuments(dbId, cols.orderItems, [
      Query.equal("order_id", orderDoc.$id),
      Query.limit(10),
    ]);

    let sheet = null;
    try {
      sheet = orderDoc.manufacturing_sheet_json ? JSON.parse(orderDoc.manufacturing_sheet_json) : null;
    } catch (e) {
      sheet = null;
    }

    return NextResponse.json({
      ok: true,
      data: {
        order: orderDoc,
        items: itemsRes.documents,
        sheet,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: "Erro ao consultar orçamento: " + error?.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH: Avaliação e Precificação Exclusiva pela Engenharia/Admin.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { feasibility, customAdjustmentCents, engineeringNotes } = await req.json();

    const db = getServerDatabases();
    const dbId = APPWRITE_CONFIG.databaseId;
    const cols = APPWRITE_CONFIG.collections;

    const orderDoc = await db.getDocument(dbId, cols.orders, id);

    let sheet: any = {};
    try {
      sheet = orderDoc.manufacturing_sheet_json ? JSON.parse(orderDoc.manufacturing_sheet_json) : {};
    } catch (e) {
      sheet = {};
    }

    const adjustment = Math.max(0, Math.floor(Number(customAdjustmentCents) || 0));
    const newStatus = feasibility === "rejected" ? "custom_rejected" : "custom_approved";

    sheet.engineeringAnalysis = {
      analyzed: true,
      analyzedAt: new Date().toISOString(),
      feasibility: feasibility || "approved",
      customAdjustmentCents: adjustment,
      engineeringParecer: engineeringNotes || "Projeto especial aprovado para corte e usinagem na Router CNC.",
    };
    sheet.status = newStatus;

    const newTotalCents = (orderDoc.subtotal_cents || 0) + adjustment;

    const updated = await db.updateDocument(dbId, cols.orders, id, {
      status: newStatus,
      total_cents: newTotalCents,
      manufacturing_sheet_json: JSON.stringify(sheet),
    });

    return NextResponse.json({
      ok: true,
      message: `Orçamento de customização avaliado com sucesso. Status: "${newStatus}", Ajuste: R$ ${(adjustment / 100).toFixed(2)}`,
      data: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: "Erro ao atualizar orçamento especial: " + error?.message },
      { status: 500 }
    );
  }
}
