import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  getAllCatalogAdmin,
  updateCatalogItemAdmin,
  createCatalogItemAdmin,
  deleteCatalogItemAdmin,
} from "@/lib/appwrite/server";
import { APPWRITE_CONFIG } from "@/lib/appwrite/config";

const COOKIE_NAME = "totem_admin_token";
const SESSION_SECRET = "xpt_totem_admin_session_auth_token_99";

async function verifyAuth(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  return token === SESSION_SECRET;
}

export async function GET() {
  const isAuth = await verifyAuth();
  if (!isAuth) {
    return NextResponse.json({ ok: false, error: "Acesso não autorizado." }, { status: 401 });
  }

  try {
    const catalog = await getAllCatalogAdmin();
    return NextResponse.json({ ok: true, data: catalog });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: "Erro ao buscar catálogo: " + error?.message },
      { status: 500 }
    );
  }
}

const SCHEMA_ATTRIBUTES: Record<string, string[]> = {
  models: [
    "name",
    "slug",
    "description",
    "base_price_cents",
    "active",
    "sort_order",
    "main_image",
    "dimensions_json",
  ],
  colors: [
    "name",
    "slug",
    "hex_reference",
    "price_adjustment_cents",
    "active",
    "image",
    "sort_order",
    "description",
  ],
  monitors: [
    "brand",
    "model",
    "display_name",
    "size",
    "vesa_pattern",
    "technical_code",
    "notes",
    "active",
    "image",
    "slug",
    "sort_order",
  ],
  printers: [
    "brand",
    "model",
    "display_name",
    "paper_width_mm",
    "technical_code",
    "notes",
    "active",
    "image",
    "slug",
    "sort_order",
  ],
  readers: [
    "brand",
    "model",
    "display_name",
    "is_2d",
    "technical_code",
    "notes",
    "active",
    "image",
    "slug",
    "sort_order",
  ],
};

function sanitizeAttributes(collectionType: string, input: Record<string, any>): Record<string, any> {
  const allowed = SCHEMA_ATTRIBUTES[collectionType];
  if (!allowed) return input;

  const sanitized: Record<string, any> = {};

  // Tolerâncias de Imagem
  if (input.main_image && !input.image) {
    input.image = input.main_image;
  }
  if (input.image && !input.main_image) {
    input.main_image = input.image;
  }

  // Tolerâncias de Descrição / Notes
  if (input.description && !input.notes) {
    input.notes = input.description;
  }
  if (input.notes && !input.description) {
    input.description = input.notes;
  }

  // Tolerâncias de Display Name / Name
  if (input.name && !input.display_name) {
    input.display_name = input.name;
  }
  if (input.display_name && !input.name) {
    input.name = input.display_name;
  }

  // Mapeamentos de tolerância para monitores
  if (collectionType === "monitors") {
    if (input.size_inches && !input.size) {
      input.size = String(input.size_inches);
    } else if (input.sizeInches && !input.size) {
      input.size = String(input.sizeInches);
    } else if (input.size !== undefined) {
      input.size = String(input.size);
    }
  }

  // Sanitização de Tipos
  if (input.sort_order !== undefined) {
    input.sort_order = parseInt(String(input.sort_order), 10) || 1;
  }
  if (input.base_price_cents !== undefined) {
    input.base_price_cents = Math.round(Number(input.base_price_cents)) || 0;
  }
  if (input.price_adjustment_cents !== undefined) {
    input.price_adjustment_cents = Math.round(Number(input.price_adjustment_cents)) || 0;
  }
  if (input.paper_width_mm !== undefined) {
    input.paper_width_mm = parseInt(String(input.paper_width_mm), 10) || 80;
  }
  if (input.is_2d !== undefined) {
    input.is_2d = Boolean(input.is_2d);
  }
  if (input.active !== undefined) {
    input.active = Boolean(input.active);
  }
  if (input.slug !== undefined && input.slug !== null) {
    input.slug = String(input.slug)
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9_-]/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  for (const key of allowed) {
    if (input[key] !== undefined) {
      sanitized[key] = input[key];
    }
  }

  return sanitized;
}

export async function PATCH(req: Request) {
  const isAuth = await verifyAuth();
  if (!isAuth) {
    return NextResponse.json({ ok: false, error: "Acesso não autorizado." }, { status: 401 });
  }

  try {
    const { collectionType, documentId, updates } = await req.json();

    if (!collectionType || !documentId || !updates) {
      return NextResponse.json(
        { ok: false, error: "Parâmetros insuficientes: informe collectionType, documentId e updates." },
        { status: 400 }
      );
    }

    const colMap: Record<string, string> = {
      models: APPWRITE_CONFIG.collections.cabinetModels,
      colors: APPWRITE_CONFIG.collections.colors,
      monitors: APPWRITE_CONFIG.collections.monitors,
      printers: APPWRITE_CONFIG.collections.printers,
      readers: APPWRITE_CONFIG.collections.barcodeReaders,
    };

    const targetCollection = colMap[collectionType];
    if (!targetCollection) {
      return NextResponse.json({ ok: false, error: "Coleção inválida." }, { status: 400 });
    }

    const cleanUpdates = sanitizeAttributes(collectionType, updates);
    const updatedDoc = await updateCatalogItemAdmin(targetCollection, documentId, cleanUpdates);

    return NextResponse.json({
      ok: true,
      message: "Item atualizado com sucesso no Appwrite.",
      data: updatedDoc,
    });
  } catch (error: any) {
    console.error("Erro na atualização do catálogo:", error);
    return NextResponse.json(
      { ok: false, error: "Falha na atualização: " + error?.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const isAuth = await verifyAuth();
  if (!isAuth) {
    return NextResponse.json({ ok: false, error: "Acesso não autorizado." }, { status: 401 });
  }

  try {
    const { collectionType, data } = await req.json();

    const colMap: Record<string, string> = {
      models: APPWRITE_CONFIG.collections.cabinetModels,
      colors: APPWRITE_CONFIG.collections.colors,
      monitors: APPWRITE_CONFIG.collections.monitors,
      printers: APPWRITE_CONFIG.collections.printers,
      readers: APPWRITE_CONFIG.collections.barcodeReaders,
    };

    const targetCollection = colMap[collectionType];
    if (!targetCollection || !data) {
      return NextResponse.json({ ok: false, error: "Dados ou coleção inválidos." }, { status: 400 });
    }

    const cleanData = sanitizeAttributes(collectionType, data);
    const newDoc = await createCatalogItemAdmin(targetCollection, cleanData);

    return NextResponse.json({
      ok: true,
      message: "Novo item cadastrado no Appwrite.",
      data: newDoc,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: "Falha ao criar item: " + error?.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  const isAuth = await verifyAuth();
  if (!isAuth) {
    return NextResponse.json({ ok: false, error: "Acesso não autorizado." }, { status: 401 });
  }

  try {
    const { collectionType, documentId } = await req.json();

    const colMap: Record<string, string> = {
      models: APPWRITE_CONFIG.collections.cabinetModels,
      colors: APPWRITE_CONFIG.collections.colors,
      monitors: APPWRITE_CONFIG.collections.monitors,
      printers: APPWRITE_CONFIG.collections.printers,
      readers: APPWRITE_CONFIG.collections.barcodeReaders,
    };

    const targetCollection = colMap[collectionType];
    if (!targetCollection || !documentId) {
      return NextResponse.json({ ok: false, error: "Parâmetros inválidos para exclusão." }, { status: 400 });
    }

    await deleteCatalogItemAdmin(targetCollection, documentId);

    return NextResponse.json({
      ok: true,
      message: "Item excluído com sucesso do catálogo.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: "Falha ao excluir item: " + error?.message },
      { status: 500 }
    );
  }
}
